import React, { useRef } from 'react';
import { Plus, ArrowDown, Download, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { cn } from '../lib/utils';
import { t } from '../lib/translations';
import { CharacterAttributes } from '../types';

interface MainViewportProps {
  imageUrl: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
  error: string | null;
  attributes: CharacterAttributes;
  onAttributesChange: (attrs: CharacterAttributes) => void;
}

export function MainViewport({ imageUrl, isGenerating, onGenerate, error, attributes, onAttributesChange }: MainViewportProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const showPrompt = isHovered || isFocused || (attributes.customPrompt && attributes.customPrompt.length > 0);

  const handlePromptChange = (val: string) => {
    onAttributesChange({ ...attributes, customPrompt: val });
  };

  const handleDownload = async () => {
    if (!imageUrl || !cardRef.current) return;
    try {
      // Temporarily hide the download button during capture
      const buttonsDiv = cardRef.current.querySelector('.download-buttons') as HTMLElement;
      if (buttonsDiv) buttonsDiv.style.display = 'none';

      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
      });

      if (buttonsDiv) buttonsDiv.style.display = 'flex';

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${attributes.name.replace(/\s+/g, '_').toLowerCase()}_model_card.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download card:', err);
      // Fallback to just downloading the image
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
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = `${attributes.name.replace(/\s+/g, '_').toLowerCase()}_model.png`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  return (
    <div className="flex-1 relative h-full flex flex-col items-center p-12 overflow-y-auto no-scrollbar">
      {/* Main Image Container (Model Card Style) */}
      <div className="relative w-full max-w-2xl flex-shrink-0 aspect-[3/4] bg-white overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.1)] flex flex-col border border-black/5">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-white z-50"
            >
              <div className="w-16 h-[1px] bg-black/10 relative overflow-hidden">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="absolute inset-0 bg-black"
                />
              </div>
              <p className="text-black text-[10px] font-bold tracking-[0.4em] uppercase">Generating Card</p>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center gap-8 bg-white z-50"
            >
              <div className="w-12 h-12 border border-black/10 flex items-center justify-center">
                <div className="w-2 h-2 bg-black rounded-full animate-ping" />
              </div>
              <p className="text-black text-[10px] font-bold tracking-widest uppercase leading-relaxed">{error}</p>
              <button 
                onClick={() => onGenerate()}
                className="px-8 py-3 border border-black text-[10px] font-bold tracking-widest uppercase hover:bg-black hover:text-white transition-all"
              >
                Retry
              </button>
            </motion.div>
          ) : imageUrl ? (
            <motion.div 
              key="model-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col bg-white p-12"
              ref={cardRef}
            >
              {/* Card Header */}
              <div className="flex justify-between items-end mb-12">
                <div className="flex flex-col gap-1">
                  <p className="text-black/40 text-[9px] font-bold tracking-[0.3em] uppercase">Model Profile</p>
                  <h1 className="text-4xl font-display tracking-tighter text-black font-bold uppercase leading-none">{attributes.name}</h1>
                </div>
                <div className="text-right">
                  <p className="text-black text-[10px] font-bold tracking-widest uppercase">SS / 26</p>
                </div>
              </div>

              {/* Image Grid */}
              <div className="flex-1 relative overflow-hidden transition-all duration-700 cursor-crosshair group">
                <img 
                  src={imageUrl}
                  alt="Model Comp Card"
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 border border-black/5" />
              </div>

              {/* Card Footer */}
              <div className="mt-12 flex justify-between items-center">
                <div className="flex gap-8 text-[9px] font-bold tracking-[0.2em] text-black uppercase">
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
                <div className="flex gap-4 download-buttons">
                  <button 
                    onClick={handleDownload}
                    className="w-8 h-8 border border-black/10 flex items-center justify-center text-black hover:bg-black hover:text-white transition-all"
                    title="Download Image"
                  >
                    <Download size={14} />
                  </button>
                  <button className="w-8 h-8 border border-black/10 flex items-center justify-center text-black hover:bg-black hover:text-white transition-all">
                    <Share2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-white">
              <div className="w-12 h-12 border border-black/5 flex items-center justify-center">
                <Plus size={16} className="text-black/20" />
              </div>
              <p className="text-black/20 text-[10px] font-bold tracking-[0.4em] uppercase">No Card Generated</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Prompt Input (Moved below the card to avoid overlap) */}
      <div 
        className="w-full max-w-2xl mt-8 flex flex-col items-center pb-12"
      >
        <div className="w-full relative min-h-[40px]">
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col gap-2"
          >
            <div className="flex flex-col gap-2 border border-black/10 p-4 bg-white shadow-sm group hover:border-black transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-black/40 text-[8px] font-bold tracking-[0.2em] uppercase">自定义指令 (Custom Directives)</span>
                <button 
                  id="tutorial-step-4"
                  onClick={() => onGenerate()}
                  className="text-black hover:translate-x-1 transition-transform flex items-center gap-2"
                >
                  <span className="text-[8px] font-bold tracking-widest uppercase">Generate</span>
                  <ArrowDown size={12} className="-rotate-90" />
                </button>
              </div>
              <textarea 
                value={attributes.customPrompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                placeholder="ADD CUSTOM PROMPT DIRECTIVES OR EXTRA CONDITIONS HERE..." 
                className="bg-transparent border-none outline-none text-black w-full placeholder:text-black/20 text-xs font-medium resize-none min-h-[60px] py-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onGenerate();
                  }
                }}
              />
            </div>
            <p className="text-black/20 text-[8px] font-bold tracking-widest uppercase text-center">
              Press Enter to generate, Shift+Enter for new line
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
