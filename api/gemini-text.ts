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

function parseParts(body: unknown): { parts: GeminiPart[]; model?: string } | { error: string; status: number } {
  if (!isRecord(body)) return { error: 'Invalid JSON body', status: 400 };

  const rawParts = body.parts;
  const rawModel = body.model;

  const model = isNonEmptyString(rawModel) ? rawModel.trim() : undefined;

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

  const rawPrompt = body.prompt;
  if (isNonEmptyString(rawPrompt)) {
    return { parts: [{ text: rawPrompt }], model };
  }

  return { error: 'Missing prompt or parts[]', status: 400 };
}

function extractTextFromResponse(response: unknown): string {
  const text = (((response as any)?.candidates?.[0]?.content?.parts || []) as any[])
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();
  return text;
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

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        'GEMINI_API_KEY is not configured. Use repo root .env.local and `npm run dev:api` (see api/gemini.ts message).',
    });
  }

  const parsed = parseParts(req.body);
  if ('error' in parsed) {
    return res.status(parsed.status).json({ error: parsed.error });
  }

  const preferred = (parsed.model || '').trim();
  const modelCandidates = [preferred, 'gemini-2.5-flash', 'gemini-2.0-flash'].filter(
    (m, i, a) => m && a.indexOf(m) === i,
  );

  const ai = new GoogleGenAI({ apiKey });
  let lastErr: unknown = null;

  for (const model of modelCandidates) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts: parsed.parts as any },
      });
      const text = extractTextFromResponse(response);
      if (text) return res.status(200).json({ text });
      lastErr = new Error('Empty model text');
    } catch (e) {
      lastErr = e;
    }
  }

  const message = lastErr instanceof Error ? lastErr.message : 'Unknown error';
  return res.status(500).json({ error: `Text generation failed: ${message}` });
}
