/** 默认同源 /api（本目录 api/ 与 Vite 同域部署）。仅当前端与 API 不同源时设置 VITE_API_BASE_URL（无尾斜杠）。 */
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
    : `API 404（NOT_FOUND）：当前站点没有 ${endpoint}。请确认 Vercel 的 Root Directory 指向本应用目录（含 api/），且已重新部署；本地请在 .MTM 目录运行 npx vercel dev（另开终端）或 npm run dev:api。若 API 单独域名再设 VITE_API_BASE_URL。`;
  throw new Error(hint);
}
