import COS from 'cos-nodejs-sdk-v5';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseDataUrl(dataUrl: string) {
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mimeType = match[1]!;
  const base64 = match[2]!;
  return { mimeType, base64 };
}

function getExtension(mimeType: string) {
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'bin';
}

function getCosClient() {
  const SecretId = process.env.COS_SECRET_ID;
  const SecretKey = process.env.COS_SECRET_KEY;
  if (!SecretId || !SecretKey) throw new Error('COS_SECRET_ID or COS_SECRET_KEY is not configured');
  return new COS({ SecretId, SecretKey });
}

export default async function handler(
  req: { method?: string; body?: unknown },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (data: object) => void; end: () => void };
  },
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body as { dataUrl?: unknown } | undefined;
  const dataUrlRaw = body?.dataUrl;
  if (!isNonEmptyString(dataUrlRaw)) {
    return res.status(400).json({ error: 'Missing or invalid dataUrl' });
  }

  const parsed = parseDataUrl(dataUrlRaw);
  if (!parsed) return res.status(400).json({ error: 'Invalid data URL format' });

  try {
    const Bucket = process.env.COS_BUCKET;
    const Region = process.env.COS_REGION;
    if (!Bucket || !Region) throw new Error('COS_BUCKET or COS_REGION is not configured');

    const buffer = Buffer.from(parsed.base64, 'base64');
    const ext = getExtension(parsed.mimeType);
    const prefix = process.env.COS_UPLOAD_PREFIX || 'share-posts/';
    const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    const Key = `${prefix}${fileName}`;

    const cos = getCosClient();
    await new Promise<void>((resolve, reject) => {
      cos.putObject(
        {
          Bucket,
          Region,
          Key,
          Body: buffer,
          ContentType: parsed.mimeType,
        },
        (err) => {
          if (err) return reject(err);
          resolve();
        },
      );
    });

    const url = `https://${Bucket}.cos.${Region}.myqcloud.com/${Key}`;
    return res.status(200).json({ ok: true, url });
  } catch (e) {
    console.error('Upload image failed', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: `Upload failed: ${message}` });
  }
}

