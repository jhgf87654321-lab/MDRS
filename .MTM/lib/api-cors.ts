/**
 * 浏览器跨域预检会带 Access-Control-Request-Headers；若 Allow-Headers 未包含这些头，预检会失败。
 * 优先回显浏览器请求的头列表，否则使用常见默认值。
 */
const DEFAULT_ALLOW_HEADERS =
  'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, Accept, Accept-Language, Origin, Cache-Control, Pragma';

export type ApiCorsReq = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

export type ApiCorsRes = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (data: object) => void; end: () => void };
};

export function applyApiCors(req: ApiCorsReq, res: Pick<ApiCorsRes, 'setHeader'>): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
  const raw = req.headers?.['access-control-request-headers'];
  const allow =
    typeof raw === 'string' && raw.trim().length > 0 ? raw : DEFAULT_ALLOW_HEADERS;
  res.setHeader('Access-Control-Allow-Headers', allow);
  res.setHeader('Access-Control-Max-Age', '86400');
}

/** 处理 OPTIONS 预检；已处理返回 true */
export function handleCorsPreflightIfNeeded(req: ApiCorsReq, res: ApiCorsRes): boolean {
  applyApiCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
