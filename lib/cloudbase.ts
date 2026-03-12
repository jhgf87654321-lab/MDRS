import cloudbase from '@cloudbase/js-sdk';

export const CLOUDBASE_ENV_ID = 'denglu-8gher1d52a21e6fe';

let cachedApp: ReturnType<typeof cloudbase.init> | null = null;

export function getCloudbaseApp() {
  if (cachedApp) return cachedApp;
  cachedApp = cloudbase.init({ env: CLOUDBASE_ENV_ID });
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

