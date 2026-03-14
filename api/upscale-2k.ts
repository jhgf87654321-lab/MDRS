import crypto from 'node:crypto';

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

const UPSCAYL_BASE = 'https://api.upscayl.org';

async function upscaylJson(path: string, apiKey: string, body: unknown) {
  const res = await fetch(`${UPSCAYL_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Upscayl ${path} invalid response: ${text.slice(0, 160)}`);
  }
  if (!res.ok) {
    const msg = typeof data?.error === 'string' ? data.error : text.slice(0, 200);
    throw new Error(`Upscayl ${path} failed (${res.status}): ${msg}`);
  }
  return data;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isRecord(req.body)) return res.status(400).json({ error: 'Invalid JSON body' });

  const apiKey = process.env.UPSCAYL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'UPSCAYL_API_KEY is not configured' });

  const dataUrlRaw = (req.body as any).dataUrl;
  const fileNameRaw = (req.body as any).fileName;

  if (!isNonEmptyString(dataUrlRaw)) return res.status(400).json({ error: 'Missing dataUrl' });
  if (!isNonEmptyString(fileNameRaw)) return res.status(400).json({ error: 'Missing fileName' });

  const parsed = parseDataUrl(dataUrlRaw);
  if (!parsed) return res.status(400).json({ error: 'Invalid data URL format' });

  const inputBuf = Buffer.from(parsed.base64, 'base64');
  if (!inputBuf.byteLength) return res.status(400).json({ error: 'Empty image' });

  const originalFileName = sanitizeFileName(String(fileNameRaw));
  const fileType = parsed.mimeType;
  const fileSize = inputBuf.byteLength;

  try {
    // 1) Get multipart upload URLs
    const uploadInfo = await upscaylJson('/get-upload-url', apiKey, {
      data: { fileSize, fileType, originalFileName },
    });
    const uploadData = uploadInfo?.data;
    const uploadId = uploadData?.uploadId as string | undefined;
    const partUrls = uploadData?.partUrls as Array<{ partNumber: number; signedUrl: string }> | undefined;
    const partSize = uploadData?.partSize as number | undefined;
    const path = uploadData?.path as string | undefined;
    const generatedFileName = uploadData?.fileName as string | undefined;
    if (!uploadId || !Array.isArray(partUrls) || !partUrls.length || !partSize || !path) {
      throw new Error('Upscayl get-upload-url missing fields');
    }

    // 2) Upload parts
    const parts: Array<{ PartNumber: number; ETag: string }> = [];
    for (const p of partUrls) {
      const start = (p.partNumber - 1) * partSize;
      const end = Math.min(start + partSize, inputBuf.length);
      const chunk = inputBuf.subarray(start, end);
      const putRes = await fetch(p.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': fileType },
        body: chunk,
      });
      if (!putRes.ok) {
        const t = await putRes.text();
        throw new Error(`Upscayl upload part ${p.partNumber} failed: ${t.slice(0, 160)}`);
      }
      const etag = putRes.headers.get('etag') || putRes.headers.get('ETag');
      if (!etag) throw new Error(`Upscayl upload part ${p.partNumber} missing ETag`);
      parts.push({ PartNumber: p.partNumber, ETag: etag });
    }

    // 3) Complete multipart upload
    await upscaylJson('/complete-multipart-upload', apiKey, {
      data: {
        uploadId,
        key: path,
        parts,
      },
    });

    // 4) Start task using uploaded file reference
    const files = [
      {
        fileName: generatedFileName || crypto.randomUUID(),
        fileType,
        fileSize,
        originalFileName,
        path,
      },
    ];

    const form = new FormData();
    form.set('enhanceFace', 'false');
    form.set('model', 'upscayl-lite-4x');
    form.set('scale', '2');
    form.set('saveImageAs', 'jpg');
    form.set('files', JSON.stringify(files));

    const startRes = await fetch(`${UPSCAYL_BASE}/start-task`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: form as any,
    });
    const startText = await startRes.text();
    let startJson: any = {};
    try {
      startJson = startText ? JSON.parse(startText) : {};
    } catch {
      throw new Error(`Upscayl start-task invalid response: ${startText.slice(0, 160)}`);
    }
    if (!startRes.ok) {
      throw new Error(`Upscayl start-task failed (${startRes.status}): ${startText.slice(0, 200)}`);
    }
    const taskId = startJson?.data?.taskId as string | undefined;
    if (!taskId) throw new Error('Upscayl start-task missing taskId');

    // 5) Poll task status
    const deadline = Date.now() + 110_000;
    let downloadUrl: string | null = null;
    while (Date.now() < deadline) {
      const st = await upscaylJson('/get-task-status', apiKey, { data: { taskId } });
      const s = st?.data?.status as string | undefined;
      if (s === 'PROCESSED') {
        const filesOut = st?.data?.files;
        const first = Array.isArray(filesOut) ? filesOut[0] : null;
        const url = first?.downloadUrl;
        if (typeof url === 'string' && url.startsWith('http')) {
          downloadUrl = url;
          break;
        }
      }
      if (s === 'PROCESSING_FAILED') {
        throw new Error('Upscayl processing failed');
      }
      // small backoff
      await new Promise((r) => setTimeout(r, 1200));
    }
    if (!downloadUrl) throw new Error('Upscayl timeout waiting for 2K result');

    // 6) Download result and upload to COS under 2KUSERS/ with same base name
    const outResp = await fetch(downloadUrl);
    if (!outResp.ok) throw new Error('Failed to download upscaled image');
    const outMime = outResp.headers.get('content-type') || 'image/jpeg';
    const outBuf = Buffer.from(await outResp.arrayBuffer());
    if (!outBuf.byteLength) throw new Error('Empty upscaled image');

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
    return res.status(200).json({ ok: true, url, taskId });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: `Upscale failed: ${message}` });
  }
}

