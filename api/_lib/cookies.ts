export function getCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const p of parts) {
    const [k, ...rest] = p.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function buildSetCookie(options: {
  name: string;
  value: string;
  maxAgeSeconds: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
  path?: string;
}) {
  const segs = [
    `${options.name}=${encodeURIComponent(options.value)}`,
    `Max-Age=${options.maxAgeSeconds}`,
    `Path=${options.path ?? '/'}`,
    `SameSite=${options.sameSite ?? 'Lax'}`,
  ];
  if (options.httpOnly ?? true) segs.push('HttpOnly');
  if (options.secure) segs.push('Secure');
  return segs.join('; ');
}

