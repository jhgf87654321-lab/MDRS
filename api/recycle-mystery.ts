// Purchase a mystery NFT by randomly selecting an image from COS CYCLER/
// and copying it into MINT/ (normal) or SP/ (special).

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

async function getCosClient() {
  const SecretId = process.env.COS_SECRET_ID;
  const SecretKey = process.env.COS_SECRET_KEY;
  if (!SecretId || !SecretKey) throw new Error('COS_SECRET_ID or COS_SECRET_KEY is not configured');
  const mod = await import('cos-nodejs-sdk-v5');
  const COS = (mod as unknown as { default: new (opts: { SecretId: string; SecretKey: string }) => any }).default;
  return new COS({ SecretId, SecretKey });
}

function pickOne<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeSerial(isSpecial: boolean) {
  const tail = (Date.now().toString().slice(-8) + Math.random().toString(16).slice(2, 6)).slice(0, 8);
  return isSpecial ? `Sp.${tail.slice(-5)}` : `No.${tail}`;
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

  const Bucket = process.env.COS_BUCKET;
  const Region = process.env.COS_REGION;
  if (!Bucket || !Region) return res.status(500).json({ error: 'COS_BUCKET or COS_REGION is not configured' });

  const isSpecial = Math.random() < 0.1;
  const serialNumber = makeSerial(isSpecial);
  const targetPrefix = isSpecial ? 'SP/' : 'MINT/';

  try {
    const cos = await getCosClient();
    const Prefix = 'CYCLER/';

    const data: unknown = await new Promise((resolve, reject) => {
      cos.getBucket(
        {
          Bucket,
          Region,
          Prefix,
          MaxKeys: 200,
        },
        (err: unknown, result: unknown) => {
          if (err) return reject(err);
          resolve(result);
        },
      );
    });

    const contents = isRecord(data) && Array.isArray((data as any).Contents) ? (data as any).Contents : [];
    const keys = contents
      .map((item: any) => String(item.Key || ''))
      .filter((key: string) => key.startsWith(Prefix))
      .filter((key: string) => /\.(png|jpe?g|webp)$/i.test(key));

    if (keys.length === 0) return res.status(404).json({ error: 'No cycler images found' });
    const srcKey = pickOne(keys);
    const ext = (/\.(png|jpe?g|webp)$/i.exec(srcKey)?.[1] || 'webp').toLowerCase();
    const fileName = `${serialNumber.replace(/\./g, '_')}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const dstKey = `${targetPrefix}${fileName}`;

    const CopySource = `${Bucket}.cos.${Region}.myqcloud.com/${encodeURIComponent(srcKey)}`;

    await new Promise<void>((resolve, reject) => {
      cos.putObjectCopy(
        {
          Bucket,
          Region,
          Key: dstKey,
          CopySource,
          MetadataDirective: 'Copy',
        },
        (err: unknown) => {
          if (err) return reject(err);
          resolve();
        },
      );
    });

    const url = `https://${Bucket}.cos.${Region}.myqcloud.com/${dstKey}`;
    return res.status(200).json({ ok: true, serialNumber, isSpecial, url, key: dstKey, sourceKey: srcKey });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: `Recycle purchase failed: ${message}` });
  }
}

