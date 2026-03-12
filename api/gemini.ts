import { GoogleGenAI } from '@google/genai';

export const config = {
  maxDuration: 60,
};

type InlineDataPart = { inlineData: { data: string; mimeType: string } };
type TextPart = { text: string };
type GeminiPart = InlineDataPart | TextPart;
type SupportedGeminiImageModel = 'gemini-2.5-flash-image' | 'gemini-3.1-flash-image-preview';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseParts(
  body: unknown,
): { parts: GeminiPart[]; model?: SupportedGeminiImageModel } | { error: string; status: number } {
  if (!isRecord(body)) return { error: 'Invalid JSON body', status: 400 };

  const rawParts = body.parts;
  const rawPrompt = body.prompt;
  const rawModel = body.model;

  const model: SupportedGeminiImageModel | undefined =
    rawModel === 'gemini-2.5-flash-image' || rawModel === 'gemini-3.1-flash-image-preview' ? rawModel : undefined;

  if (Array.isArray(rawParts)) {
    const parts: GeminiPart[] = [];
    for (const p of rawParts) {
      if (!isRecord(p)) return { error: 'Invalid parts[] element', status: 400 };

      if ('text' in p) {
        if (!isNonEmptyString(p.text)) return { error: 'Invalid parts[] text', status: 400 };
        parts.push({ text: p.text });
        continue;
      }

      if ('inlineData' in p) {
        const inlineData = p.inlineData;
        if (!isRecord(inlineData)) return { error: 'Invalid parts[] inlineData', status: 400 };
        if (!isNonEmptyString(inlineData.data)) return { error: 'Invalid inlineData.data', status: 400 };
        if (!isNonEmptyString(inlineData.mimeType)) return { error: 'Invalid inlineData.mimeType', status: 400 };
        parts.push({ inlineData: { data: inlineData.data, mimeType: inlineData.mimeType } });
        continue;
      }

      return { error: 'parts[] element must contain text or inlineData', status: 400 };
    }

    if (parts.length === 0) return { error: 'parts[] must not be empty', status: 400 };
    return { parts, model };
  }

  if (isNonEmptyString(rawPrompt)) {
    return { parts: [{ text: rawPrompt }], model };
  }

  return { error: 'Missing prompt or parts[]', status: 400 };
}

export default async function handler(
  req: { method?: string; body?: unknown },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (data: object) => void; end: () => void };
  }
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  const body = req.body;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const generateImageOnce = async (model: SupportedGeminiImageModel, parts: GeminiPart[]) => {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts,
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        const inline = (part as any).inlineData ?? (part as any).inline_data;
        const base64 = inline?.data;
        const mimeType = inline?.mimeType || inline?.mime_type || 'image/png';
        if (typeof base64 === 'string' && base64.length > 0) {
          return `data:${mimeType};base64,${base64}`;
        }
      }

      return null;
    };

    // Special path: imageUrls + prompt (used by TryOn with COS URLs)
    if (isRecord(body) && Array.isArray(body.imageUrls) && body.imageUrls.length > 0) {
      const urls = body.imageUrls.filter(isNonEmptyString) as string[];
      if (urls.length === 0) return res.status(400).json({ error: 'imageUrls must contain non-empty strings' });

      const rawModel = body.model;
      const model: SupportedGeminiImageModel =
        rawModel === 'gemini-3.1-flash-image-preview' || rawModel === 'gemini-2.5-flash-image'
          ? rawModel
          : 'gemini-2.5-flash-image';

      const promptText = isNonEmptyString(body.prompt) ? body.prompt : '';

      const fetchImageAsInline = async (url: string): Promise<InlineDataPart | null> => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const resp = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          if (!resp.ok) return null;
          const mime = resp.headers.get('content-type') || 'image/jpeg';
          const buf = Buffer.from(await resp.arrayBuffer());
          if (!buf.byteLength) return null;
          return { inlineData: { data: buf.toString('base64'), mimeType: mime } };
        } catch {
          return null;
        }
      };

      const inlineParts: GeminiPart[] = [];
      for (const url of urls) {
        const p = await fetchImageAsInline(url);
        if (p) inlineParts.push(p);
      }
      if (inlineParts.length === 0) {
        return res.status(400).json({ error: 'Failed to load any imageUrls' });
      }

      const parts: GeminiPart[] = [...inlineParts];
      if (promptText) parts.push({ text: promptText });

      const imgData = await generateImageOnce(model, parts);
      if (!imgData) return res.status(500).json({ error: 'No image generated' });
      return res.status(200).json({ image: imgData });
    }

    const parsed = parseParts(body);
    if ('error' in parsed) {
      return res.status(parsed.status).json({ error: parsed.error });
    }

    const imgData = await generateImageOnce(parsed.model ?? 'gemini-2.5-flash-image', parsed.parts);
    if (!imgData) return res.status(500).json({ error: 'No image generated' });
    return res.status(200).json({ image: imgData });
  } catch (err) {
    console.error('Gemini API error:', err);
    const anyErr = err as { status?: number; message?: string } | undefined;
    const status = typeof anyErr?.status === 'number' ? anyErr.status : 500;
    const message = err instanceof Error ? err.message : anyErr?.message || 'Unknown error';

    if (status === 429 || message.includes('"status":"RESOURCE_EXHAUSTED"') || message.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({
        error:
          'Generation failed: Gemini quota exhausted (429 RESOURCE_EXHAUSTED). Please wait and try again, or upgrade your plan/API quota.',
      });
    }

    return res.status(500).json({ error: `Generation failed: ${message}` });
  }
}
