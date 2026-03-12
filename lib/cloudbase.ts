import cloudbase from '@cloudbase/js-sdk';

// 优先从环境变量读取 EnvId & Publishable Key，未配置时回退到本地默认值（便于开发）
// 本地开发：在 .env.local 中配置
//  VITE_CLOUDBASE_ENV_ID=denglu-8gher1d52a21e6fe
//  VITE_CLOUDBASE_ACCESS_KEY=你的PublishableKey
export const CLOUDBASE_ENV_ID =
  (import.meta.env.VITE_CLOUDBASE_ENV_ID as string | undefined) || 'denglu-8gher1d52a21e6fe';

const ACCESS_KEY = import.meta.env.VITE_CLOUDBASE_ACCESS_KEY as string | undefined;

let cachedApp: ReturnType<typeof cloudbase.init> | null = null;

export function getCloudbaseApp() {
  if (cachedApp) return cachedApp;
  cachedApp = cloudbase.init(
    {
      env: CLOUDBASE_ENV_ID,
      region: 'ap-shanghai',
      accessKey: ACCESS_KEY,
      auth: { detectSessionInUrl: true },
    } as any,
  );
  return cachedApp;
}

export function getCloudbaseAuth() {
  const app = getCloudbaseApp();
  // persistence: local keeps user across refresh
  return app.auth({ persistence: 'local' as any });
}

export function getCloudbaseDb() {
  const app = getCloudbaseApp();
  return (app as any).database();
}

