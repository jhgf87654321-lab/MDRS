import { getAdminDb } from '../_lib/firebaseAdmin';
import { getSessionFromRequest } from '../_lib/session';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export default async function handler(
  req: { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> },
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

  const session = getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  if (!isRecord(req.body)) return res.status(400).json({ error: 'Invalid JSON body' });
  const postId = req.body.postId;
  if (!isNonEmptyString(postId)) return res.status(400).json({ error: 'Invalid postId' });

  try {
    const db = getAdminDb();
    const ref = db.collection('posts').doc(postId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('Post not found');
      const likes = (snap.data()?.likesCount ?? 0) as number;
      tx.update(ref, { likesCount: likes + 1 });
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Like failed', e);
    return res.status(500).json({ error: 'Failed to like post' });
  }
}

