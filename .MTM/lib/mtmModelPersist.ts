import { apiUrl, throwIfApiRouteMissing } from './apiBase';
import { ensureHmrsProfile, prependHmrsModelImageUrl } from './hmrsDb';
import { addModelFileRecord } from './modelFileDb';

type UploadJson = { ok?: boolean; url?: string; seq?: number; error?: string };

export type PersistMtmOptions = {
  /** 为 true 时写入 MODELFILE.isPublic，出现在 Global 公区 */
  publishToPublic?: boolean;
};

export async function persistMtmGeneration(
  dataUrl: string,
  keywords: string,
  uid: string,
  options?: PersistMtmOptions,
) {
  const res = await fetch(apiUrl('/api/mtm-modelcard-upload'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl }),
  });
  const text = await res.text();
  throwIfApiRouteMissing(res, text, '/api/mtm-modelcard-upload');
  let data: UploadJson = {};
  try {
    data = text ? (JSON.parse(text) as UploadJson) : {};
  } catch {
    throw new Error(res.ok ? '上传响应无效' : text.slice(0, 120));
  }
  if (!res.ok || data.error) throw new Error(data.error || 'MODELCARD 上传失败');
  const url = data.url;
  const seq = typeof data.seq === 'number' ? data.seq : -1;
  if (!url) throw new Error('未返回 COS 地址');

  await ensureHmrsProfile(uid);
  await addModelFileRecord({
    seq,
    cosUrl: url,
    keywords,
    uid,
    isPublic: options?.publishToPublic === true,
  });
  await prependHmrsModelImageUrl(uid, url);
  return { url, seq };
}
