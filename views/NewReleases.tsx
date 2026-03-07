
import React from 'react';
import { Product } from '../types';

interface NewReleasesProps {
  onBack: () => void;
  onAddToCart?: (product: Product) => void;
}

const NewReleases: React.FC<NewReleasesProps> = ({ onBack, onAddToCart }) => {
  const currentDrop: Product = {
    id: 'AX-889',
    name: 'Neon Stride Phase-1',
    price: 750,
    type: 'Digital + Physical',
    image: '/images/drop-main.jpg'
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-black">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-20%] w-[100%] h-[50%] bg-primary/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-20%] w-[100%] h-[50%] bg-accent/5 blur-[120px] rounded-full"></div>
      </div>

      <header className="relative z-20 px-6 pt-12 flex justify-between items-center">
        <button 
          onClick={onBack}
          className="w-12 h-12 glass rounded-full flex items-center justify-center active:scale-90 transition-transform"
        >
          <span className="material-icons-round">west</span>
        </button>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Priority Access</p>
          <h2 className="text-2xl font-future font-black tracking-tighter uppercase">CHRONO DROP</h2>
        </div>
        <button className="w-12 h-12 glass rounded-full flex items-center justify-center">
          <span className="material-icons-round">share</span>
        </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col px-6 pt-8 pb-32">
        {/* Product Showcase */}
        <div className="relative aspect-[4/5] w-full mb-10 group">
          <div className="absolute inset-0 bg-white/5 rounded-[3rem] border border-white/10 overflow-hidden">
             {/* Text Backdrop */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] select-none">
                <h1 className="text-[180px] font-future font-black leading-none">20<br/>99</h1>
             </div>
          </div>
          
          <img 
            src={currentDrop.image} 
            alt={currentDrop.name}
            className="absolute inset-0 w-full h-full object-contain p-8 drop-shadow-[0_35px_60px_rgba(212,255,0,0.4)] group-hover:scale-105 transition-transform duration-700"
          />

          <div className="absolute bottom-8 left-8">
            <span className="bg-black text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
              Serial: {currentDrop.id}
            </span>
          </div>
        </div>

        {/* Specs & Details */}
        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-4xl font-display font-black uppercase tracking-tighter leading-none">{currentDrop.name.split(' ').map((word, i) => <React.Fragment key={i}>{word}{i === 1 ? <br/> : ' '}</React.Fragment>)}</h3>
              <p className="text-white/40 text-sm mt-2 font-space">Hyper-adaptive neural sole for urban agility.</p>
            </div>
            <div className="text-right">
              <p className="text-primary text-3xl font-display font-black">${currentDrop.price}</p>
              <p className="text-[10px] opacity-40 uppercase font-bold tracking-widest">{currentDrop.type}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
             <div className="glass p-4 rounded-3xl text-center">
                <span className="material-icons-round text-primary text-lg mb-1 block">bolt</span>
                <span className="text-[8px] font-bold uppercase opacity-40 block">Response</span>
                <span className="text-xs font-black">ULTRA</span>
             </div>
             <div className="glass p-4 rounded-3xl text-center">
                <span className="material-icons-round text-primary text-lg mb-1 block">blur_on</span>
                <span className="text-[8px] font-bold uppercase opacity-40 block">Traction</span>
                <span className="text-xs font-black">X-GRID</span>
             </div>
             <div className="glass p-4 rounded-3xl text-center">
                <span className="material-icons-round text-primary text-lg mb-1 block">auto_fix_high</span>
                <span className="text-[8px] font-bold uppercase opacity-40 block">Link</span>
                <span className="text-xs font-black">A-SYNC</span>
             </div>
          </div>

          <button 
            onClick={() => onAddToCart?.(currentDrop)}
            className="w-full bg-white text-black py-6 rounded-[2rem] flex items-center justify-between px-10 group active:scale-95 transition-all shadow-2xl"
          >
            <span className="text-lg font-black uppercase tracking-widest">Secure Gear</span>
            <div className="bg-primary p-2 rounded-xl text-black flex items-center justify-center">
              <span className="material-icons-round">shopping_cart</span>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
};

export default NewReleases;
