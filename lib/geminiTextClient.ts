import type { GeminiPart } from './geminiClient';

export async function generateGeminiText(input: { parts: GeminiPart[]; model?: string }) {
  const res = await fetch('/api/gemini-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const text = await res.text();
  let data: { text?: string; error?: string } = {};
  try {
    data = (text ? (JSON.parse(text) as { text?: string; error?: string }) : {}) ?? {};
  } catch {
    throw new Error(res.ok ? 'Text generation failed: invalid response' : `Text generation failed: ${text.slice(0, 120)}`);
  }

  if (data.error) {
    const e = new Error(data.error);
    (e as any).status = res.status;
    throw e;
  }

  if (!res.ok) {
    const msg = data.error || 'Text generation failed';
    const e = new Error(msg);
    (e as any).status = res.status;
    throw e;
  }

  if (!data.text?.trim()) {
    throw new Error(`No text returned (status ${res.status}): ${text.slice(0, 200)}`);
  }
  return data.text.trim();
}
