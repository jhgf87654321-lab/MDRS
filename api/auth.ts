import crypto from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';

import { buildSetCookie } from './lib/cookies';
import { getAdminDb } from './lib/firebaseAdmin';
import { createSessionToken, getSessionFromRequest } from './lib/session';

type UserRole = 'user' | 'admin';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function scryptHash(password: string, salt: Buffer) {
  const hash = crypto.scryptSync(password, salt, 64);
  return hash.toString('base64');
}

async function getUserByEmail(db: Firestore, email: string) {
  const snap = await db.collection('users').where('email', '==', email).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return { id: doc.id, data: doc.data() as Record<string, unknown> };
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
  const m = u.match(/\/api\/auth\/([^/?]+)/);
  return m ? m[1]! : '';
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = getPath(req);
  const secure = process.env.NODE_ENV === 'production';

  if (path === 'logout') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    res.setHeader('Set-Cookie', buildSetCookie({ name: 'ax_session', value: '', maxAgeSeconds: 0, secure }));
    return res.status(200).json({ ok: true });
  }

  if (path === 'login') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = req.body as { email?: unknown; password?: unknown } | undefined;
    const emailRaw = body?.email;
    const passwordRaw = body?.password;
    if (!isNonEmptyString(emailRaw) || !isEmail(emailRaw)) return res.status(400).json({ error: 'Invalid email' });
    if (!isNonEmptyString(passwordRaw)) return res.status(400).json({ error: 'Invalid password' });
    const email = emailRaw.trim().toLowerCase();
    const password = passwordRaw;
    try {
      const db = getAdminDb();
      const user = await getUserByEmail(db, email);
      if (!user) return res.status(401).json({ error: 'Invalid email or password' });
      const passwordHash = user.data.passwordHash;
      const passwordSalt = user.data.passwordSalt;
      const role = user.data.role;
      if (typeof passwordHash !== 'string' || typeof passwordSalt !== 'string' || (role !== 'user' && role !== 'admin')) {
        return res.status(500).json({ error: 'Invalid user record' });
      }
      const salt = Buffer.from(passwordSalt, 'base64');
      const computed = scryptHash(password, salt);
      const ok = crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(passwordHash));
      if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
      const uid = user.id;
      const token = createSessionToken({ uid, email, role: role as UserRole }, 60 * 60 * 24 * 7);
      res.setHeader('Set-Cookie', buildSetCookie({ name: 'ax_session', value: token, maxAgeSeconds: 60 * 60 * 24 * 7, secure }));
      return res.status(200).json({ ok: true, user: { uid, email, role } });
    } catch (e) {
      console.error('Login error', e);
      return res.status(500).json({ error: `Login failed: ${e instanceof Error ? e.message : 'Unknown'}` });
    }
  }

  if (path === 'signup') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = req.body as { email?: unknown; password?: unknown } | undefined;
    const emailRaw = body?.email;
    const passwordRaw = body?.password;
    if (!isNonEmptyString(emailRaw) || !isEmail(emailRaw)) return res.status(400).json({ error: 'Invalid email' });
    if (!isNonEmptyString(passwordRaw) || passwordRaw.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const email = emailRaw.trim().toLowerCase();
    const password = passwordRaw;
    try {
      const db = getAdminDb();
      const existing = await getUserByEmail(db, email);
      if (existing) return res.status(409).json({ error: 'Email already registered' });
      const uid = crypto.randomUUID();
      const salt = crypto.randomBytes(16);
      const passwordHash = scryptHash(password, salt);
      const role: UserRole = 'user';
      await db.collection('users').doc(uid).set({
        uid, email, role, passwordHash, passwordSalt: salt.toString('base64'), createdAt: new Date(),
      });
      const token = createSessionToken({ uid, email, role }, 60 * 60 * 24 * 7);
      res.setHeader('Set-Cookie', buildSetCookie({ name: 'ax_session', value: token, maxAgeSeconds: 60 * 60 * 24 * 7, secure }));
      return res.status(200).json({ ok: true, user: { uid, email, role } });
    } catch (e) {
      console.error('Signup error', e);
      return res.status(500).json({ error: `Signup failed: ${e instanceof Error ? e.message : 'Unknown'}` });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
