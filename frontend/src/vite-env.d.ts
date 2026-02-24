/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_VIEWER_MODE?: string;
  readonly VITE_VIEWER_OWNER?: string;
  readonly VITE_VIEWER_REPO?: string;
  readonly VITE_VIEWER_BRANCH?: string;
  readonly VITE_VIEWER_WORKSPACE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
