import { getCloudbaseAuth, getCloudbaseDb } from './cloudbase';

export type OwnedNftRef = {
  cosUrl: string;
  serialNumber?: string;
  createdAt: number;
  source?: 'mint' | 'trade';
};

export type UserProfileDoc = {
  uid: string;
  createdAt: number;
  updatedAt: number;
  // 用户自定义显示名，仅用于前端展示，不参与登录
  displayName?: string;
  // 用户自定义头像 URL（COS）
  avatarUrl?: string;
  ownedNfts: OwnedNftRef[];
};

const COLLECTION = 'user_profiles';

function normalizeUrl(url: string | undefined | null) {
  return (url || '').trim();
}

async function getUid() {
  const auth = getCloudbaseAuth();
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  // 登录/注册刚完成时，CloudBase 的会话可能需要短暂时间落地，
  // 这里做小次数重试，避免瞬时 getCurrentUser() 为空导致 NOT_SIGNED_IN。
  for (let i = 0; i < 6; i += 1) {
    const user = await auth.getCurrentUser();
    const uid = (user as any)?.uid as string | undefined;
    if (uid) return uid;
    // 0, 80, 160, 240... 逐步等待
    await sleep(i === 0 ? 0 : 80 * i);
  }
  throw new Error('NOT_SIGNED_IN');
}

async function getProfileDoc(uid: string): Promise<UserProfileDoc | null> {
  const db = getCloudbaseDb();
  try {
    const res = await db.collection(COLLECTION).doc(uid).get();
    const raw = (res as any)?.data;
    const doc = (Array.isArray(raw) ? raw[0] : raw) as UserProfileDoc | undefined;
    return doc ?? null;
  } catch {
    return null;
  }
}

async function setProfileDoc(uid: string, doc: UserProfileDoc) {
  const db = getCloudbaseDb();
  const payload = {
    uid: doc.uid,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...(doc.displayName ? { displayName: doc.displayName } : {}),
    ...(doc.avatarUrl ? { avatarUrl: doc.avatarUrl } : {}),
    ownedNfts: doc.ownedNfts,
  };

  // CloudBase DB 在某些情况下对 doc(uid).set 可能返回 E11000 duplicate key（尤其是并发首次写入/旧数据迁移）。
  // 这里改为“先 update，失败再 set；如果 set 再次遇到 duplicate，则回退 update”。
  // 这样避免依赖额外的 get() 回读（某些安全规则下回读可能失败，从而导致整个写入失败）。
  try {
    await db.collection(COLLECTION).doc(uid).update(payload);
    return;
  } catch {
    // ignore; fall through to set
  }

  try {
    await db.collection(COLLECTION).doc(uid).set(payload);
    return;
  } catch (err: any) {
    const msg: string = err?.message || '';
    if (msg.includes('DuplicateWrite') || msg.includes('duplicate key error') || err?.code === 'DATABASE_REQUEST_FAILED') {
      // 若刚好在 set 时并发创建成功，则再用 update 覆盖即可
      await db.collection(COLLECTION).doc(uid).update(payload);
      return;
    }
    throw err;
  }
}

async function updateOwnedNfts(uid: string, next: OwnedNftRef[]) {
  const now = Date.now();
  const existing = await getProfileDoc(uid);
  const base: UserProfileDoc =
    existing ?? {
      uid,
      createdAt: now,
      updatedAt: now,
      ownedNfts: [],
    };
  const doc: UserProfileDoc = {
    ...base,
    ownedNfts: next,
    updatedAt: now,
  };
  await setProfileDoc(uid, doc);
  return doc;
}

export async function ensureUserProfile(uidHint?: string) {
  const uid = uidHint && uidHint.trim() ? uidHint.trim() : await getUid();
  const existing = await getProfileDoc(uid);
  if (existing) return existing;
  const now = Date.now();
  const doc: UserProfileDoc = {
    uid,
    createdAt: now,
    updatedAt: now,
    ownedNfts: [],
  };
  await setProfileDoc(uid, doc);
  return doc;
}

export async function listMyOwnedNfts(): Promise<OwnedNftRef[]> {
  const uid = await getUid();
  const doc = await ensureUserProfile();
  // keep in sync with server doc if it already exists
  if (doc.uid !== uid) return [];
  return Array.isArray(doc.ownedNfts) ? doc.ownedNfts : [];
}

