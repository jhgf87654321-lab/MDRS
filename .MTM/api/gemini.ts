import { GoogleGenAI } from '@google/genai';
import { handleCorsPreflightIfNeeded } from '../lib/api-cors.js';

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
  req: { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (data: object) => void; end: () => void };
  }
) {
  if (handleCorsPreflightIfNeeded(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        'GEMINI_API_KEY is not configured. Set GEMINI_API_KEY (or GOOGLE_API_KEY) in Vercel → Environment Variables, or in .env.local when running `npx vercel dev` from this app directory.',
    });
  }

  const body = req.body;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const generateImageOnce = async (
      model: SupportedGeminiImageModel,
      parts: GeminiPart[],
    ): Promise<{ imgData: string | null; debug: { finishReason?: string; textParts?: string } }> => {
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
          return { imgData: `data:${mimeType};base64,${base64}`, debug: {} };
        }
      }

      const finishReason = (response as any)?.candidates?.[0]?.finishReason;
      const textParts = ((response as any)?.candidates?.[0]?.content?.parts || [])
        .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
        .filter(Boolean)
        .slice(0, 2)
        .join(' | ')
        .slice(0, 240);
      return { imgData: null, debug: { finishReason, textParts } };
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

      const out = await generateImageOnce(model, parts);
      const imgData = out.imgData;
      if (!imgData) {
        return res.status(500).json({
          error: `No image generated (finishReason=${out.debug.finishReason || 'unknown'}; text=${out.debug.textParts || ''})`,
        });
      }
      return res.status(200).json({ image: imgData });
    }

    const parsed = parseParts(body);
    if ('error' in parsed) {
      return res.status(parsed.status).json({ error: parsed.error });
    }

    const out = await generateImageOnce(parsed.model ?? 'gemini-2.5-flash-image', parsed.parts);
    const imgData = out.imgData;
    if (!imgData) {
      return res.status(500).json({
        error: `No image generated (finishReason=${out.debug.finishReason || 'unknown'}; text=${out.debug.textParts || ''})`,
      });
    }
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
