/// <reference types="vite/client" />

declare const __GIT_COMMIT_SHA__: string;

interface ImportMetaEnv {
  readonly VITE_GIT_COMMIT_SHA?: string;
  readonly GOODREADS_USER_ID?: string;
  readonly GOODREADS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
