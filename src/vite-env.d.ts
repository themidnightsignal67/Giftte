/* Vite client types (optional; skipLibCheck covers missing defs on CI). */
interface ImportMetaEnv {
  readonly VITE_APP_TITLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
