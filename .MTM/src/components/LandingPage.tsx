import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Grid, Search, ChevronUp, ChevronDown, Upload, Play, Pause } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
  onNavigateToModels: () => void;
}

const initialPresetImages = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1488161628813-04466f872507?auto=format&fit=crop&w=400&q=80",
];

export function LandingPage({ onEnter, onNavigateToModels }: LandingPageProps) {
  const [images, setImages] = useState(initialPresetImages);
  const [isPlaying, setIsPlaying] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      void a.play().catch(() => setIsPlaying(false));
    } else {
      a.pause();
    }
  }, [isPlaying]);

  const togglePlay = () => {
    setIsPlaying((v) => !v);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-white text-black z-[100] flex overflow-hidden font-sans">
      {/* Left Sidebar (Mock) */}
      <div className="w-24 border-r border-black/10 flex flex-col items-center h-full bg-white z-20">
        <div className="w-full aspect-square bg-black flex items-center justify-center text-white">
          <Grid size={24} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-16 text-[10px] font-bold tracking-widest uppercase">
          <span className="vertical-text">Home</span>
          <span className="vertical-text text-black/30 hover:text-black cursor-pointer transition-colors">3D Gen</span>
          <span className="vertical-text text-black/30 hover:text-black cursor-pointer transition-colors">Video</span>
        </div>
        <div className="pb-8 text-[10px] font-bold tracking-widest uppercase">
          FAQ
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Top Nav */}
        <div className="flex justify-between items-center p-8">
          <div className="flex gap-8 text-sm font-bold">
            <span>Digital.</span>
            <button onClick={onNavigateToModels} className="text-black/40 hover:text-black transition-colors uppercase tracking-widest text-xs">Models</button>
          </div>
          <Search size={20} />
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center px-16 relative">
          <div className="max-w-xl z-10">
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] font-bold tracking-[0.3em] uppercase text-black/40 mb-4"
            >
              A I &nbsp; G E N E R A T I O N
            </motion.p>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-7xl md:text-9xl font-display font-bold tracking-tighter mb-6 leading-none"
            >
              Digital<br/>Human
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-black/60 text-sm max-w-sm mb-12 leading-relaxed"
            >
              The one and only returns this fall with a journey into the soul. Discover new styles and connect authentically.
            </motion.p>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={onEnter}
              className="bg-black text-white px-12 py-5 text-xs font-bold tracking-[0.3em] uppercase hover:bg-black/90 transition-all shadow-2xl"
            >
              Start Creating
            </motion.button>
          </div>

          {/* 3D Cylinder - Scaled, Tilted, Top Right */}
          <div className="absolute top-10 right-20 w-[500px] h-[500px] perspective-[1200px] flex items-center justify-center pointer-events-none">
            <motion.div 
              className="relative w-[140px] h-[200px] preserve-3d"
              style={{ rotateX: -20, rotateZ: 20 }}
              animate={{ rotateY: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            >
              {images.map((img, i) => {
                const angle = (i / images.length) * 360;
                const radius = 220; // Distance from center
                return (
                  <div 
                    key={i}
                    className="absolute inset-0 preserve-3d"
                    style={{
                      transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                    }}
                  >
                    {/* Front */}
                    <div className="absolute inset-0 bg-white border border-black/10 overflow-hidden" style={{ transform: 'translateZ(5px)', backfaceVisibility: 'hidden' }}>
                      <img src={img} alt={`Model ${i}`} className="w-full h-full object-cover opacity-90" referrerPolicy="no-referrer" />
                    </div>
                    {/* Back */}
                    <div className="absolute inset-0 bg-gray-200 border border-black/10" style={{ transform: 'translateZ(-5px) rotateY(180deg)', backfaceVisibility: 'hidden' }}></div>
                    {/* Left */}
                    <div className="absolute top-0 bottom-0 left-0 w-[10px] bg-gray-300 border-y border-black/10 origin-left" style={{ transform: 'rotateY(-90deg)' }}></div>
                    {/* Right */}
                    <div className="absolute top-0 bottom-0 right-0 w-[10px] bg-gray-300 border-y border-black/10 origin-right" style={{ transform: 'rotateY(90deg)' }}></div>
                    {/* Top */}
                    <div className="absolute top-0 left-0 right-0 h-[10px] bg-gray-100 border-x border-black/10 origin-top" style={{ transform: 'rotateX(90deg)' }}></div>
                    {/* Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-[10px] bg-gray-400 border-x border-black/10 origin-bottom" style={{ transform: 'rotateX(-90deg)' }}></div>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </div>

        {/* Upload Button */}
        <div className="absolute bottom-12 right-12 z-50">
          <input type="file" id="upload-cylinder" className="hidden" accept="image/*" onChange={handleUpload} />
          <label htmlFor="upload-cylinder" className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase cursor-pointer text-black/40 hover:text-black transition-colors">
            <Upload size={16} />
            Add to Carousel
          </label>
        </div>

        {/* Bottom Player Mock */}
        <div className="p-8 flex items-center gap-6">
          <button 
            onClick={togglePlay}
            className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-1" />}
          </button>
          <div className="flex flex-col gap-2 flex-1 max-w-md">
            <span className="text-xs font-bold">Generation Ready</span>
            <div className="flex items-center gap-4 text-[10px] font-bold text-black/40">
              <span>0:00</span>
              <div className="flex-1 h-[2px] bg-black/10 relative">
                <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-black" />
              </div>
              <span>4:25</span>
            </div>
          </div>
          <audio 
            ref={audioRef} 
            src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" 
            loop 
          />
        </div>
      </div>

      {/* Right indicators */}
      <div className="w-24 flex flex-col items-center justify-center gap-32 border-l border-black/10 z-20 bg-white">
        <div className="flex flex-col items-center gap-4 text-[10px] font-bold">
          <span>01</span>
          <div className="w-[2px] h-12 bg-black" />
        </div>
        <div className="flex flex-col items-center gap-4 text-[10px] font-bold text-black/30">
          <span>02</span>
        </div>
        <div className="flex flex-col gap-4 text-black/30">
          <ChevronUp size={20} />
          <ChevronDown size={20} />
        </div>
      </div>

      {/* Global styles for 3D and vertical text */}
      <style dangerouslySetInnerHTML={{__html: `
        .perspective-[1200px] { perspective: 1200px; }
        .preserve-3d { transform-style: preserve-3d; }
        .vertical-text { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }
      `}} />
    </div>
  );
}
