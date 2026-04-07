import type { CharacterAttributes } from '../types';

export type ModelCardLayoutText = {
  name: string;
  age: string;
  height: string;
  hair: string;
  eyes: string;
  skin: string;
};
export type ModelCardGridImages = [string, string, string, string];

const BASE_W = 900;
const BASE_H = 1200;
/** 输出清晰度（相对逻辑坐标） */
const PIXEL_RATIO = 2;

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('模特图加载失败'));
    img.src = src;
  });
}

function drawCardFrame(
  ctx: CanvasRenderingContext2D,
  attrs: CharacterAttributes,
  text: ModelCardLayoutText,
) {
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  const pad = 56;
  const cardX = pad;
  const cardY = pad;
  const cardW = BASE_W - pad * 2;
  const cardH = BASE_H - pad * 2;

  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.fillRect(cardX + 10, cardY + 32, cardW, cardH);
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  ctx.fillRect(cardX + 6, cardY + 18, cardW, cardH);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cardX, cardY, cardW, cardH);
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cardX + 0.5, cardY + 0.5, cardW - 1, cardH - 1);

  const innerLeft = cardX + 48;
  const innerRight = cardX + cardW - 48;

  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.font = '600 9px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MODEL PROFILE', innerLeft, cardY + 44);

  ctx.fillStyle = '#0a0a0a';
  ctx.font = '700 40px ui-serif, Georgia, serif';
  const displayName = text.name.trim() || attrs.name;
  ctx.fillText(displayName.toUpperCase().slice(0, 48), innerLeft, cardY + 92);

  ctx.fillStyle = '#0a0a0a';
  ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('SS / 26', innerRight, cardY + 76);
  ctx.textAlign = 'left';

  const fy = cardY + cardH - 56;
  ctx.fillStyle = '#0a0a0a';
  ctx.font = '600 9px ui-sans-serif, system-ui, sans-serif';
  const cols: [string, string][] = [
    ['Age', text.age],
    ['Height', text.height],
    ['Hair', text.hair],
    ['Eyes', text.eyes],
    ['Skin', text.skin],
  ];
  const colW = (innerRight - innerLeft) / cols.length;
  cols.forEach(([label, val], i) => {
    const x = innerLeft + i * colW;
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillText(label, x, fy - 36);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillText(val.length > 20 ? `${val.slice(0, 18)}…` : val, x, fy - 14);
  });

  return { cardY, cardH, innerLeft, innerRight };
}

/**
 * 用 Canvas 绘制与页面模卡一致的整张卡（灰底 + 白卡片 + 页眉 + 主图 + 页脚），不依赖 html2canvas。
 */
export async function renderModelCardToPngDataUrl(
  imageUrl: string,
  attrs: CharacterAttributes,
  text: ModelCardLayoutText,
): Promise<string | null> {
  try {
    const img = await loadImageElement(imageUrl);
    if (!img.naturalWidth || !img.naturalHeight) return null;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(BASE_W * PIXEL_RATIO);
    canvas.height = Math.round(BASE_H * PIXEL_RATIO);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(PIXEL_RATIO, PIXEL_RATIO);
    const { cardY, cardH, innerLeft, innerRight } = drawCardFrame(ctx, attrs, text);

    const imgTop = cardY + 128;
    const imgBottom = cardY + cardH - 112;
    const imgLeft = innerLeft;
    const imgW = innerRight - imgLeft;
    const imgH = imgBottom - imgTop;

    const scale = Math.max(imgW / img.naturalWidth, imgH / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = imgLeft + (imgW - dw) / 2;
    const dy = imgTop + (imgH - dh) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(imgLeft, imgTop, imgW, imgH);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();

    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.strokeRect(imgLeft + 0.5, imgTop + 0.5, imgW - 1, imgH - 1);

    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('renderModelCardToPngDataUrl', e);
    return null;
  }
}

/**
 * 固定 3:4 模卡 + 2x2 方格（每格 1:1）程序化拼版。
 * 用于参考图模式，避免模型直接输出整卡导致版式漂移。
 */
export async function renderModelCard2x2ToPngDataUrl(
  imageUrls: ModelCardGridImages,
  attrs: CharacterAttributes,
  text: ModelCardLayoutText,
): Promise<string | null> {
  try {
    const images = await Promise.all(imageUrls.map((u) => loadImageElement(u)));
    if (images.some((img) => !img.naturalWidth || !img.naturalHeight)) return null;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(BASE_W * PIXEL_RATIO);
    canvas.height = Math.round(BASE_H * PIXEL_RATIO);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(PIXEL_RATIO, PIXEL_RATIO);

    const { cardY, cardH, innerLeft, innerRight } = drawCardFrame(ctx, attrs, text);
    const imgTop = cardY + 128;
    const imgBottom = cardY + cardH - 112;
    const gridW = innerRight - innerLeft;
    const gridH = imgBottom - imgTop;
    const gap = 12;
    const cell = Math.floor(Math.min((gridW - gap) / 2, (gridH - gap) / 2));
    const totalW = cell * 2 + gap;
    const totalH = cell * 2 + gap;
    const startX = innerLeft + Math.floor((gridW - totalW) / 2);
    const startY = imgTop + Math.floor((gridH - totalH) / 2);
    const rects: Array<[number, number]> = [
      [startX, startY],
      [startX + cell + gap, startY],
      [startX, startY + cell + gap],
      [startX + cell + gap, startY + cell + gap],
    ];

    images.forEach((img, i) => {
      const [dx, dy] = rects[i]!;
      const size = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = Math.floor((img.naturalWidth - size) / 2);
      const sy = Math.floor((img.naturalHeight - size) / 2);
      ctx.drawImage(img, sx, sy, size, size, dx, dy, cell, cell);
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.strokeRect(dx + 0.5, dy + 0.5, cell - 1, cell - 1);
    });

    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.strokeRect(innerLeft + 0.5, imgTop + 0.5, gridW - 1, gridH - 1);
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('renderModelCard2x2ToPngDataUrl', e);
    return null;
  }
}
