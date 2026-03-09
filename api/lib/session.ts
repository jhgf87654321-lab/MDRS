import crypto from 'node:crypto';
import { getCookieValue } from './cookies';

type SessionPayload = {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  exp: number;
  iat: number;
};

function base64UrlEncode(data: Buffer | string) {
  return Buffer.from(data).toString('base64url');
}

function base64UrlDecodeToString(data: string) {
  return Buffer.from(data, 'base64url').toString('utf8');
}

function sign(data: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

export function createSessionToken(payload: Omit<SessionPayload, 'iat' | 'exp'>, ttlSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const full: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('AUTH_SECRET is not configured (min 32 chars)');

  const body = base64UrlEncode(JSON.stringify(full));
  const sig = sign(body, secret);
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;

  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expected = sign(body, secret);
  const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return null;

  try {
    const payload = JSON.parse(base64UrlDecodeToString(body)) as SessionPayload;
    if (!payload?.uid || !payload?.email || !payload?.role || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req: { headers?: Record<string, string | string[] | undefined> }) {
  const cookieHeader = (req.headers?.cookie ??
    (Array.isArray(req.headers?.Cookie) ? req.headers?.Cookie[0] : req.headers?.Cookie)) as string | undefined;
  const token = getCookieValue(cookieHeader, 'ax_session');
  if (!token) return null;
  return verifySessionToken(token);
}
