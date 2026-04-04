// List regular recycle images from COS CYCLER/ folder

import { handleCorsPreflightIfNeeded } from '../lib/api-cors.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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
  req: { method?: string; headers?: Record<string, string | string[] | undefined> },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (data: object) => void; end: () => void };
  },
) {
  if (handleCorsPreflightIfNeeded(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const Bucket = process.env.COS_BUCKET;
  const Region = process.env.COS_REGION;
  if (!Bucket || !Region) return res.status(500).json({ error: 'COS_BUCKET or COS_REGION is not configured' });

  try {
    const cos = await getCosClient();
    const Prefix = 'CYCLER/';

    const data: unknown = await new Promise((resolve, reject) => {
      cos.getBucket(
        {
          Bucket,
          Region,
          Prefix,
          MaxKeys: 30,
        },
        (err: unknown, result: unknown) => {
          if (err) return reject(err);
          resolve(result);
        },
      );
    });

    const contents = isRecord(data) && Array.isArray((data as any).Contents) ? (data as any).Contents : [];
    const images = contents
      .map((item: any) => String(item.Key || ''))
      .filter((key: string) => key.startsWith(Prefix))
      .filter((key: string) => /\.(png|jpe?g|webp)$/i.test(key))
      .sort()
      .map((key: string) => `https://${Bucket}.cos.${Region}.myqcloud.com/${key}`);

    return res.status(200).json({ ok: true, images });
  } catch (e) {
    console.error('List cycler images failed', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: `Failed to list images: ${message}` });
  }
}

