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
  ownedNfts: OwnedNftRef[];
};

const COLLECTION = 'user_profiles';

function normalizeUrl(url: string | undefined | null) {
  return (url || '').trim();
}

async function getUid() {
  const auth = getCloudbaseAuth();
  const user = await auth.getCurrentUser();
  const uid = (user as any)?.uid as string | undefined;
  if (!uid) throw new Error('NOT_SIGNED_IN');
  return uid;
}

async function getProfileDoc(uid: string): Promise<UserProfileDoc | null> {
  const db = getCloudbaseDb();
  try {
    const res = await db.collection(COLLECTION).doc(uid).get();
    const doc = res?.data?.[0] as UserProfileDoc | undefined;
    return doc ?? null;
  } catch {
    return null;
  }
}

async function setProfileDoc(uid: string, doc: UserProfileDoc) {
  const db = getCloudbaseDb();
  // 使用 set 可能在某些情况下被平台完全忽略（例如与默认字段冲突），
  // 这里统一改为 update + upsert 语义，显式写入 ownedNfts / 时间戳。
  await db
    .collection(COLLECTION)
    .doc(uid)
    .update({
      uid: doc.uid,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      ...(doc.displayName ? { displayName: doc.displayName } : {}),
      ownedNfts: doc.ownedNfts,
    });
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

  const db = getCloudbaseDb();
  const res = await db
    .collection(COLLECTION)
    .doc(uid)
    .update({
      uid: doc.uid,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      ...(doc.displayName ? { displayName: doc.displayName } : {}),
      ownedNfts: doc.ownedNfts,
    });

  console.log('[userProfile] updateOwnedNfts result', res);
  return doc;
}

export async function ensureUserProfile() {
  const uid = await getUid();
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

  const db = getCloudbaseDb();
  const res = await db
    .collection(COLLECTION)
    .doc(uid)
    .update({
      uid: doc.uid,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      displayName: doc.displayName,
      ownedNfts: doc.ownedNfts,
    });
  console.log('[userProfile] setMyDisplayName result', res);
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

