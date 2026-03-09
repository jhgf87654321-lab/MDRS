export type GeminiInlineData = {
  data: string;
  mimeType: string;
};

export type GeminiPart =
  | { text: string }
  | {
      inlineData: GeminiInlineData;
    };

export async function generateGeminiImage(input: { prompt: string } | { parts: GeminiPart[] }) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const data = (await res.json()) as { image?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Generation failed');
  }
  if (!data.image) {
    throw new Error('No image generated');
  }
  return data.image;
}

