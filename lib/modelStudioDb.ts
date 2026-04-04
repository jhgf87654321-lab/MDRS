import { getCloudbaseAuth, getCloudbaseDb } from './cloudbase';

/** 与云开发集合 `model_studio_images` 字段一致（见 .MTM/README 安全规则示例） */
export type ModelStudioImageDoc = {
  _id?: string;
  uid: string;
  imageUrl: string;
  prompt: string;
  createdAt: number;
  isPublic: boolean;
};

export const MODEL_STUDIO_COLLECTION = 'model_studio_images';

function assertDbResult(res: unknown, operation: string) {
  const r = res as { code?: unknown; message?: string };
  if (typeof r?.code === 'string' && r.code.length > 0) {
    const msg = r.message || r.code;
    throw new Error(`${operation} 失败：${msg}`);
  }
}

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

function normalizeRows(res: unknown): ModelStudioImageDoc[] {
  assertDbResult(res, '数据库查询');
  const raw = (res as any)?.data;
  const arr = Array.isArray(raw) ? raw : [];
  return arr as ModelStudioImageDoc[];
}

function snapshotDocsToArray(snapshot: unknown): Record<string, unknown>[] {
  const docs = (snapshot as { docs?: unknown })?.docs;
  if (docs && typeof docs === 'object' && !Array.isArray(docs)) {
    return Object.values(docs as Record<string, Record<string, unknown>>);
  }
  if (Array.isArray(docs)) return docs as Record<string, unknown>[];
  return [];
}

function docFromSnapshotRow(row: Record<string, unknown>): ModelStudioImageDoc | null {
  const uid = typeof row.uid === 'string' ? row.uid : '';
  const imageUrl = typeof row.imageUrl === 'string' ? row.imageUrl : '';
  if (!uid || !imageUrl) return null;
  return {
    _id: typeof row._id === 'string' ? row._id : undefined,
    uid,
    imageUrl,
    prompt: typeof row.prompt === 'string' ? row.prompt : '',
    createdAt: typeof row.createdAt === 'number' ? row.createdAt : 0,
    isPublic: row.isPublic === true,
  };
}

function sortByCreatedAtDesc(rows: ModelStudioImageDoc[]) {
  return [...rows].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * 使用 `{ uid: '{uid}' }` 模板变量，与安全规则中 `auth.uid == doc.uid` 的查询子集要求对齐（见 cloudbase-document-database-web-sdk/security-rules）。
 */
export async function addModelStudioImage(input: { imageUrl: string; prompt: string; isPublic?: boolean }) {
  const uid = await getUidWithRetry();
  const db = getCloudbaseDb();
  const res = await db.collection(MODEL_STUDIO_COLLECTION).add({
    uid,
    imageUrl: input.imageUrl.trim(),
    prompt: input.prompt.trim(),
    createdAt: Date.now(),
    isPublic: input.isPublic !== false,
  });
  assertDbResult(res, '写入模特工作室记录');
}

export async function listMyModelStudioImages(limit = 30): Promise<ModelStudioImageDoc[]> {
  await getUidWithRetry();
  const db = getCloudbaseDb();
  const res = await db
    .collection(MODEL_STUDIO_COLLECTION)
    .where({ uid: '{uid}' })
    .limit(Math.min(Math.max(limit, 1) * 2, 100))
    .get();
  const rows = normalizeRows(res);
  return sortByCreatedAtDesc(rows).slice(0, limit);
}

export async function listPublicModelStudioImages(limit = 40): Promise<ModelStudioImageDoc[]> {
  await getUidWithRetry();
  const db = getCloudbaseDb();
  const res = await db
    .collection(MODEL_STUDIO_COLLECTION)
    .where({ isPublic: true })
    .limit(Math.min(Math.max(limit, 1) * 2, 100))
    .get();
  const rows = normalizeRows(res);
  return sortByCreatedAtDesc(rows).slice(0, limit);
}

export type ModelStudioWatchHandle = { close: () => void };

/**
 * 实时监听当前用户作品（cloudbase-document-database-web-sdk/realtime.md）
 */
export function watchMyModelStudioImages(
  onData: (rows: ModelStudioImageDoc[]) => void,
  onError?: (err: unknown) => void,
): ModelStudioWatchHandle {
  const db = getCloudbaseDb();
  const watcher = db
    .collection(MODEL_STUDIO_COLLECTION)
    .where({ uid: '{uid}' })
    .watch({
      onChange(snapshot) {
        const parsed = snapshotDocsToArray(snapshot)
          .map(docFromSnapshotRow)
          .filter(Boolean) as ModelStudioImageDoc[];
        onData(sortByCreatedAtDesc(parsed).slice(0, 30));
      },
      onError(err) {
        onError?.(err);
      },
    });
  return { close: () => watcher.close() };
}

/** 监听公开作品（查询条件需与安全规则 read 子集一致） */
export function watchPublicModelStudioImages(
  excludeUid: string,
  onData: (rows: ModelStudioImageDoc[]) => void,
  onError?: (err: unknown) => void,
): ModelStudioWatchHandle {
  const db = getCloudbaseDb();
  const watcher = db
    .collection(MODEL_STUDIO_COLLECTION)
    .where({ isPublic: true })
    .watch({
      onChange(snapshot) {
        const parsed = (snapshotDocsToArray(snapshot)
          .map(docFromSnapshotRow)
          .filter(Boolean) as ModelStudioImageDoc[]).filter((d) => d.uid !== excludeUid);
        onData(sortByCreatedAtDesc(parsed).slice(0, 40));
      },
      onError(err) {
        onError?.(err);
      },
    });
  return { close: () => watcher.close() };
}
