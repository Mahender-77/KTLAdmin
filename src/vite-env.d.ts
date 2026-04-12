/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Allows importing .jsx modules from TypeScript without per-file declarations.
declare module "*.jsx" {
  const Component: any;
  export default Component;
}
