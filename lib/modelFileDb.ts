import { getCloudbaseAuth, getCloudbaseDb } from './cloudbase';

/** 每次生成对应一条记录，关键词存于此集合 */
export const MODELFILE_COLLECTION = 'MODELFILE';

export type ModelFileDoc = {
  _id?: string;
  seq: number;
  cosUrl: string;
  keywords: string;
  uid: string;
  createdAt: number;
  isPublic?: boolean;
};

async function getUidWithRetry(): Promise<string> {
  const auth = getCloudbaseAuth();
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 6; i += 1) {
    const user = await auth.getCurrentUser();
    const uid = (user as any)?.uid as string | undefined;
    if (uid) return uid;
    await sleep(i === 0 ? 0 : 80 * i);
  }
  throw new Error('NOT_SIGNED_IN');
}

function assertDb(res: unknown, op: string) {
  const r = res as { code?: unknown; message?: string };
  if (typeof r?.code === 'string' && r.code.length > 0) {
    throw new Error(`${op}：${r.message || r.code}`);
  }
}

export async function addModelFileRecord(input: {
  seq: number;
  cosUrl: string;
  keywords: string;
  uid: string;
  isPublic?: boolean;
}) {
  const db = getCloudbaseDb();
  const res = await db.collection(MODELFILE_COLLECTION).add({
    seq: input.seq,
    cosUrl: input.cosUrl.trim(),
    keywords: input.keywords.trim(),
    uid: input.uid,
    createdAt: Date.now(),
    isPublic: input.isPublic !== false,
  });
  assertDb(res, 'MODELFILE 写入');
}

export async function listModelFilesByUid(uid: string, limit = 80): Promise<ModelFileDoc[]> {
  await getUidWithRetry();
  const db = getCloudbaseDb();
  const res = await db.collection(MODELFILE_COLLECTION).where({ uid: '{uid}' }).limit(Math.min(limit * 2, 100)).get();
  assertDb(res, 'MODELFILE 查询');
  const raw = (res as any)?.data;
  const rows = (Array.isArray(raw) ? raw : []) as ModelFileDoc[];
  return rows
    .filter((r) => r.uid === uid)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, limit);
}

export async function listPublicModelFiles(limit = 40): Promise<ModelFileDoc[]> {
  await getUidWithRetry();
  const db = getCloudbaseDb();
  const res = await db
    .collection(MODELFILE_COLLECTION)
    .where({ isPublic: true })
    .limit(Math.min(limit * 2, 100))
    .get();
  assertDb(res, 'MODELFILE 公开查询');
  const raw = (res as any)?.data;
  const rows = (Array.isArray(raw) ? raw : []) as ModelFileDoc[];
  return rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, limit);
}
