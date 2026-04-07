import { apiUrl, throwIfApiRouteMissing } from './apiBase';
import { ensureHmrsProfile, prependHmrsModelImageUrl } from './hmrsDb';
import { addModelFileRecord } from './modelFileDb';

type UploadJson = { ok?: boolean; url?: string; seq?: number; error?: string };

/** Vercel 等 Serverless 对 JSON body 约 4.5MB；预留 JSON 字段与转义余量 */
const MAX_UPLOAD_JSON_CHARS = 3_800_000;

function jsonPayloadLength(dataUrl: string, publishToPublic: boolean): number {
  return JSON.stringify({ dataUrl, publishToPublic }).length;
}

function dataUrlToResizedJpeg(dataUrl: string, maxEdge: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (!w || !h) {
        resolve(dataUrl);
        return;
      }
      const scale = Math.max(w, h) > maxEdge ? maxEdge / Math.max(w, h) : 1;
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('图片解码失败，无法压缩'));
    img.src = dataUrl;
  });
}

/**
 * 将模卡/生成图压到单请求可接受大小（避免 FUNCTION_PAYLOAD_TOO_LARGE）。
 */
export async function shrinkDataUrlForMtmUpload(
  dataUrl: string,
  publishToPublic: boolean,
): Promise<string> {
  if (jsonPayloadLength(dataUrl, publishToPublic) <= MAX_UPLOAD_JSON_CHARS) {
    return dataUrl;
  }

  const qualities = [0.88, 0.82, 0.75, 0.68, 0.62] as const;
  const maxEdges = [1920, 1600, 1280, 1024, 896] as const;

  let best = dataUrl;
  for (const maxEdge of maxEdges) {
    for (const q of qualities) {
      try {
        const jpeg = await dataUrlToResizedJpeg(dataUrl, maxEdge, q);
        const len = jsonPayloadLength(jpeg, publishToPublic);
        if (len <= MAX_UPLOAD_JSON_CHARS) return jpeg;
        if (len < jsonPayloadLength(best, publishToPublic)) best = jpeg;
      } catch {
        /* 继续尝试更小尺寸 */
      }
    }
  }

  if (jsonPayloadLength(best, publishToPublic) > MAX_UPLOAD_JSON_CHARS) {
    throw new Error(
      '图片体积超过当前接口单次上传上限（已自动压缩仍不足）。可稍后重试或降低模卡导出分辨率。',
    );
  }
  return best;
}

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
  const publishToPublic = options?.publishToPublic === true;
  const dataUrlForUpload = await shrinkDataUrlForMtmUpload(dataUrl, publishToPublic);
  const res = await fetch(apiUrl('/api/mtm-modelcard-upload'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl: dataUrlForUpload, publishToPublic }),
  });
  const text = await res.text();
  throwIfApiRouteMissing(res, text, '/api/mtm-modelcard-upload');
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const maybeHtml =
    contentType.includes('text/html') ||
    /^\s*<!doctype html/i.test(text) ||
    /^\s*<html[\s>]/i.test(text);
  if (maybeHtml) {
    throw new Error(
      'API 响应为 HTML 而非 JSON：/api/mtm-modelcard-upload 当前不可用。请检查部署是否包含 api 路由、VITE_API_BASE_URL 是否指向正确后端，或网络/网关是否拦截了 API 请求。',
    );
  }
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
  await prependHmrsModelImageUrl(uid, url);
  try {
    await addModelFileRecord({
      seq,
      cosUrl: url,
      keywords,
      uid,
      isPublic: options?.publishToPublic === true,
    });
  } catch (e) {
    console.warn('[MODELFILE] 元数据写入失败（HMRS 已更新，个人预览仍可显示图片）', e);
  }
  return { url, seq };
}
