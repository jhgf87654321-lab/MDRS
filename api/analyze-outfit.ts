import { GoogleGenAI } from '@google/genai';
import { handleCorsPreflightIfNeeded } from '../lib/api-cors.js';

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
  req: { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (data: object) => void; end: () => void };
  },
) {
  if (handleCorsPreflightIfNeeded(req, res)) return;
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
    'You are a fashion analyst. Extract ALL visible outfit pieces from the image.\n\n' +
    'You MUST always return these three: top (上装), bottom (下装), shoes (鞋履). Shoes have no outer/inner—only one "shoes" object.\n' +
    'For the upper body only: if there is an outer layer (外搭, e.g. coat, jacket, blazer) and/or inner layer (内搭, e.g. shirt, tee under the jacket), add "outer" and/or "inner" with the same { colors, style, material } shape. Do not add outer/inner for bottom or shoes.\n\n' +
    'Return ONLY valid JSON with this structure (no extra keys):\n' +
    '{\n' +
    '  "top": { "colors": ["color1"], "style": "e.g. T-shirt", "material": "e.g. cotton" },\n' +
    '  "bottom": { "colors": ["color1"], "style": "e.g. pants", "material": "e.g. denim" },\n' +
    '  "shoes": { "colors": ["color1"], "style": "e.g. sneakers", "material": "e.g. leather" },\n' +
    '  "outer": { "colors", "style", "material" } or omit if no outer layer,\n' +
    '  "inner": { "colors", "style", "material" } or omit if no inner layer,\n' +
    '  "notes": ""\n' +
    '}\n' +
    'Rules: top/bottom/shoes always present. outer/inner only for upper body, optional. Use simple color words; "" and [] when unknown.';

  const ai = new GoogleGenAI({ apiKey });
  // Use vision-capable models available in current API; avoid deprecated "gemini-1.5-flash" (404 in v1beta).
  const models = [
    (process.env.OUTFIT_MODEL || '').trim(),
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash-latest',
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
        const hasTop = json.top && typeof json.top === 'object';
        const hasBottom = json.bottom && typeof json.bottom === 'object';
        const hasShoes = json.shoes && typeof json.shoes === 'object';
        if (hasTop && hasBottom && hasShoes) {
          return res.status(200).json({ ok: true, info: json });
        }
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

