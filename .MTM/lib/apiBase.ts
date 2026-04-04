/** 默认同源 /api。仅当前端与 API 不同源时设置 VITE_API_BASE_URL（完整 URL，无尾斜杠）。不要填成与当前站点相同的域名。 */

function trimBase(raw: string): string {
  return raw.trim().replace(/\/$/, '');
}

/**
 * 若 VITE_API_BASE_URL 与当前页面同源（常见于误把 modcard.asia 填进环境变量），则视为未设置，走相对路径 /api/*。
 */
function resolveApiBasePrefix(): { crossOrigin: boolean; prefix: string } {
  const raw = trimBase((import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? '');
  if (!raw) return { crossOrigin: false, prefix: '' };

  if (typeof window !== 'undefined') {
    try {
      const baseUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      if (new URL(baseUrl).origin === window.location.origin) {
        return { crossOrigin: false, prefix: '' };
      }
    } catch {
      /* 非法 URL 时仍按跨域拼接 */
    }
  }

  return { crossOrigin: true, prefix: raw };
}

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const { crossOrigin, prefix } = resolveApiBasePrefix();
  return crossOrigin && prefix ? `${prefix}${p}` : p;
}

/** Vercel 上未部署 api/ 时常见 HTML 404；在解析 JSON 前调用，给出可操作的提示 */
export function throwIfApiRouteMissing(res: Response, bodyText: string, endpoint: string): void {
  if (res.ok) return;
  const t = bodyText;
  const vercelNotFound =
    res.status === 404 ||
    (t.includes('NOT_FOUND') && /could not be found/i.test(t));
  if (!vercelNotFound) return;

  const envRaw = trimBase((import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? '');
  const { crossOrigin, prefix } = resolveApiBasePrefix();

  if (envRaw && !crossOrigin) {
    throw new Error(
      `API 404：当前页 ${endpoint} 不存在。您曾设置 VITE_API_BASE_URL 为与本站相同域名，已自动按同源处理；请删除 Vercel 里该变量后重新部署，并确认本次构建包含 .MTM/api/ 且已触发最新 Production Deploy。`,
    );
  }

  const hint = crossOrigin && prefix
    ? `API 404：${prefix}${endpoint} 不存在。请确认 VITE_API_BASE_URL 指向的部署含 Serverless api/，或改为正确 API 域名后重新构建。`
    : `API 404（NOT_FOUND）：当前站点没有 ${endpoint}。请确认 Vercel Root Directory 为应用根（含 api/）、已拉取含 .MTM/api 的提交并 Redeploy；本地在 .MTM 运行 npm run dev:api。`;

  throw new Error(hint);
}
