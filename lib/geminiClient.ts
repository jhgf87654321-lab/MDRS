export type GeminiInlineData = {
  data: string;
  mimeType: string;
};

export type GeminiPart =
  | { text: string }
  | {
      inlineData: GeminiInlineData;
    };

export type GeminiImageModel = 'gemini-2.5-flash-image' | 'gemini-3.1-flash-image-preview';

type PromptRequest = {
  prompt: string;
  model?: GeminiImageModel;
  imageUrls?: string[];
};

type PartsRequest = {
  parts: GeminiPart[];
  model?: GeminiImageModel;
};

export async function generateGeminiImage(input: PromptRequest | PartsRequest) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const text = await res.text();
  let data: { image?: string; error?: string } = {};
  try {
    data = (text ? (JSON.parse(text) as { image?: string; error?: string }) : {}) ?? {};
  } catch {
    // non-JSON responses (e.g. Vercel 500 plaintext)
    throw new Error(res.ok ? 'Generation failed: invalid response' : `Generation failed: ${text.slice(0, 120)}`);
  }

  if (!res.ok) {
    const msg = data.error || 'Generation failed';
    const e = new Error(msg);
    (e as any).status = res.status;
    throw e;
  }

  if (!data.image) throw new Error('No image generated');
  return data.image;
}

