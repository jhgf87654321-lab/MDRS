import { getCloudbaseAuth, getCloudbaseDb, pickWebAuthUserIdEmail } from './cloudbase';

/** 腾讯云开发文档型数据库集合 HMRS：用户模特档案 */
export const HMRS_COLLECTION = 'HMRS';

export type HmrsProfileDoc = {
  _id?: string;
  uid: string;
  email?: string;
  displayName?: string;
  /** COS 图片地址列表（新图前置） */
  modelImageUrls: string[];
  createdAt: number;
  updatedAt: number;
};

async function getUidWithRetry(): Promise<string> {
  const auth = getCloudbaseAuth();
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 8; i += 1) {
    const user = await auth.getCurrentUser();
    const picked = pickWebAuthUserIdEmail(user);
    if (picked?.uid) return picked.uid;
    await sleep(i === 0 ? 0 : 80 * i);
  }
  throw new Error('NOT_SIGNED_IN');
}

/** 兼容不同版本 SDK / 网关返回的 data 形态 */
function extractRows(res: unknown): unknown[] {
  const r = res as Record<string, unknown> | null;
  if (!r) return [];
  const raw = (r.data ?? (r as any).Data ?? (r as any).result?.data ?? (r as any).result?.Data) as unknown;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') return [raw];
  return [];
}

function firstRow(res: unknown): HmrsProfileDoc | null {
  const row = extractRows(res)[0];
  if (!row || typeof row !== 'object') return null;
  const o = row as HmrsProfileDoc;
  if (typeof o.uid === 'string' && o.uid.trim()) return o;
  return null;
}

export async function getHmrsProfile(uidHint?: string): Promise<HmrsProfileDoc | null> {
  const uid = uidHint?.trim() ? uidHint.trim() : await getUidWithRetry();
  const db = getCloudbaseDb();
  // 规则为 doc.uid == auth.uid 时，查询条件必须包含 uid（模板 {uid}），仅 doc(_id).get 不满足「子集」校验
  try {
    const res = await db.collection(HMRS_COLLECTION).where({ uid: '{uid}' }).limit(1).get();
    const doc = firstRow(res);
    // 条件已含 auth 模板 {uid}，结果必为当前用户文档，勿与 uid 形参强比对（避免 sub / uid 字段不一致导致「写入成功却读不到」）
    if (doc) return doc;
  } catch {
    /* ignore */
  }
  try {
    const res = await db.collection(HMRS_COLLECTION).where({ _id: uid, uid: '{uid}' }).limit(1).get();
    const doc = firstRow(res);
    if (doc) return doc;
  } catch {
    /* ignore */
  }
  try {
    const res = await db.collection(HMRS_COLLECTION).doc(uid).get();
    const raw = (res as any)?.data;
    const doc = (Array.isArray(raw) ? raw[0] : raw) as HmrsProfileDoc | undefined;
    if (doc?.uid === uid) return doc;
  } catch {
    /* ignore */
  }
  try {
    const res = await db.collection(HMRS_COLLECTION).where({ uid }).limit(1).get();
    return firstRow(res);
  } catch {
    return null;
  }
}

/**
 * 首次创建：在 read/write 为 doc.uid == auth.uid 时，doc(uid).set 的「写查询」只有 _id，常不满足子集校验；
 * 优先 add（按写入数据校验），再 doc(uid).set 兜底。
 */
async function createHmrsProfileDocument(uid: string, payload: HmrsProfileDoc) {
  const db = getCloudbaseDb();
  const plain = payload as unknown as Record<string, unknown>;
  const errs: string[] = [];

  try {
    const res = await db.collection(HMRS_COLLECTION).add(plain);
    const code = (res as any)?.code;
    if (typeof code === 'string' && code.length > 0) throw new Error(code);
    return;
  } catch (e) {
    errs.push(String((e as any)?.message ?? e));
    console.warn('[hmrs] collection.add failed', (e as any)?.code ?? (e as any)?.message ?? e);
  }

  try {
    await db.collection(HMRS_COLLECTION).doc(uid).set(plain);
    return;
  } catch (e) {
    errs.push(String((e as any)?.message ?? e));
    console.warn('[hmrs] doc(uid).set failed', (e as any)?.code ?? (e as any)?.message ?? e);
  }

  try {
    await db.collection(HMRS_COLLECTION).doc(uid).update(plain);
    return;
  } catch (e) {
    errs.push(String((e as any)?.message ?? e));
  }

  try {
    await db.collection(HMRS_COLLECTION).doc(uid).set(plain);
    return;
  } catch (e) {
    const last = String((e as any)?.message ?? e);
    throw new Error(`HMRS_PROFILE_WRITE_FAILED: ${last} (${errs.join('; ')})`);
  }
}

