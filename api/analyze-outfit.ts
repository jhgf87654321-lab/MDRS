import { GoogleGenAI } from '@google/genai';

export const config = {
  maxDuration: 60,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function stripDataUrlPrefix(dataUrl: string) {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  return { mimeType: m[1] || 'image/png', base64: m[2] };
}

async function fetchAsInlineData(url: string): Promise<{ mimeType: string; base64: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const mimeType = resp.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await resp.arrayBuffer());
    if (!buf.byteLength) return null;
    return { mimeType, base64: buf.toString('base64') };
  } catch {
    return null;
  }
}

function extractJsonObject(text: string) {
  const t = (text || '').trim();
  if (!t) return null;
  // Try fenced ```json ... ```
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(t);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // fallthrough
    }
  }
  // Try first {...} block
  const firstObj = /(\{[\s\S]*\})/.exec(t);
  if (firstObj?.[1]) {
    try {
      return JSON.parse(firstObj[1]);
    } catch {
      return null;
    }
  }
  return null;
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });

  const body = req.body;
  if (!isRecord(body)) return res.status(400).json({ error: 'Invalid JSON body' });

  const imageUrl = isNonEmptyString(body.imageUrl) ? body.imageUrl : '';
  const imageDataUrl = isNonEmptyString(body.imageDataUrl) ? body.imageDataUrl : '';

  const inline =
    imageDataUrl && imageDataUrl.startsWith('data:')
      ? stripDataUrlPrefix(imageDataUrl)
      : imageUrl && /^https?:\/\//i.test(imageUrl)
        ? await fetchAsInlineData(imageUrl)
        : null;

  if (!inline) return res.status(400).json({ error: 'Missing or invalid imageUrl/imageDataUrl' });

  const prompt =
    'You are a fashion analyst. Extract the outfit attributes from the image.\n' +
    'Return ONLY valid JSON matching this schema:\n' +
    '{\n' +
    '  "top": { "colors": string[], "style": string, "material": string },\n' +
    '  "bottom": { "colors": string[], "style": string, "material": string },\n' +
    '  "shoes": { "colors": string[], "style": string, "material": string },\n' +
    '  "notes": string\n' +
    '}\n' +
    'Rules: colors should be simple color words; if unknown, use empty string for style/material and [] for colors. Do not include any extra keys.';

  const ai = new GoogleGenAI({ apiKey });
  const models = [
    (process.env.OUTFIT_MODEL || '').trim(),
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ].filter(Boolean);

  let lastText = '';
  let lastErr: unknown = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            { inlineData: { data: inline.base64, mimeType: inline.mimeType } } as any,
            { text: prompt },
          ],
        },
      });
      const text = ((response as any)?.candidates?.[0]?.content?.parts || [])
        .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
        .filter(Boolean)
        .join('\n')
        .trim();
      lastText = text;
      const json = extractJsonObject(text);
      if (json && typeof json === 'object') {
        return res.status(200).json({ ok: true, info: json });
      }
    } catch (e) {
      lastErr = e;
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : 'Unknown error';
  return res.status(500).json({
    error: 'Outfit analysis failed',
    detail: msg,
    sample: (lastText || '').slice(0, 400),
  });
}