export async function setMyDisplayName(displayName: string) {
  const uid = await getUid();
  const now = Date.now();
  const existing = await getProfileDoc(uid);
  const base: UserProfileDoc =
    existing ?? {
      uid,
      createdAt: now,
      updatedAt: now,
      ownedNfts: [],
    };
  const doc: UserProfileDoc = {
    ...base,
    displayName,
    updatedAt: now,
  };

  await setProfileDoc(uid, doc);
  console.log('[userProfile] setMyDisplayName result', { ok: true, uid });
  return doc;
}

export async function setMyAvatarUrl(avatarUrl: string) {
  const uid = await getUid();
  const now = Date.now();
  const existing = await getProfileDoc(uid);
  const base: UserProfileDoc =
    existing ?? {
      uid,
      createdAt: now,
      updatedAt: now,
      ownedNfts: [],
    };
  const doc: UserProfileDoc = {
    ...base,
    avatarUrl: avatarUrl.trim(),
    updatedAt: now,
  };

  await setProfileDoc(uid, doc);
  console.log('[userProfile] setMyAvatarUrl result', { ok: true, uid });
  return doc;
}

export async function addNftToMyProfile(input: { cosUrl: string; serialNumber?: string; source?: 'mint' | 'trade' }) {
  try {
    const uid = await getUid();
    const cosUrl = normalizeUrl(input.cosUrl);
    if (!cosUrl) throw new Error('EMPTY_URL');

    console.log('[userProfile] addNftToMyProfile start', { uid, cosUrl, serialNumber: input.serialNumber, source: input.source });

    const doc = await ensureUserProfile();
    console.log('[userProfile] ensureUserProfile ok for uid', doc.uid);

    const owned = Array.isArray(doc.ownedNfts) ? doc.ownedNfts : [];
    if (owned.some((x) => normalizeUrl(x.cosUrl) === cosUrl)) {
      console.log('[userProfile] NFT already recorded for uid, skip', { uid, cosUrl });
      return doc;
    }

    const next: OwnedNftRef[] = [
      { cosUrl, serialNumber: input.serialNumber, source: input.source, createdAt: Date.now() },
      ...owned,
    ];
    console.log('[userProfile] updating ownedNfts count', { uid, count: next.length });
    const result = await updateOwnedNfts(uid, next);
    console.log('[userProfile] addNftToMyProfile success', { uid });
    return result;
  } catch (err: any) {
    console.error('[userProfile] addNftToMyProfile error', {
      code: err?.code,
      message: err?.message,
      requestId: err?.requestId,
      raw: err,
    });
    throw err;
  }
}

export async function removeNftFromMyProfile(cosUrlRaw: string) {
  const uid = await getUid();
  const cosUrl = normalizeUrl(cosUrlRaw);
  const doc = await ensureUserProfile();
  const owned = Array.isArray(doc.ownedNfts) ? doc.ownedNfts : [];
  const next = owned.filter((x) => normalizeUrl(x.cosUrl) !== cosUrl);
  return await updateOwnedNfts(uid, next);
}

export async function transferNftBetweenUsers(params: { fromUid: string; toUid: string; cosUrl: string; serialNumber?: string }) {
  const fromUid = params.fromUid.trim();
  const toUid = params.toUid.trim();
  const cosUrl = normalizeUrl(params.cosUrl);
  if (!fromUid || !toUid || !cosUrl) throw new Error('INVALID_TRANSFER');

  const fromDoc = (await getProfileDoc(fromUid)) ?? {
    uid: fromUid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    displayName: undefined,
    ownedNfts: [],
  };
  const toDoc = (await getProfileDoc(toUid)) ?? {
    uid: toUid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    displayName: undefined,
    ownedNfts: [],
  };

  const fromNext = (fromDoc.ownedNfts ?? []).filter((x) => normalizeUrl(x.cosUrl) !== cosUrl);
  const toOwned = Array.isArray(toDoc.ownedNfts) ? toDoc.ownedNfts : [];
  const toNext = toOwned.some((x) => normalizeUrl(x.cosUrl) === cosUrl)
    ? toOwned
    : [{ cosUrl, serialNumber: params.serialNumber, source: 'trade' as const, createdAt: Date.now() }, ...toOwned];

  await updateOwnedNfts(fromUid, fromNext);
  await updateOwnedNfts(toUid, toNext);
}

