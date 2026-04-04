// 模特卡 COS：MODELCARD/ 下 00000.png 起递增序号（列举前缀取最大序号 + 1）
process.noDeprecation = true;

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

function getExtension(mimeType: string) {
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'png';
}

async function getCosClient() {
  const SecretId = process.env.COS_SECRET_ID;
  const SecretKey = process.env.COS_SECRET_KEY;
  if (!SecretId || !SecretKey) throw new Error('COS_SECRET_ID or COS_SECRET_KEY is not configured');
  const mod = await import('cos-nodejs-sdk-v5');
  const COS = (mod as unknown as { default: new (opts: { SecretId: string; SecretKey: string }) => any }).default;
  return new COS({ SecretId, SecretKey });
}

const PREFIX = 'MODELCARD/';

function parseSeqFromKey(key: string): number | null {
  const base = key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key;
  const m = /^(\d{5})\.(png|jpg|jpeg|webp|bin)$/i.exec(base);
  if (!m) return null;
  return parseInt(m[1]!, 10);
}

async function getNextSeq(cos: any, Bucket: string, Region: string): Promise<number> {
  let max = -1;
  let Marker: string | undefined;
  const maxPages = 50;
  for (let page = 0; page < maxPages; page += 1) {
    const data: any = await new Promise((resolve, reject) => {
      cos.getBucket(
        {
          Bucket,
          Region,
          Prefix: PREFIX,
          MaxKeys: 1000,
          Marker,
        },
        (err: Error | null, d: unknown) => {
          if (err) return reject(err);
          resolve(d);
        },
      );
    });
    for (const c of data?.Contents || []) {
      const key = typeof c?.Key === 'string' ? c.Key : '';
      const n = parseSeqFromKey(key);
      if (n !== null) max = Math.max(max, n);
    }
    if (!data?.IsTruncated || !data?.NextMarker) break;
    Marker = data.NextMarker;
  }
  return max + 1;
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
  if (!isNonEmptyString(dataUrlRaw)) return res.status(400).json({ error: 'Missing or invalid dataUrl' });

  const parsed = parseDataUrl(dataUrlRaw);
  if (!parsed) return res.status(400).json({ error: 'Invalid data URL format' });

  try {
    const Bucket = process.env.COS_BUCKET;
    const Region = process.env.COS_REGION;
    if (!Bucket || !Region) throw new Error('COS_BUCKET or COS_REGION is not configured');

    const cos = await getCosClient();
    const seq = await getNextSeq(cos, Bucket, Region);
    const ext = getExtension(parsed.mimeType);
    const fileName = `${String(seq).padStart(5, '0')}.${ext}`;
    const Key = `${PREFIX}${fileName}`;
    const buffer = Buffer.from(parsed.base64, 'base64');

    await new Promise<void>((resolve, reject) => {
      cos.putObject(
        {
          Bucket,
          Region,
          Key,
          Body: buffer,
          ContentType: parsed.mimeType,
        },
        (err: Error | null) => {
          if (err) return reject(err);
          resolve();
        },
      );
    });

    const url = `https://${Bucket}.cos.${Region}.myqcloud.com/${Key}`;
    return res.status(200).json({ ok: true, url, seq, fileName, key: Key });
  } catch (e) {
    console.error('mtm-modelcard-upload failed', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: `Upload failed: ${message}` });
  }
}
