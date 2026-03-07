
import React, { useState } from 'react';

const TryOn: React.FC = () => {
  return (
    <div className="relative h-full flex flex-col">
      <header className="px-8 pt-12 flex justify-between items-start z-20">
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 bg-white flex items-center justify-center rounded-lg">
            <span className="material-icons-round text-black text-xl">blur_on</span>
          </div>
          <span className="text-2xl font-display font-black tracking-tighter">FUTR</span>
        </div>
        <div className="bg-primary text-black px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase animate-pulse-fast">
          AI Active
        </div>
      </header>

      {/* Portrait / Model Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden py-10">
        <div className="relative w-[85%] aspect-[3/4] rounded-[3rem] overflow-hidden grayscale contrast-125 border border-white/10">
          <img 
            src="/images/tryon-portrait.jpg" 
            alt="Portrait"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          
          {/* Scanning Line */}
          <div className="absolute left-0 right-0 h-[2px] bg-primary shadow-[0_0_20px_#D4FF00] animate-scan z-20"></div>
          
          <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
            <div className="text-6xl font-display font-black text-white/20 leading-none">
              TECH<br/>WEAR
            </div>
          </div>
        </div>

        {/* Floating Tool Controls */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 glass rounded-full z-30">
          <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black shadow-lg">
            <span className="material-icons-round text-sm">3d_rotation</span>
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-white/50">
            <span className="material-icons-round text-sm">photo_camera</span>
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-white/50">
            <span className="material-icons-round text-sm">share</span>
          </button>
        </div>
      </div>

      {/* Style Bottom Drawer */}
      <div className="bg-black glass p-6 pb-32 rounded-t-[3rem] border-t border-white/10 z-30">
        <div className="flex gap-4 overflow-x-auto no-scrollbar mb-6">
          <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-primary flex items-center justify-center p-2">
            <img src="/images/tryon-look-1.jpg" className="max-h-full object-contain mix-blend-multiply" />
          </div>
          <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center p-2 grayscale">
             <img src="/images/tryon-look-2.jpg" className="max-h-full object-contain" />
          </div>
          <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center p-2 grayscale">
             <img src="/images/tryon-look-3.jpg" className="max-h-full object-contain" />
          </div>
        </div>
        <button className="w-full bg-white text-black py-4 rounded-3xl flex items-center justify-between px-8 group active:scale-95 transition-all">
          <span className="text-lg font-black uppercase tracking-widest">Apply Style</span>
          <div className="bg-primary p-2 rounded-xl text-black">
            <span className="material-icons-round">arrow_forward</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default TryOn;
