import crypto from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';

import { buildSetCookie } from '../_lib/cookies';
import { getAdminDb } from '../_lib/firebaseAdmin';
import { createSessionToken } from '../_lib/session';

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

export default async function handler(
  req: { method?: string; body?: unknown },
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

  const body = req.body as { email?: unknown; password?: unknown } | undefined;
  const emailRaw = body?.email;
  const passwordRaw = body?.password;
  if (!isNonEmptyString(emailRaw) || !isEmail(emailRaw)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  if (!isNonEmptyString(passwordRaw)) {
    return res.status(400).json({ error: 'Invalid password' });
  }

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
      console.error('Invalid user record shape', { userId: user.id });
      return res.status(500).json({ error: 'Invalid user record' });
    }

    const salt = Buffer.from(passwordSalt, 'base64');
    const computed = scryptHash(password, salt);
    const ok = crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(passwordHash));
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const uid = user.id;
    const token = createSessionToken({ uid, email, role: role as UserRole }, 60 * 60 * 24 * 7);
    const secure = process.env.NODE_ENV === 'production';
    res.setHeader(
      'Set-Cookie',
      buildSetCookie({ name: 'ax_session', value: token, maxAgeSeconds: 60 * 60 * 24 * 7, secure }),
    );

    return res.status(200).json({ ok: true, user: { uid, email, role } });
  } catch (e) {
    console.error('Login error', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: `Login failed: ${message}` });
  }
}

