
import React from 'react';
import { Product } from '../types';

interface CollectionProps {
  onBack: () => void;
  onAddToCart?: (product: Product) => void;
}

const Collection: React.FC<CollectionProps> = ({ onBack, onAddToCart }) => {
  const collectionProducts: Product[] = [
    { 
      id: 'Vortex-J1', 
      name: 'Vortex Shell J1', 
      price: 499, 
      type: 'Physical Asset', 
      image: '/images/collection-vortex-j1.jpg' 
    },
    { 
      id: 'Stride-S1', 
      name: 'Neon Stride S1', 
      price: 320, 
      type: 'Hybrid Node', 
      image: '/images/collection-stride-s1.jpg' 
    },
    { 
      id: 'Visor-V2', 
      name: 'Cyber-Optic Visor', 
      price: 850, 
      type: 'Digital Overlay', 
      image: '/images/collection-visor-v2.jpg' 
    },
    { 
      id: 'Glove-G1', 
      name: 'Neural Link Glove', 
      price: 210, 
      type: 'Input Device', 
      image: '/images/collection-glove-g1.jpg' 
    }
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-background-dark pb-32">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-[80%] h-[40%] bg-primary/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-[60%] h-[30%] bg-accent/5 blur-[120px] rounded-full"></div>
      </div>

      <header className="relative z-20 px-6 pt-12 flex justify-between items-center mb-8">
        <button 
          onClick={onBack}
          className="w-12 h-12 glass rounded-full flex items-center justify-center active:scale-90 transition-transform"
        >
          <span className="material-icons-round">west</span>
        </button>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Decentralized Mall</p>
          <h2 className="text-2xl font-future font-black tracking-tighter uppercase">AXON_COLLECTION</h2>
        </div>
      </header>

      <main className="relative z-10 px-6 space-y-6">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.6em] mb-4 ml-2">Load_Grid_Sequence_001</span>
          
          {/* Aligned Bento Grid Layout */}
          <div className="grid grid-cols-2 gap-4">
            {collectionProducts.map((p) => (
              <div 
                key={p.id}
                className="glass rounded-[2.5rem] p-4 flex flex-col group relative border border-white/5 hover:border-primary/20 transition-colors"
              >
                <div className="aspect-[4/5] bg-white/5 rounded-[2rem] overflow-hidden relative mb-4">
                  <div className="absolute inset-0 grid-bg opacity-10"></div>
                  <img 
                    src={p.image} 
                    alt={p.name} 
                    className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-700 drop-shadow-2xl" 
                  />
                  <div className="absolute top-4 left-4 flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#D4FF00]"></div>
                    <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">Live</span>
                  </div>
                </div>

                <div className="flex flex-col flex-1 px-1">
                  <div className="mb-3">
                    <p className="text-[8px] text-primary font-bold uppercase tracking-widest leading-none mb-1.5">{p.type}</p>
                    <h4 className="font-display font-black text-[11px] uppercase leading-tight text-white/90 group-hover:text-white transition-colors">{p.name}</h4>
                  </div>
                  
                  <div className="mt-auto flex justify-between items-center">
                    <span className="font-display font-black text-lg text-white">${p.price}</span>
                    <button 
                      onClick={() => onAddToCart?.(p)}
                      className="bg-white text-black w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-primary"
                    >
                      <span className="material-icons-round text-sm">add_shopping_cart</span>
                    </button>
                  </div>
                </div>

                {/* Cyber Corner Decals */}
                <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none opacity-20">
                  <div className="absolute top-4 right-4 w-px h-2 bg-primary"></div>
                  <div className="absolute top-4 right-4 w-2 h-px bg-primary"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Neural Customizer Banner - Aligned with Grid */}
        <div className="glass rounded-[3rem] p-8 border border-primary/20 bg-primary/5 flex items-center justify-between group overflow-hidden relative shadow-2xl">
          <div className="relative z-10">
            <h3 className="text-xl font-future font-black tracking-tighter text-white mb-2 uppercase">Neural Customizer</h3>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest leading-relaxed max-w-[200px]">
              Sync your biometric data to generate procedural garments.
            </p>
          </div>
          <div className="relative z-10">
            <button className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(212,255,0,0.4)] active:scale-90 transition-transform">
              <span className="material-icons-round text-3xl">biotech</span>
            </button>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 transform rotate-12 group-hover:rotate-0 transition-transform duration-700">
             <span className="material-icons-round text-[120px]">gesture</span>
          </div>
        </div>
      </main>

      <footer className="px-8 mt-16 text-center opacity-10 pointer-events-none">
        <span className="text-[8px] font-black uppercase tracking-[1em]">END_OF_CATALOG_SEQUENCE</span>
      </footer>
    </div>
  );
};

export default Collection;
