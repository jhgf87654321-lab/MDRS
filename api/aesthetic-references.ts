import crypto from 'node:crypto';

import { getAdminDb } from '../lib/firebaseAdmin.js';
import { getSessionFromRequest } from '../lib/api-session.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toInt(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.floor(n);
  }
  return fallback;
}

async function fetchImageAsDataUrl(url: string, maxBytes: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength <= 0 || buf.byteLength > maxBytes) return null;
    const base64 = buf.toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

type Req = {
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};
type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (data: object) => void; end: () => void };
};

function getPath(req: Req): string {
  const q = req.query?.__path;
  if (typeof q === 'string') return q;
  if (Array.isArray(q) && q[0]) return q[0];
  const u = req.url || '';
  const m = u.match(/\/api\/aesthetic-references\/([^/?]+)/);
  return m ? m[1]! : '';
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = getPath(req);

  if (path === 'random') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const count = Math.max(0, Math.min(5, toInt(req.query?.count, 2)));
    if (count === 0) return res.status(200).json({ ok: true, references: [] });
    try {
      const db = getAdminDb();
      const snap = await db.collection('aesthetic_references').orderBy('createdAt', 'desc').limit(10).get();
      const refs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
      const shuffled = [...refs].sort(() => 0.5 - Math.random());
      const picked = shuffled.slice(0, count);

      const enriched = await Promise.all(
        picked.map(async (r) => {
          const imageUrl = typeof (r as any).imageUrl === 'string' ? ((r as any).imageUrl as string) : '';
          const imageDataUrl =
            imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
              ? await fetchImageAsDataUrl(imageUrl, 1_500_000)
              : imageUrl.startsWith('data:')
                ? imageUrl
                : null;
          return { ...r, imageDataUrl };
        }),
      );

      return res.status(200).json({ ok: true, references: enriched });
    } catch (e) {
      console.error('Fetch references failed', e);
      return res.status(200).json({ ok: true, references: [] });
    }
  }

  if (path === '' || !path) {
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
        id, imageUrl, prompt, rating: 5, createdAt: new Date(), authorUid: session.uid,
      });
      return res.status(200).json({ ok: true, id });
    } catch (e) {
      console.error('Save reference failed', e);
      return res.status(500).json({ error: 'Failed to save reference' });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
