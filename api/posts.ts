import crypto from 'node:crypto';

import { getAdminDb } from './lib/firebaseAdmin';
import { getSessionFromRequest } from './lib/session';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
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
  const m = u.match(/\/api\/posts\/([^/?]+)/);
  return m ? m[1]! : '';
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = getPath(req);
  const db = getAdminDb();

  if (path === 'like') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const session = getSessionFromRequest(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (!isRecord(req.body)) return res.status(400).json({ error: 'Invalid JSON body' });
    const postId = req.body.postId;
    if (!isNonEmptyString(postId)) return res.status(400).json({ error: 'Invalid postId' });
    try {
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

  if (path === '' || !path) {
    if (req.method === 'GET') {
      try {
        const snap = await db.collection('posts').orderBy('createdAt', 'desc').limit(20).get();
        const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return res.status(200).json({ ok: true, posts });
      } catch (e) {
        console.error('List posts failed', e);
        return res.status(500).json({ error: 'Failed to load posts' });
      }
    }
    if (req.method === 'POST') {
      const session = getSessionFromRequest(req);
      if (!session) return res.status(401).json({ error: 'Unauthorized' });
      if (!isRecord(req.body)) return res.status(400).json({ error: 'Invalid JSON body' });
      const mediaUrls = req.body.mediaUrls;
      const title = req.body.title;
      const content = req.body.content;
      if (!Array.isArray(mediaUrls) || mediaUrls.length === 0 || mediaUrls.length > 10) return res.status(400).json({ error: 'mediaUrls must be 1-10 items' });
      if (!mediaUrls.every((u) => typeof u === 'string' && u.length > 0 && u.length < 5_000_000)) return res.status(400).json({ error: 'Invalid mediaUrls' });
      if (!isNonEmptyString(title) || title.length > 100) return res.status(400).json({ error: 'Invalid title' });
      if (!isNonEmptyString(content) || content.length > 5000) return res.status(400).json({ error: 'Invalid content' });
      try {
        const authorName = session.email.split('@')[0] || 'Anonymous';
        const authorAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.uid}`;
        const postId = crypto.randomUUID();
        await db.collection('posts').doc(postId).set({
          id: postId, authorUid: session.uid, authorName, authorAvatar,
          mediaUrls, title: title.trim(), content: content.trim(), likesCount: 0, createdAt: new Date(),
        });
        return res.status(200).json({ ok: true, id: postId });
      } catch (e) {
        console.error('Create post failed', e);
        return res.status(500).json({ error: 'Failed to create post' });
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
