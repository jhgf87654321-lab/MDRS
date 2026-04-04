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

function normalizeIsPublicField(v: unknown): boolean {
  return v === true || v === 'true' || v === 1;
}

/** 公区查询：字面量布尔在多数环境最稳；command.eq 若序列化异常会导致 0 条 */
function whereIsPublicTrue() {
  return { isPublic: true };
}

function extractNewDocId(res: unknown): string | undefined {
  const r = res as Record<string, unknown>;
  if (typeof r.id === 'string' && r.id.trim()) return r.id.trim();
  if (typeof r._id === 'string' && r._id.trim()) return r._id.trim();
  const ids = r.ids;
  if (Array.isArray(ids) && ids.length > 0 && typeof ids[0] === 'string') return ids[0]!.trim();
  return undefined;
}

export async function addModelFileRecord(input: {
  seq: number;
  cosUrl: string;
  keywords: string;
  uid: string;
  isPublic?: boolean;
}) {
  const db = getCloudbaseDb();
  const isPub = input.isPublic === true;
  /** 非公区不写 isPublic:false：部分环境安全规则/校验对 false 不兼容，缺省字段即视为非公开 */
  const payload: Record<string, unknown> = {
    seq: input.seq,
    cosUrl: input.cosUrl.trim(),
    keywords: input.keywords.trim(),
    uid: input.uid,
    createdAt: Date.now(),
  };
  if (isPub) payload.isPublic = true;
  const res = await db.collection(MODELFILE_COLLECTION).add(payload);
  assertDb(res, 'MODELFILE 写入');
  const newId = extractNewDocId(res);
  if (isPub && newId) {
    try {
      const up = await db.collection(MODELFILE_COLLECTION).doc(newId).update({ isPublic: true });
      assertDb(up, 'MODELFILE isPublic 确认');
    } catch (e) {
      console.warn('[MODELFILE] isPublic 二次写入失败（若公区仍无图，请检查集合权限与 isPublic 字段）', e);
    }
  }
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

function keywordsMatch(keywords: string, needle: string): boolean {
  const q = needle.trim().toLowerCase();
  if (!q) return true;
  return (keywords || '').toLowerCase().includes(q);
}

/**
 * 在当前用户的 MODELFILE 中按 keywords 字段子串匹配（不区分大小写）。
 * 在已拉取的最近记录上过滤，受单次查询条数上限约束。
 */
export async function searchModelFileDocsForUser(uid: string, needle: string, limit = 80): Promise<ModelFileDoc[]> {
  const cap = Math.min(200, Math.max(limit, 40));
  const all = await listModelFilesByUid(uid, cap);
  const q = needle.trim();
  if (!q) return all.slice(0, limit);
  return all.filter((f) => keywordsMatch(f.keywords, q)).slice(0, limit);
}

/** 在公区 MODELFILE 中按 keywords 子串匹配 */
export async function searchPublicModelFileDocs(needle: string, limit = 80): Promise<ModelFileDoc[]> {
  const cap = Math.min(200, Math.max(limit, 40));
  const all = await listPublicModelFiles(cap);
  const q = needle.trim();
  if (!q) return all.slice(0, limit);
  return all.filter((f) => keywordsMatch(f.keywords, q)).slice(0, limit);
}

export async function listPublicModelFiles(limit = 40): Promise<ModelFileDoc[]> {
  await getUidWithRetry();
  const db = getCloudbaseDb();
  const res = await db
    .collection(MODELFILE_COLLECTION)
    .where(whereIsPublicTrue())
    .limit(Math.min(limit * 2, 100))
    .get();
  assertDb(res, 'MODELFILE 公开查询');
  const raw = (res as any)?.data;
  const rows = (Array.isArray(raw) ? raw : []) as ModelFileDoc[];
  return rows
    .map((r) => ({ ...r, isPublic: normalizeIsPublicField((r as ModelFileDoc).isPublic) }))
    .filter((r) => r.isPublic === true)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, limit);
}

function snapshotDocsToArray(snapshot: unknown): Record<string, unknown>[] {
  const docs = (snapshot as { docs?: unknown })?.docs;
  if (docs && typeof docs === 'object' && !Array.isArray(docs)) {
    return Object.values(docs as Record<string, Record<string, unknown>>);
  }
  if (Array.isArray(docs)) return docs as Record<string, unknown>[];
  return [];
}

function rowToModelFileDoc(row: Record<string, unknown>): ModelFileDoc | null {
  const cosUrl = row.cosUrl;
  if (typeof cosUrl !== 'string' || !cosUrl.trim()) return null;
  return {
    _id: typeof row._id === 'string' ? row._id : undefined,
    seq: typeof row.seq === 'number' ? row.seq : 0,
    cosUrl: cosUrl.trim(),
    keywords: typeof row.keywords === 'string' ? row.keywords : '',
    uid: typeof row.uid === 'string' ? row.uid : '',
    createdAt: typeof row.createdAt === 'number' ? row.createdAt : 0,
    isPublic: normalizeIsPublicField(row.isPublic),
  };
}

/** 监听公区 MODELFILE（最新 4 条，含本人作品），失败时由调用方回退轮询 */
export function watchPublicModelFiles(
  _uidSelf: string,
  onRows: (rows: ModelFileDoc[]) => void,
  onError?: (e: unknown) => void,
): { close: () => void } {
  const db = getCloudbaseDb();
  const w = db
    .collection(MODELFILE_COLLECTION)
    .where(whereIsPublicTrue())
    .watch({
      onChange(snapshot) {
        const rows = snapshotDocsToArray(snapshot)
          .map((r) => rowToModelFileDoc(r))
          .filter((x): x is ModelFileDoc => x !== null && normalizeIsPublicField(x.isPublic))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, 4);
        onRows(rows);
      },
      onError: (err) => onError?.(err),
    });
  return { close: () => w.close() };
}
