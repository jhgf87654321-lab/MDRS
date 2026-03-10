import { getSessionFromRequest } from '../lib/session.js';

export default async function handler(
  req: { method?: string; headers?: Record<string, string | string[] | undefined> },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (data: object) => void; end: () => void };
  },
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = getSessionFromRequest(req);
  if (!session) return res.status(200).json({ ok: true, user: null });

  return res.status(200).json({
    ok: true,
    user: {
      uid: session.uid,
      email: session.email,
      role: session.role,
    },
  });
}
