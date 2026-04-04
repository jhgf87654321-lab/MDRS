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

/**
 * Web Auth v2/v3 的 getCurrentUser 字段不一致：常见为 uid，部分版本为 sub 或嵌套 user_metadata.uid。
 */
export function pickWebAuthUserIdEmail(user: unknown): { uid: string; email?: string } | null {
  if (user == null || typeof user !== 'object') return null;
  const u = user as Record<string, unknown>;
  const meta = u.user_metadata;
  const metaUid =
    meta && typeof meta === 'object' && typeof (meta as Record<string, unknown>).uid === 'string'
      ? String((meta as Record<string, unknown>).uid).trim()
      : '';
  const uidRaw =
    (typeof u.uid === 'string' && u.uid.trim()) ||
    (typeof u.sub === 'string' && u.sub.trim()) ||
    metaUid ||
    '';
  if (!uidRaw) return null;
  const nested = u.user && typeof u.user === 'object' ? (u.user as Record<string, unknown>) : null;
  const email =
    (typeof u.email === 'string' && u.email.trim()) ||
    (nested && typeof nested.email === 'string' ? nested.email.trim() : '') ||
    (typeof u.username === 'string' && u.username.includes('@') ? u.username.trim() : '') ||
    undefined;
  return { uid: uidRaw, email: email || undefined };
}

export function getCloudbaseDb() {
  const app = getCloudbaseApp();
  return (app as any).database();
}

