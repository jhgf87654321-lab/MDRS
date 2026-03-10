import { GoogleGenAI } from '@google/genai';

export const config = {
  maxDuration: 60,
};

type InlineDataPart = { inlineData: { data: string; mimeType: string } };
type TextPart = { text: string };
type GeminiPart = InlineDataPart | TextPart;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseParts(body: unknown): { parts: GeminiPart[] } | { error: string; status: number } {
  if (!isRecord(body)) return { error: 'Invalid JSON body', status: 400 };

  const rawParts = body.parts;
  const rawPrompt = body.prompt;

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
    return { parts };
  }

  if (isNonEmptyString(rawPrompt)) {
    return { parts: [{ text: rawPrompt }] };
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

  const parsed = parseParts(req.body);
  if ('error' in parsed) {
    return res.status(parsed.status).json({ error: parsed.error });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parsed.parts,
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64 = part.inlineData.data;
        const imgData = `data:image/png;base64,${base64}`;
        return res.status(200).json({ image: imgData });
      }
    }

    return res.status(500).json({ error: 'No image generated' });
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
