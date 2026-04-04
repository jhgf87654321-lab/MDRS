import React, { useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Plus, ArrowDown, Download, Share2, ImageDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { t } from '../lib/translations';
import { renderModelCardToPngDataUrl } from '../lib/modelCardCanvas';
import { CharacterAttributes } from '../types';

export type MainViewportHandle = {
  /** 截取含外圈摩卡阴影的整张模卡为 PNG data URL（供 COS 上传） */
  captureFullModelCardPng: () => Promise<string | null>;
};

interface MainViewportProps {
  imageUrl: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
  error: string | null;
  attributes: CharacterAttributes;
  onAttributesChange: (attrs: CharacterAttributes) => void;
}

async function dataUrlToDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export const MainViewport = forwardRef<MainViewportHandle, MainViewportProps>(function MainViewport(
  { imageUrl, isGenerating, onGenerate, error, attributes, onAttributesChange },
  ref,
) {
  /** 含外圈白底、阴影、边框的完整模卡区域 */
  const fullCardRef = useRef<HTMLDivElement>(null);

  const handlePromptChange = (val: string) => {
    onAttributesChange({ ...attributes, customPrompt: val });
  };

  const captureFullCardInternal = useCallback(async (): Promise<string | null> => {
    if (!imageUrl) return null;
    const layoutText = {
      name: attributes.name,
      age: String(attributes.age),
      height: `${attributes.height} cm`,
      hair: t(attributes.hairColor),
      eyes: t(attributes.eyeColor),
      skin: t(attributes.skinTone),
    };
    const fromCanvas = await renderModelCardToPngDataUrl(imageUrl, attributes, layoutText);
    if (fromCanvas && fromCanvas.startsWith('data:image') && fromCanvas.length > 2500) {
      return fromCanvas;
    }

    const el = fullCardRef.current;
    if (!el) return null;
    const buttonsDiv = el.querySelector('.download-buttons') as HTMLElement | null;
    const prevVis = buttonsDiv?.style.visibility;
    if (buttonsDiv) buttonsDiv.style.visibility = 'hidden';
    try {
      const img = el.querySelector('img');
      if (img && !img.complete) {
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          img.onload = done;
          img.onerror = done;
        });
      }
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      try {
        await document.fonts.ready;
      } catch {
        /* ignore */
      }
      const dpr = window.devicePixelRatio || 2;
      const canvas = await html2canvas(el, {
        useCORS: true,
        allowTaint: false,
        scale: Math.min(2.5, Math.max(2, dpr)),
        backgroundColor: '#f8f8f8',
        logging: false,
        foreignObjectRendering: false,
        imageTimeout: 20000,
        onclone: (_doc, cloned) => {
          const root = cloned as HTMLElement;
          root.style.overflow = 'visible';
          const card = root.querySelector('[data-mtm-card-root]') as HTMLElement | null;
          if (card) {
            card.style.overflow = 'visible';
            card.style.maxHeight = 'none';
          }
          const slot = root.querySelector('[data-mtm-image-slot]') as HTMLElement | null;
          if (slot) {
            slot.style.overflow = 'visible';
            slot.style.minHeight = `${slot.scrollHeight}px`;
          }
        },
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('captureFullCardInternal html2canvas failed:', err);
      return null;
    } finally {
      if (buttonsDiv) buttonsDiv.style.visibility = prevVis || '';
    }
  }, [imageUrl, attributes]);

  useImperativeHandle(
    ref,
    () => ({
      captureFullModelCardPng: () => captureFullCardInternal(),
    }),
    [captureFullCardInternal],
  );

  /** 下载整张模卡（含外圈摩卡） */
  const handleDownloadModelCard = async () => {
    if (!imageUrl) return;
    const png = await captureFullCardInternal();
    if (png) {
      await dataUrlToDownload(
        png,
        `${attributes.name.replace(/\s+/g, '_').toLowerCase()}_model_card.png`,
      );
      return;
    }
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${attributes.name.replace(/\s+/g, '_').toLowerCase()}_model.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (fallbackErr) {
      console.error('Fallback download failed:', fallbackErr);
    }
  };

  /** 仅下载 AI 生成图（不含模卡边框与页眉页脚） */
  const handleDownloadRawImage = async () => {
    if (!imageUrl) return;
    const base = `${attributes.name.replace(/\s+/g, '_').toLowerCase()}_generated`;
    try {
      if (imageUrl.startsWith('data:')) {
        await dataUrlToDownload(imageUrl, `${base}.png`);
        return;
      }
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const ext = blob.type.includes('jpeg') ? 'jpg' : blob.type.includes('webp') ? 'webp' : 'png';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${base}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = `${base}.png`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="relative flex h-full flex-1 flex-col items-center overflow-y-auto p-12 no-scrollbar">
      {/* 外层留白 + 背景，避免大阴影被 overflow 裁掉；html2canvas 截此根节点 */}
      <div
        ref={fullCardRef}
        className="relative box-border w-full max-w-[min(100%,44rem)] flex-shrink-0 bg-[#f8f8f8] p-10 sm:p-14"
      >
      <div
        data-mtm-card-root
        className="relative mx-auto flex aspect-[3/4] w-full max-w-2xl flex-shrink-0 flex-col overflow-hidden border border-black/5 bg-white shadow-[0_40px_120px_rgba(0,0,0,0.1)]"
      >
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white"
            >
              <div className="relative h-[1px] w-16 overflow-hidden bg-black/10">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  className="absolute inset-0 bg-black"
                />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-black">Generating Card</p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-white p-12 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center border border-black/10">
                <div className="h-2 w-2 animate-ping rounded-full bg-black" />
              </div>
              <p className="text-[10px] font-bold uppercase leading-relaxed tracking-widest text-black">{error}</p>
              <button
                type="button"
                onClick={() => onGenerate()}
                className="border border-black px-8 py-3 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-black hover:text-white"
              >
                Retry
              </button>
            </motion.div>
          ) : imageUrl ? (
            <motion.div
              key="model-card"
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0 }}
              className="flex flex-1 flex-col bg-white p-12"
            >
              <div className="mb-12 flex items-end justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/40">Model Profile</p>
                  <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tighter text-black">
                    {attributes.name}
                  </h1>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-black">SS / 26</p>
                </div>
              </div>

              <div
                data-mtm-image-slot
                className="group relative min-h-0 flex-1 cursor-crosshair overflow-hidden transition-all duration-700"
              >
                <img
                  src={imageUrl}
                  alt="Generated model (右键另存为可保存无模卡边框的纯图)"
                  className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  crossOrigin={imageUrl.startsWith('http') ? 'anonymous' : undefined}
                />
                <div className="pointer-events-none absolute inset-0 border border-black/5" />
              </div>

              <div className="mt-12 flex items-center justify-between">
                <div className="flex gap-8 text-[9px] font-bold uppercase tracking-[0.2em] text-black">
                  <div className="flex flex-col gap-1">
                    <span className="text-black/30">Age</span>
                    <span>{attributes.age}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-black/30">Height</span>
                    <span>{attributes.height} cm</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-black/30">Hair</span>
                    <span>{t(attributes.hairColor)}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-black/30">Eyes</span>
                    <span>{t(attributes.eyeColor)}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-black/30">Skin</span>
                    <span>{t(attributes.skinTone)}</span>
                  </div>
                </div>
                <div className="download-buttons flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDownloadModelCard()}
                    className="flex h-8 w-8 items-center justify-center border border-black/10 text-black transition-all hover:bg-black hover:text-white"
                    title="下载整张模卡（含外圈摩卡）"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownloadRawImage()}
                    className="flex h-8 w-8 items-center justify-center border border-black/10 text-black transition-all hover:bg-black hover:text-white"
                    title="仅下载 AI 生成图（无模卡）"
                  >
                    <ImageDown size={14} />
                  </button>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center border border-black/10 text-black transition-all hover:bg-black hover:text-white"
                    title="分享"
                  >
                    <Share2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-white">
              <div className="flex h-12 w-12 items-center justify-center border border-black/5">
                <Plus size={16} className="text-black/20" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-black/20">No Card Generated</p>
            </div>
          )}
        </AnimatePresence>
      </div>
      </div>

      <div className="mt-8 flex w-full max-w-2xl flex-col items-center pb-12">
        {imageUrl && !isGenerating && !error && (
          <p className="mb-3 text-center text-[8px] font-bold uppercase tracking-widest text-black/35">
            右键上方大图「图片另存为」可保存不含模卡装饰的纯生成图；左侧按钮下载整张模卡
          </p>
        )}
        <div className="relative min-h-[40px] w-full">
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex w-full flex-col gap-2">
            <div className="group flex flex-col gap-2 border border-black/10 bg-white p-4 shadow-sm transition-colors hover:border-black">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/40">
                  自定义指令 (Custom Directives)
                </span>
                <button
                  id="tutorial-step-4"
                  type="button"
                  onClick={() => onGenerate()}
                  className="flex items-center gap-2 text-black transition-transform hover:translate-x-1"
                >
                  <span className="text-[8px] font-bold uppercase tracking-widest">Generate</span>
                  <ArrowDown size={12} className="-rotate-90" />
                </button>
              </div>
              <textarea
                value={attributes.customPrompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                placeholder="ADD CUSTOM PROMPT DIRECTIVES OR EXTRA CONDITIONS HERE..."
                className="min-h-[60px] w-full resize-none border-none bg-transparent py-2 text-xs font-medium text-black outline-none placeholder:text-black/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onGenerate();
                  }
                }}
              />
            </div>
            <p className="text-center text-[8px] font-bold uppercase tracking-widest text-black/20">
              Press Enter to generate, Shift+Enter for new line
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
});
