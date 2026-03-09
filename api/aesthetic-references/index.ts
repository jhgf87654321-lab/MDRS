import crypto from 'node:crypto';

import { getAdminDb } from '../lib/firebaseAdmin';
import { getSessionFromRequest } from '../lib/session';

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
  if (session.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  if (!isRecord(req.body)) return res.status(400).json({ error: 'Invalid JSON body' });
  const imageUrl = req.body.imageUrl;
  const prompt = req.body.prompt;
  if (!isNonEmptyString(imageUrl) || imageUrl.length > 5_000_000) return res.status(400).json({ error: 'Invalid imageUrl' });
  if (!isNonEmptyString(prompt) || prompt.length > 5000) return res.status(400).json({ error: 'Invalid prompt' });

  try {
    const db = getAdminDb();
    const id = crypto.randomUUID();
    await db.collection('aesthetic_references').doc(id).set({
      id,
      imageUrl,
      prompt,
      rating: 5,
      createdAt: new Date(),
      authorUid: session.uid,
    });
    return res.status(200).json({ ok: true, id });
  } catch (e) {
    console.error('Save reference failed', e);
    return res.status(500).json({ error: 'Failed to save reference' });
  }
}

