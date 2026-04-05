import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { FlashlightScene } from './threeView/FlashlightScene';

/** 默认底图（public/）；可替换为同路径 PNG/JPG，或设 VITE_DEVELOPING_HERO_BG */
export function resolveDevelopingHeroUrl(): string {
  const v = (import.meta.env.VITE_DEVELOPING_HERO_BG as string | undefined)?.trim();
  if (v) return v;
  return '/developing-hero-bg.jpg';
}

function DevelopingOverlay() {
  return (
    <div className="pointer-events-none flex h-full w-full items-center justify-center">
      <h1
        className="text-5xl font-black uppercase tracking-tighter text-white mix-blend-difference md:text-7xl lg:text-[8vw]"
        style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', transform: 'scaleX(1.2)' }}
      >
        DEVELOPING.
      </h1>
    </div>
  );
}

type Props = {
  onClose: () => void;
};

export function ThreeViewDevelopingPage({ onClose }: Props) {
  const bgUrl = resolveDevelopingHeroUrl();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="三视图 · DEVELOPING"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[140] overflow-hidden bg-black"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute left-6 top-6 z-[200] flex h-11 w-11 items-center justify-center border border-white/20 bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-black"
        title="关闭 (Esc)"
      >
        <X size={20} strokeWidth={2} />
      </button>

      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 1] }} gl={{ antialias: true, alpha: false }}>
          <Suspense fallback={null}>
            <FlashlightScene imageUrl={bgUrl} />
          </Suspense>
        </Canvas>
      </div>

      <div className="pointer-events-none absolute inset-0 z-10">
        <DevelopingOverlay />
      </div>
    </motion.div>
  );
}
