import { getAdminDb } from '../lib/firebaseAdmin';

function toInt(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.floor(n);
  }
  return fallback;
}

export default async function handler(
  req: { method?: string; query?: Record<string, unknown> },
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

  const count = Math.max(0, Math.min(5, toInt(req.query?.count, 2)));
  if (count === 0) return res.status(200).json({ ok: true, references: [] });

  try {
    const db = getAdminDb();
    const snap = await db.collection('aesthetic_references').orderBy('createdAt', 'desc').limit(10).get();
    const refs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const shuffled = [...refs].sort(() => 0.5 - Math.random());
    return res.status(200).json({ ok: true, references: shuffled.slice(0, count) });
  } catch (e) {
    console.error('Fetch references failed', e);
    return res.status(200).json({ ok: true, references: [] });
  }
}

