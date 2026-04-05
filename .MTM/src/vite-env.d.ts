/// <reference types="vite/client" />

declare const __APP_BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** 仅 Gemini API（/api/gemini、/api/gemini-text）使用；国内前端指向海外 Vercel */
  readonly VITE_GEMINI_API_BASE_URL?: string;
  readonly VITE_CLOUDBASE_ENV_ID?: string;
  readonly VITE_CLOUDBASE_ACCESS_KEY?: string;
}
