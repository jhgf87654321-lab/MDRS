import { buildSetCookie } from '../_lib/cookies';

export default async function handler(
  req: { method?: string },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (data: object) => void; end: () => void };
  },
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secure = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', buildSetCookie({ name: 'ax_session', value: '', maxAgeSeconds: 0, secure }));
  return res.status(200).json({ ok: true });
}

