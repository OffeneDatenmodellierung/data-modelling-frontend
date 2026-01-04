# API redirect_uri Implementation

## Status: ✅ FIXED

The API now properly handles the `redirect_uri` query parameter. This document explains how it works.

## How It Works

### Frontend Behavior
The frontend passes only the **origin** (protocol + host + port) as `redirect_uri`:
```typescript
const frontendOrigin = window.location.origin; // e.g., "http://localhost:5173"
const authEndpoint = `/api/v1/auth/github/login?redirect_uri=${encodeURIComponent(frontendOrigin)}`;
```

### API Behavior
1. **Validation**: The API validates the `redirect_uri` parameter:
   - Must be `http://` or `https://`
   - Allows `localhost` for development
   - Checks against `REDIRECT_URI_WHITELIST` if configured
   - Prevents open redirect vulnerabilities

2. **Storage**: The `redirect_uri` is stored in the OAuth state entry alongside the CSRF token

3. **Usage**: After GitHub callback, the API:
   - Retrieves `redirect_uri` from the stored OAuth state
   - Uses it as the **base URL**
   - Appends `/auth/complete?code=...&select_email=...` to it
   - Redirects to the full URL: `{redirect_uri}/auth/complete?code=...`

### Example Flow
1. Frontend (on `http://localhost:5173`) calls:
   ```
   GET /api/v1/auth/github/login?redirect_uri=http://localhost:5173
   ```

2. API stores `redirect_uri=http://localhost:5173` in OAuth state

3. After GitHub callback, API redirects to:
   ```
   http://localhost:5173/auth/complete?code=...&select_email=true
   ```

4. Frontend React app handles `/auth/complete` route and exchanges code for tokens

## Important Notes

- **`redirect_uri` should be the origin only** (e.g., `http://localhost:5173`), not the full path
- The API automatically appends `/auth/complete` to the `redirect_uri`
- This allows multiple frontend instances (on different ports) to use the same API
- The frontend route `/auth/complete` must exist in the React app (it does: `App.tsx`)

## Troubleshooting

If the redirect goes to the wrong URL:
1. Verify the frontend passes only the origin: `window.location.origin`
2. Check API logs to see what `redirect_uri` was stored
3. Verify the API redirects to `{redirect_uri}/auth/complete`
4. Ensure the frontend route `/auth/complete` exists and handles the callback

