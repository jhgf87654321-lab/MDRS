export const config = {
  maxDuration: 120,
};

type Req = { method?: string; body?: unknown };
type Res = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (data: object) => void; end: () => void };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseDataUrl(dataUrl: string) {
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1]!, base64: match[2]! };
}

function sanitizeFileName(name: string) {
  const trimmed = name.trim().slice(0, 120);
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return safe.replace(/^_+/, '').replace(/^\.*/, '').slice(0, 120) || 'file';
}

async function getCosClient() {
  const SecretId = process.env.COS_SECRET_ID;
  const SecretKey = process.env.COS_SECRET_KEY;
  if (!SecretId || !SecretKey) throw new Error('COS_SECRET_ID or COS_SECRET_KEY is not configured');
  const mod = await import('cos-nodejs-sdk-v5');
  const COS = (mod as unknown as { default: new (opts: { SecretId: string; SecretKey: string }) => any }).default;
  return new COS({ SecretId, SecretKey });
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isRecord(req.body)) return res.status(400).json({ error: 'Invalid JSON body' });

  const dataUrlRaw = (req.body as any).dataUrl;
  const fileNameRaw = (req.body as any).fileName;

  if (!isNonEmptyString(dataUrlRaw)) return res.status(400).json({ error: 'Missing dataUrl' });
  if (!isNonEmptyString(fileNameRaw)) return res.status(400).json({ error: 'Missing fileName' });

  const parsed = parseDataUrl(dataUrlRaw);
  if (!parsed) return res.status(400).json({ error: 'Invalid data URL format' });

  if (!parsed.base64 || !parsed.base64.length) return res.status(400).json({ error: 'Empty image' });

  const originalFileName = sanitizeFileName(String(fileNameRaw));
  const inputBuf = Buffer.from(parsed.base64, 'base64');
  const fileType = parsed.mimeType;

  // 与本地同一流程：先选放大方式，再得到 2K Buffer，最后统一上传 COS → 返回 url
  let opencvBase =
    (process.env.LOCAL_UPS_ENDPOINT || process.env.CLOUD_UPSCALE_URL || '').trim().replace(/\/+$/, '');
  if (opencvBase && !/^https?:\/\//i.test(opencvBase)) {
    opencvBase = `https://${opencvBase}`;
  }

  try {
    let outBuf: Buffer;

    if (opencvBase) {
      // 本地或线上：OpenCV 放大器（ups /api/enhance），无水印。503/502 时重试（冷启动）
      const enhancePayload = JSON.stringify({
        image: dataUrlRaw,
        scale: 2,
        denoise: 50,
      });
      const maxRetries = 3;
      let enhanceResp: Response | null = null;
      let enhanceText = '';
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        enhanceResp = await fetch(`${opencvBase}/api/enhance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: enhancePayload,
        });
        enhanceText = await enhanceResp.text();
        if (enhanceResp.status === 503 || enhanceResp.status === 502 || enhanceResp.status === 504) {
          if (attempt < maxRetries - 1) {
            await new Promise((r) => setTimeout(r, 3000));
            continue;
          }
          throw new Error(
            'OpenCV 服务暂时不可用（可能正在启动），请稍后重试。如持续出现，请在 CloudBase 将云托管最小实例数设为 1。',
          );
        }
        break;
      }
      let enhanceJson: any = {};
      try {
        enhanceJson = enhanceText ? JSON.parse(enhanceText) : {};
      } catch {
        throw new Error(`OpenCV enhance invalid response: ${enhanceText.slice(0, 200)}`);
      }
      if (!enhanceResp!.ok || !enhanceJson?.success) {
        throw new Error(
          `OpenCV enhance failed (${enhanceResp!.status}): ${enhanceJson?.message ?? enhanceText.slice(0, 200)}`,
        );
      }
      const enhancedDataUrl = enhanceJson?.enhanced_image as string | undefined;
      if (!enhancedDataUrl || typeof enhancedDataUrl !== 'string') {
        throw new Error('OpenCV enhance missing enhanced_image');
      }
      const outBase64 = enhancedDataUrl.includes(',') ? enhancedDataUrl.split(',')[1]! : enhancedDataUrl;
      outBuf = Buffer.from(outBase64, 'base64');
    } else {
      // 未配置 OpenCV 时回退 Upscayl（线上可用，带水印）
      const apiKey = process.env.UPSCAYL_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error:
            'Configure LOCAL_UPS_ENDPOINT or CLOUD_UPSCALE_URL for OpenCV, or UPSCAYL_API_KEY for fallback',
        });
      }
      const { runUpscayl2K } = await import('../lib/upscayl.js');
      const { downloadUrl } = await runUpscayl2K(inputBuf, fileType, originalFileName, apiKey);
      const outResp = await fetch(downloadUrl);
      if (!outResp.ok) throw new Error('Failed to download upscaled image');
      outBuf = Buffer.from(await outResp.arrayBuffer());
    }

    // 统一：2K 图上传 COS 2KUSERS/，返回 url（与本地同一流程）
    if (!outBuf.byteLength) throw new Error('Empty upscaled image');
    const outMime = 'image/jpeg';

    const Bucket = process.env.COS_BUCKET;
    const Region = process.env.COS_REGION;
    if (!Bucket || !Region) throw new Error('COS_BUCKET or COS_REGION is not configured');

    const baseName = originalFileName.replace(/\.[a-z0-9]+$/i, '');
    const finalName = `${baseName}.jpg`;
    const Key = `2KUSERS/${finalName}`;

    const cos = await getCosClient();
    await new Promise<void>((resolve, reject) => {
      cos.putObject(
        {
          Bucket,
          Region,
          Key,
          Body: outBuf,
          ContentType: outMime,
        },
        (err: unknown) => {
          if (err) return reject(err);
          resolve();
        },
      );
    });

    const url = `https://${Bucket}.cos.${Region}.myqcloud.com/${Key}`;
    return res.status(200).json({ ok: true, url });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: `Upscale failed: ${message}` });
  }
}

