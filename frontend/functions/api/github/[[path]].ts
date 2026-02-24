/**
 * Cloudflare Pages Function: GitHub API Proxy for Viewer Mode
 *
 * Proxies read-only GitHub API requests using a GitHub App installation token.
 * The token is generated server-side and never exposed to the browser.
 *
 * Security:
 * - Only GET requests are allowed
 * - Requests are restricted to the configured repository
 * - GitHub App installation token is scoped to contents:read + metadata:read
 */

interface Env {
  GITHUB_APP_ID: string;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_INSTALLATION_ID: string;
  VIEWER_OWNER: string;
  VIEWER_REPO: string;
}

// In-memory token cache (per isolate, resets on cold start)
let cachedToken: { token: string; expiresAt: number } | null = null;

// ============================================================================
// Request Handler
// ============================================================================

export const onRequest: PagesFunction<Env> = async (context) => {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  // Only allow GET requests — this is a read-only proxy
  if (context.request.method !== 'GET') {
    return new Response('Method not allowed. This proxy only supports GET requests.', {
      status: 405,
      headers: corsHeaders(),
    });
  }

  // Extract the GitHub API path from the catch-all route segments
  const pathSegments = context.params.path as string[];
  const githubPath = '/' + pathSegments.join('/');

  // Security: restrict to configured repository only
  const allowedPrefix = `/repos/${context.env.VIEWER_OWNER}/${context.env.VIEWER_REPO}`;
  if (!githubPath.startsWith(allowedPrefix)) {
    return new Response('Forbidden: access restricted to the configured repository.', {
      status: 403,
      headers: corsHeaders(),
    });
  }

  try {
    // Get or refresh the GitHub App installation token
    const token = await getInstallationToken(context.env);

    // Preserve query string from the original request
    const url = new URL(context.request.url);
    const githubUrl = `https://api.github.com${githubPath}${url.search}`;

    // Proxy the request to GitHub
    const response = await fetch(githubUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'data-modelling-viewer',
      },
    });

    // Build response, stripping sensitive headers
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', response.headers.get('Content-Type') || 'application/json');
    responseHeaders.set('Cache-Control', 'no-cache');

    // Forward rate limit headers (useful for debugging)
    for (const header of ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']) {
      const value = response.headers.get(header);
      if (value) responseHeaders.set(header, value);
    }

    // Add CORS headers
    for (const [key, value] of Object.entries(corsHeaders())) {
      responseHeaders.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[GitHub Proxy] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Proxy error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(),
        },
      }
    );
  }
};

// ============================================================================
// GitHub App Installation Token
// ============================================================================

async function getInstallationToken(env: Env): Promise<string> {
  // Check cache with 5 minute safety margin before expiry
  if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) {
    return cachedToken.token;
  }

  // Generate JWT signed with the App's private key
  const jwt = await generateJWT(env.GITHUB_APP_ID, env.GITHUB_APP_PRIVATE_KEY);

  // Exchange JWT for an installation access token
  const response = await fetch(
    `https://api.github.com/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'data-modelling-viewer',
      },
      body: JSON.stringify({
        // Scope token to the minimum required permissions on a single repo
        repositories: [env.VIEWER_REPO],
        permissions: { contents: 'read', metadata: 'read' },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get installation token: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { token: string; expires_at: string };
  cachedToken = {
    token: data.token,
    expiresAt: new Date(data.expires_at).getTime(),
  };

  return data.token;
}

// ============================================================================
// JWT Generation (RS256)
// ============================================================================

async function generateJWT(appId: string, privateKeyPEM: string): Promise<string> {
  // Parse PEM to raw key bytes
  const pemContent = privateKeyPEM
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
    .replace(/-----END RSA PRIVATE KEY-----/g, '')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  // Determine key format: PKCS#8 ("BEGIN PRIVATE KEY") or PKCS#1 ("BEGIN RSA PRIVATE KEY")
  const keyFormat = privateKeyPEM.includes('BEGIN RSA PRIVATE KEY') ? 'pkcs1' : 'pkcs8';

  let cryptoKey: CryptoKey;
  if (keyFormat === 'pkcs8') {
    cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
  } else {
    // PKCS#1 keys need to be wrapped in PKCS#8 format for Web Crypto API
    // GitHub App keys are typically PKCS#1 (RSA PRIVATE KEY)
    const pkcs8Key = wrapPKCS1inPKCS8(binaryKey);
    cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      pkcs8Key,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iat: now - 60, // 60 seconds in the past for clock drift
    exp: now + 10 * 60, // 10 minutes (GitHub maximum)
    iss: appId,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64url(signature)}`;
}

/**
 * Wrap a PKCS#1 RSA private key in PKCS#8 format.
 * GitHub App private keys use PKCS#1 (BEGIN RSA PRIVATE KEY) but
 * Web Crypto API requires PKCS#8 (BEGIN PRIVATE KEY).
 */
function wrapPKCS1inPKCS8(pkcs1Key: Uint8Array): Uint8Array {
  // PKCS#8 wraps PKCS#1 with an AlgorithmIdentifier header
  // OID for rsaEncryption: 1.2.840.113549.1.1.1
  const rsaOID = new Uint8Array([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
  ]);

  // Wrap the PKCS#1 key in an OCTET STRING
  const keyOctetString = encodeASN1Length(0x04, pkcs1Key);

  // Build the PKCS#8 SEQUENCE: version(0) + algorithmId + key
  const version = new Uint8Array([0x02, 0x01, 0x00]); // INTEGER 0
  const sequenceContent = concatUint8Arrays(version, rsaOID, keyOctetString);
  return encodeASN1Length(0x30, sequenceContent);
}

function encodeASN1Length(tag: number, content: Uint8Array): Uint8Array {
  const length = content.length;
  let header: Uint8Array;

  if (length < 128) {
    header = new Uint8Array([tag, length]);
  } else if (length < 256) {
    header = new Uint8Array([tag, 0x81, length]);
  } else if (length < 65536) {
    header = new Uint8Array([tag, 0x82, (length >> 8) & 0xff, length & 0xff]);
  } else {
    header = new Uint8Array([
      tag,
      0x83,
      (length >> 16) & 0xff,
      (length >> 8) & 0xff,
      length & 0xff,
    ]);
  }

  return concatUint8Arrays(header, content);
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ============================================================================
// Helpers
// ============================================================================

function base64url(input: string | ArrayBuffer): string {
  let base64: string;
  if (typeof input === 'string') {
    base64 = btoa(input);
  } else {
    base64 = btoa(String.fromCharCode(...new Uint8Array(input)));
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, X-GitHub-Api-Version',
  };
}
