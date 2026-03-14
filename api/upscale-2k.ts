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

  const cloudUrlRaw = process.env.CLOUD_UPSCALE_URL;
  if (!cloudUrlRaw) return res.status(500).json({ error: 'CLOUD_UPSCALE_URL is not configured' });
  const cloudUrl = cloudUrlRaw.replace(/\/+$/, '');

  const dataUrlRaw = (req.body as any).dataUrl;
  const fileNameRaw = (req.body as any).fileName;

  if (!isNonEmptyString(dataUrlRaw)) return res.status(400).json({ error: 'Missing dataUrl' });
  if (!isNonEmptyString(fileNameRaw)) return res.status(400).json({ error: 'Missing fileName' });

  const parsed = parseDataUrl(dataUrlRaw);
  if (!parsed) return res.status(400).json({ error: 'Invalid data URL format' });

  if (!parsed.base64 || !parsed.base64.length) return res.status(400).json({ error: 'Empty image' });

  const originalFileName = sanitizeFileName(String(fileNameRaw));

  try {
    // 1) 调用 CloudBase 云托管的 Real-ESRGAN 服务做无水印超分
    const upscaleResp = await fetch(`${cloudUrl}/upscale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: parsed.base64,
        scale: 2,
      }),
    });
    const upscaleText = await upscaleResp.text();
    let upscaleJson: any = {};
    try {
      upscaleJson = upscaleText ? JSON.parse(upscaleText) : {};
    } catch {
      throw new Error(`Cloud upscale invalid response: ${upscaleText.slice(0, 200)}`);
    }
    if (!upscaleResp.ok) {
      throw new Error(`Cloud upscale failed (${upscaleResp.status}): ${upscaleText.slice(0, 200)}`);
    }
    const imageBase64 = upscaleJson?.imageBase64 as string | undefined;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new Error('Cloud upscale missing imageBase64');
    }

    // 2) 将返回的 2K base64 上传到 COS：2KUSERS/ 同名 jpg
    const outBuf = Buffer.from(imageBase64, 'base64');
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

