import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface TutorialOverlayProps {
  step: number;
  onNext: () => void;
  onSkip: () => void;
}

/** 必须定义在组件外：若在 render 内新建数组，steps[step-1] 每次引用都变，会导致 useEffect 死循环 */
const TUTORIAL_STEPS = [
  {
    id: 'tutorial-step-1',
    title: '步骤 1: 参考图',
    description: '上传一张参考图来引导 AI 生成。',
    align: 'left' as const,
  },
  {
    id: 'tutorial-step-2',
    title: '步骤 2: 参考图使用权重',
    description: '调整参考图对最终生成结果的影响程度。',
    align: 'left' as const,
  },
  {
    id: 'tutorial-step-3',
    title: '步骤 3: 自定义配置',
    description: '微调面部特征、发型和体型等属性。',
    align: 'left' as const,
  },
  {
    id: 'tutorial-step-4',
    title: '步骤 4: 生成模型',
    description: '（加入您的个性化关键词）点击这里，让您的数字人栩栩如生！',
    align: 'top' as const,
  },
];

export function TutorialOverlay({ step, onNext, onSkip }: TutorialOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = TUTORIAL_STEPS[step - 1];

  useEffect(() => {
    const cfg = TUTORIAL_STEPS[step - 1];
    if (!cfg) return;

    const stepId = cfg.id;

    const el = document.getElementById(stepId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const updateRect = () => {
      const currentEl = document.getElementById(stepId);
      if (currentEl) {
        setTargetRect(currentEl.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    const timeout1 = setTimeout(updateRect, 100);
    const timeout2 = setTimeout(updateRect, 300);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [step]);

  if (!currentStep) return null;

  let dialogStyle = {};
  let linePath = "";

  if (targetRect) {
    const isLeft = currentStep.align === 'left';
    const dialogWidth = 320;
    const dialogHeight = 200;
    
    let dialogX = isLeft ? targetRect.left + targetRect.width + 40 : targetRect.left + (targetRect.width / 2) - (dialogWidth / 2);
    let dialogY = isLeft ? targetRect.top : targetRect.top - dialogHeight - 40;

    // Clamp to screen bounds
    dialogX = Math.max(20, Math.min(window.innerWidth - dialogWidth - 20, dialogX));
    dialogY = Math.max(20, Math.min(window.innerHeight - dialogHeight - 20, dialogY));

    dialogStyle = {
      left: dialogX,
      top: dialogY,
    };

    const startX = isLeft ? dialogX : dialogX + dialogWidth / 2;
    const startY = isLeft ? dialogY + 40 : dialogY + dialogHeight;
    const endX = isLeft ? targetRect.left + targetRect.width + 8 : targetRect.left + targetRect.width / 2;
    const endY = isLeft ? targetRect.top + targetRect.height / 2 : targetRect.top - 8;

    linePath = `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <svg className="fixed inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect 
                x={targetRect.x - 12} 
                y={targetRect.y - 12} 
                width={targetRect.width + 24} 
                height={targetRect.height + 24} 
                fill="black" 
                rx="8"
              />
            )}
          </mask>
        </defs>
        <rect 
          x="0" 
          y="0" 
          width="100%" 
          height="100%" 
          fill="rgba(0,0,0,0.7)" 
          mask="url(#spotlight-mask)" 
          className="pointer-events-auto" 
          onClick={onNext} 
        />
        
        {targetRect && (
          <path 
            d={linePath} 
            stroke="white" 
            strokeWidth="1.5" 
            strokeDasharray="4 4"
            fill="none"
          />
        )}
      </svg>

      <AnimatePresence mode="wait">
        {targetRect && (
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bg-white p-6 shadow-2xl w-80 pointer-events-auto border border-black/10"
            style={dialogStyle}
          >
            <button 
              onClick={onSkip}
              className="absolute top-4 right-4 text-black/40 hover:text-black transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded-full">
                {step} / 4
              </span>
              <h3 className="font-bold text-sm uppercase tracking-wider">{currentStep.title}</h3>
            </div>
            
            <p className="text-black/60 text-sm mb-6 leading-relaxed">
              {currentStep.description}
            </p>
            
            <div className="flex justify-between items-center">
              <button 
                onClick={onSkip}
                className="text-[10px] font-bold tracking-widest uppercase text-black/40 hover:text-black"
              >
                跳过教程
              </button>
              <button 
                onClick={onNext}
                className="bg-black text-white px-4 py-2 text-[10px] font-bold tracking-widest uppercase rounded-sm hover:bg-black/80 transition-colors"
              >
                {step === 4 ? "完成" : "下一步"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
