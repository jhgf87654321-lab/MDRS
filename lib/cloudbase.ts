import cloudbase from '@cloudbase/js-sdk';

export const CLOUDBASE_ENV_ID = 'denglu-8gher1d52a21e6fe';

// 从环境变量中读取 Publishable Key（开发和线上统一方式）
// 本地开发请在 .env.local 中配置：VITE_CLOUDBASE_ACCESS_KEY=你的PublishableKey
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

