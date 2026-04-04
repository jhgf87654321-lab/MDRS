/** 部署时若前端与 API 不同源，在 .env 设置 VITE_API_BASE_URL=https://你的-api-项目.vercel.app */
export function apiUrl(path: string): string {
  const base = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, '') ?? '';
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

/** Vercel 上未部署 api/ 时常见 HTML 404；在解析 JSON 前调用，给出可操作的提示 */
export function throwIfApiRouteMissing(res: Response, bodyText: string, endpoint: string): void {
  if (res.ok) return;
  const t = bodyText;
  const vercelNotFound =
    res.status === 404 ||
    (t.includes('NOT_FOUND') && /could not be found/i.test(t));
  if (!vercelNotFound) return;
  const base = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, '') ?? '';
  const hint = base
    ? `API 404：${base}${endpoint} 不存在。请确认该 Vercel 项目以仓库根目录部署且含 api/（或修正 VITE_API_BASE_URL 后重新构建）。`
    : `API 404（NOT_FOUND）：当前站点没有服务端 ${endpoint}。仅部署 MTM 时请在构建环境变量中设置 VITE_API_BASE_URL=含 api 的 NFTT 根项目地址（如 https://xxx.vercel.app，无尾斜杠），重新 build 并部署；本地请另开终端运行根目录 API（如 npx vercel dev）。`;
  throw new Error(hint);
}
