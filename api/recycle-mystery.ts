// Purchase a mystery NFT by randomly selecting an image from COS CYCLER/
// and copying it back to MINT/ or SP/ according to the original serial.

import { handleCorsPreflightIfNeeded } from '../lib/api-cors.js';

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

function pickOne<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function parseSerialFromKey(key: string): { serialNumber: string; isSpecial: boolean } {
  const base = key.split('/').pop() || '';
  const m = /(Sp\.\d+|No\.\d+)/i.exec(base);
  if (m?.[1]) {
    const raw = m[1];
    const normalized = raw.startsWith('sp.') ? `Sp.${raw.slice(3)}` : raw.startsWith('no.') ? `No.${raw.slice(3)}` : raw;
    const isSpecial = normalized.startsWith('Sp.');
    return { serialNumber: normalized, isSpecial };
  }
  // Fallback：没有命名信息时当作普通 No.
  const tail = Date.now().toString().slice(-8);
  return { serialNumber: `No.${tail}`, isSpecial: false };
}

export default async function handler(
  req: { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (data: object) => void; end: () => void };
  },
) {
  if (handleCorsPreflightIfNeeded(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const Bucket = process.env.COS_BUCKET;
  const Region = process.env.COS_REGION;
  if (!Bucket || !Region) return res.status(500).json({ error: 'COS_BUCKET or COS_REGION is not configured' });
  const bucket = Bucket;
  const region = Region;

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
    const keys: string[] = contents
      .map((item: any) => String(item.Key || ''))
      .filter((key: string) => key.startsWith(Prefix))
      .filter((key: string) => /\.(png|jpe?g|webp)$/i.test(key));

    if (keys.length === 0) return res.status(404).json({ error: 'No cycler images found' });
    const srcKey = pickOne(keys);
    const { serialNumber, isSpecial } = parseSerialFromKey(srcKey);
    const targetPrefix = isSpecial ? 'SP/' : 'MINT/';
    const ext = (/\.(png|jpe?g|webp)$/i.exec(srcKey)?.[1] || 'webp').toLowerCase();
    const fileName = `${serialNumber.replace(/\./g, '_')}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const dstKey = `${targetPrefix}${fileName}`;

    const encodedSrcKey = srcKey.split('/').map((seg) => encodeURIComponent(seg)).join('/');
    const CopySource = `${bucket}.cos.${region}.myqcloud.com/${encodedSrcKey}`;

    await new Promise<void>((resolve, reject) => {
      cos.putObjectCopy(
        {
          Bucket: bucket,
          Region: region,
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

    const url = `https://${bucket}.cos.${region}.myqcloud.com/${dstKey}`;
    return res.status(200).json({ ok: true, serialNumber, isSpecial, url, key: dstKey, sourceKey: srcKey });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: `Recycle purchase failed: ${message}` });
  }
}