/** 注册或首次进入时建立 HMRS 档案（已存在则返回，不覆盖业务字段） */
export async function ensureHmrsProfile(
  uid: string,
  opts?: { email?: string; displayName?: string },
): Promise<HmrsProfileDoc> {
  const authUid = await getUidWithRetry();
  const hint = uid?.trim() || '';
  if (hint && hint !== authUid) {
    console.warn('[hmrs] ensureHmrsProfile: caller uid !== auth uid, using auth uid', { hint, authUid });
  }
  const effectiveUid = authUid;

  const existing = await getHmrsProfile(effectiveUid);
  if (existing) return existing;

  const now = Date.now();
  const payload: HmrsProfileDoc = {
    uid: effectiveUid,
    email: opts?.email?.trim() || undefined,
    displayName: opts?.displayName?.trim() || undefined,
    modelImageUrls: [],
    createdAt: now,
    updatedAt: now,
  };

  await createHmrsProfileDocument(effectiveUid, payload);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 28; i += 1) {
    const verified = await getHmrsProfile(effectiveUid);
    if (verified) return verified;
    await sleep(100 + i * 35);
  }
  throw new Error(
    'HMRS_PROFILE_CREATE_FAILED: 写入后仍无法读取 HMRS 档案。请检查集合 HMRS 是否存在、安全规则是否允许「含 uid 模板」的读，且 doc.uid 与 auth.uid 一致。',
  );
}

/** 在 HMRS 档案中前置追加一张模特卡 COS 地址（新图在前） */
export async function prependHmrsModelImageUrl(uid: string, cosUrl: string) {
  const url = cosUrl.trim();
  if (!url) return;
  await ensureHmrsProfile(uid);
  const db = getCloudbaseDb();
  const authUid = await getUidWithRetry();
  const doc = await getHmrsProfile(authUid);
  const prev = Array.isArray(doc?.modelImageUrls) ? doc.modelImageUrls : [];
  const next = [url, ...prev.filter((u) => u !== url)].slice(0, 500);
  await db.collection(HMRS_COLLECTION).where({ uid: '{uid}' }).update({
    modelImageUrls: next,
    updatedAt: Date.now(),
  } as unknown as Record<string, unknown>);
}

function snapshotDocsToArray(snapshot: unknown): Record<string, unknown>[] {
  const docs = (snapshot as { docs?: unknown })?.docs;
  if (docs && typeof docs === 'object' && !Array.isArray(docs)) {
    return Object.values(docs as Record<string, Record<string, unknown>>);
  }
  if (Array.isArray(docs)) return docs as Record<string, unknown>[];
  return [];
}

/** 监听当前用户 HMRS 档案中的 modelImageUrls */
export function watchHmrsModelImageUrls(
  onUrls: (urls: string[]) => void,
  onError?: (e: unknown) => void,
): { close: () => void } {
  const db = getCloudbaseDb();
  const w = db.collection(HMRS_COLLECTION).where({ uid: '{uid}' }).watch({
    onChange(snapshot) {
      const rows = snapshotDocsToArray(snapshot);
      const row = rows[0] as { modelImageUrls?: unknown } | undefined;
      const urls = Array.isArray(row?.modelImageUrls) ? (row!.modelImageUrls as string[]) : [];
      onUrls(urls);
    },
    onError: (err) => onError?.(err),
  });
  return { close: () => w.close() };
}
