import { generateGeminiText } from '@nftt/lib/geminiTextClient';

/** 含中日韩等需翻译的字符 */
const NEEDS_TRANSLATE = /[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]/;

/**
 * 若查询含中文等，则译为简洁英文再搜 MODELFILE.keywords（库内多为英文 prompt）。
 * API 失败时回退原文。
 */
export async function translateSearchKeywordIfChinese(raw: string): Promise<string> {
  const t = raw.trim();
  if (!t || !NEEDS_TRANSLATE.test(t)) return t;
  try {
    const out = await generateGeminiText({
      parts: [
        {
          text: `Translate into concise English search keywords for matching fashion/model image metadata (stored keywords are usually English). Output a single line only: English terms only, no quotes, labels, or explanation.\n\nUser query:\n${t}`,
        },
      ],
    });
    const cleaned = out
      .split('\n')[0]!
      .replace(/^[\s"'「『【]+|[\s"'」』】]+$/g, '')
      .trim();
    return cleaned || t;
  } catch {
    return t;
  }
}
