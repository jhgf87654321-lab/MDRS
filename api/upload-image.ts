// Suppress Node.js deprecation warnings originating from legacy deps (e.g. url.parse()).
// This must run before the SDK is loaded, so we use a dynamic import.
process.noDeprecation = true;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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

function sanitizeFileName(name: string) {
  const trimmed = name.trim().slice(0, 120);
  // Keep alphanum, dot, dash, underscore; replace others to underscore.
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]+/g, '_');
  // Avoid hidden files or empty names
  return safe.replace(/^_+/, '').replace(/^\.*/, '').slice(0, 120) || 'file';
}

function normalizePrefix(prefix: string) {
  let p = prefix.trim();
  if (!p) return '';
  p = p.replace(/^\/+/, '').replace(/\\/g, '/');
  if (!p.endsWith('/')) p += '/';
  return p;
}

function isAllowedPrefix(prefix: string) {
  const allowed = new Set(['share-posts/', 'aesthetic-references/', 'MINT/', 'SP/']);
  return allowed.has(prefix);
}

async function getCosClient() {
  const SecretId = process.env.COS_SECRET_ID;
  const SecretKey = process.env.COS_SECRET_KEY;
  if (!SecretId || !SecretKey) throw new Error('COS_SECRET_ID or COS_SECRET_KEY is not configured');
  const mod = await import('cos-nodejs-sdk-v5');
  const COS = (mod as unknown as { default: new (opts: { SecretId: string; SecretKey: string }) => any }).default;
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

  const body = req.body;
  if (!isRecord(body)) return res.status(400).json({ error: 'Invalid JSON body' });
  const dataUrlRaw = body.dataUrl;
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
    const requestedPrefix = isNonEmptyString(body.prefix) ? normalizePrefix(body.prefix) : '';
    const prefix = requestedPrefix || process.env.COS_UPLOAD_PREFIX || 'share-posts/';
    if (!isAllowedPrefix(prefix)) return res.status(400).json({ error: 'Invalid prefix' });

    const requestedName = isNonEmptyString(body.fileName) ? sanitizeFileName(body.fileName) : '';
    const baseName = requestedName || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const fileName = baseName.toLowerCase().endsWith(`.${ext}`) ? baseName : `${baseName}.${ext}`;
    const Key = `${prefix}${fileName}`;

    const cos = await getCosClient();
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

