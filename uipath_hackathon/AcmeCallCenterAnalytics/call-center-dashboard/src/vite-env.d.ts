/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UIPATH_CLIENT_ID: string;
  readonly VITE_UIPATH_SCOPE: string;
  readonly VITE_UIPATH_ORG_NAME: string;
  readonly VITE_UIPATH_TENANT_NAME: string;
  readonly VITE_UIPATH_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
