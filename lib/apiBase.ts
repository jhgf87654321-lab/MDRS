/** 默认同源 /api。仅当前端与 API 不同源时设置 VITE_API_BASE_URL（完整 URL，无尾斜杠）。不要填成与当前站点相同的域名。 */

function trimBase(raw: string): string {
  return raw.trim().replace(/\/$/, '');
}

function hostKey(hostname: string): string {
  return hostname.replace(/^www\./i, '');
}

/**
 * 若 VITE_API_BASE_URL 与当前页同源，或仅为 www / 非 www 差异（同站），则视为未设置，走相对路径 /api/*。
 */
function resolveApiBasePrefix(): { crossOrigin: boolean; prefix: string } {
  const raw = trimBase((import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? '');
  if (!raw) return { crossOrigin: false, prefix: '' };

  if (typeof window !== 'undefined') {
    try {
      const baseUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      const base = new URL(baseUrl);
      const page = new URL(window.location.href);
      const sameOrigin = base.origin === page.origin;
      const sameSite =
        base.protocol === page.protocol && hostKey(base.hostname) === hostKey(page.hostname);
      if (sameOrigin || sameSite) {
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
      `API 404：当前页 ${endpoint} 不存在。您设置了 VITE_API_BASE_URL 指向本站（或同站 www/apex），已改为请求当前域名下的 ${endpoint}。请在 Vercel 删除该环境变量以免混淆，并确认「Root Directory」为仓库根目录且含 api/ 文件夹，然后 Redeploy；本地在仓库根运行 npm run dev:api。`,
    );
  }

  const hint =
    crossOrigin && prefix
      ? `API 404：${prefix}${endpoint} 不存在。请确认 VITE_API_BASE_URL 指向的部署含 Serverless api/，或改为正确 API 域名后重新构建。`
      : `API 404（NOT_FOUND）：当前站点没有 ${endpoint}。请确认 Vercel「Root Directory」为仓库根目录（含 api/），且项目为含 Serverless 的部署（非纯静态托管替代）；本地在仓库根运行 npm run dev:api。`;

  throw new Error(hint);
}
