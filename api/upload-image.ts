import cloudbase from '@cloudbase/node-sdk';

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
    const envId = process.env.CLOUDBASE_ENV_ID;
    if (!envId) throw new Error('CLOUDBASE_ENV_ID is not configured');

    const app: any = cloudbase.init({
      envId,
      secretId: process.env.CLOUDBASE_SECRET_ID,
      secretKey: process.env.CLOUDBASE_SECRET_KEY,
    });

    const buffer = Buffer.from(parsed.base64, 'base64');
    const ext = getExtension(parsed.mimeType);
    const prefix = process.env.CLOUDBASE_UPLOAD_PREFIX || 'share-posts/';
    const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    const cloudPath = `${prefix}${fileName}`;

    const storage = app.storage();
    const uploadRes: any = await storage.uploadFile({
      cloudPath,
      fileContent: buffer,
    });

    const fileId: string | undefined = uploadRes.fileID || uploadRes.fileId;
    if (!fileId) {
      console.error('CloudBase uploadFile missing fileID', uploadRes);
      return res.status(500).json({ error: 'Upload failed (no fileID returned)' });
    }

    const urlRes: any = await storage.getTempFileURL({
      fileList: [
        {
          fileID: fileId,
          maxAge: 3600 * 24 * 365, // 1 year
        },
      ],
    });

    const tempUrl: string | undefined = urlRes.fileList?.[0]?.tempFileURL;
    if (!tempUrl) {
      console.error('CloudBase getTempFileURL missing tempFileURL', urlRes);
      return res.status(500).json({ error: 'Failed to get file URL' });
    }

    return res.status(200).json({ ok: true, url: tempUrl });
  } catch (e) {
    console.error('Upload image failed', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: `Upload failed: ${message}` });
  }
}

