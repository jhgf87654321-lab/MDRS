import React, { useState, useEffect } from 'react';
import { Product } from '../types';

interface StoreProps {
  onOpenDrop?: () => void;
  onOpenCollection?: () => void;
  onOpenCart?: () => void;
  onAddToCart?: (product: Product) => void;
}

const Store: React.FC<StoreProps> = ({ onOpenDrop, onOpenCollection, onOpenCart, onAddToCart }) => {
  const [timeLeft, setTimeLeft] = useState({ h: 4, m: 29, s: 51 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { h, m, s } = prev;
        if (s > 0) s--;
        else {
          s = 59;
          if (m > 0) m--;
          else {
            m = 59;
            if (h > 0) h--;
          }
        }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const format = (n: number) => n.toString().padStart(2, '0');

  // Use COS "current" artwork as initial images to avoid showing old placeholders during async load.
  // (leaderImages is fetched async; these act as the initial render)
  const COS_FALLBACK = 'https://lokada-1254090729.cos.ap-shanghai.myqcloud.com/FUNCTION/header.jpg';
  const fallbackLeaderboard = [
    { 
      id: 'Cyber Nomad #01', 
      name: 'Cyber Nomad #01',
      likes: 12450, 
      type: 'User NFT',
      image: COS_FALLBACK,
    },
    { 
      id: 'Neon Beast #42', 
      name: 'Neon Beast #42',
      likes: 9820, 
      type: 'User NFT',
      image: COS_FALLBACK,
    },
    {
      id: 'Chrome Angel #07',
      name: 'Chrome Angel #07',
      likes: 8500,
      type: 'User NFT',
      image: COS_FALLBACK,
    }
  ];

  const [leaderImages, setLeaderImages] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('leaderImagesCache');
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string' && x.startsWith('http'))) {
        return parsed.slice(0, 20);
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    // load COS leader images
    (async () => {
      try {
        const res = await fetch('/api/leader-images');
        const data = (await res.json()) as { ok?: boolean; images?: string[] };
        if (res.ok && data.images && data.images.length) {
          setLeaderImages(data.images);
          try {
            localStorage.setItem('leaderImagesCache', JSON.stringify(data.images.slice(0, 20)));
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore, will use fallback
      }
    })();
  }, []);

  useEffect(() => {
    const sourceLength = leaderImages.length || fallbackLeaderboard.length;
    if (!sourceLength) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sourceLength);
    }, 3000);
    return () => clearInterval(interval);
  }, [leaderImages.length]);

  useEffect(() => {
    // load COS CYCLER images for Regular Recycle
    (async () => {
      try {
        const res = await fetch('/api/cycler-images');
        const data = (await res.json()) as { ok?: boolean; images?: string[] };
        if (res.ok && data.images && data.images.length) {
          setCyclerImages(data.images);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const [cyclerImages, setCyclerImages] = useState<string[]>([]);

  const blindBoxes: Product[] = [
    { 
      id: 'Cyberpunk Series', 
      name: 'Cyberpunk Series',
      price: 100, 
      type: 'Blind Box',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7EiJ_hhLJf-3T-E0UgXeAz6trCapwiGJ84ObO6-z-gvVifDsOqxOaTck0RXXTU9Yke84Te_E52cOrV4thgrqhLjS9gjzgJ-nnvkndpvptlJO42_dBEs8BQP7cs32gAhPu2mMQCi2j2huJF4FrH37r5SEC4NY2D-ldbp4Nutcw_ustrhw6104cNAB89YE0uHB2CRWaqPzeN8-G3-1sjECcFEmKQbfw1wjOweqocYpon-mT3R-28Bhic_G__hKzOG8SMf66nuzpNwF6'
    },
    { 
      id: 'Retro Wave Series', 
      name: 'Retro Wave Series',
      price: 150, 
      type: 'Blind Box',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAoATIVSbrj9vO-WA5HbmZE18PtqpvOej5R9OwCauCnD-sEkqdhez4ikIfLujc0cYKoXsvnlFGp3YyAV-3gwWOVvGje_a6XL4e6XFQe76QLTsekVJFS0aRkEJCGONhnaA08hhyNrk0qw5B7zo6koIDb_RTE_11ewuIih8km6wNmjDAxrnCI9F7Oon8tZP1QhK7kA-d8sl1wlT2gNxKFvu9fW2TXZ9yIXpUEIIGmdBx7KtpKot0p6Yl2kF0vkSkyNoKF-e7_SK0CnrTT' 
    }
  ];

  const regularRecycleMystery: Product = {
    id: 'Regular Recycle Mystery',
    name: 'Mystery Recycle NFT',
    price: 60,
    type: 'Regular Recycle',
    image: 'https://lokada-1254090729.cos.ap-shanghai.myqcloud.com/FUNCTION/header.jpg',
  };

  const userCollections = [
    { id: 'col1', name: 'Regular Recycle', count: 0 },
    { id: 'col2', name: 'Neon Dreams', count: 2 },
  ];

  return (
    <div className="p-6 pb-32">
       <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="material-icons-round text-black text-xl">token</span>
          </div>
          <span className="font-display font-bold tracking-[0.2em] text-xl">AXON</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 glass rounded-full flex items-center justify-center">
            <span className="material-icons-round text-lg text-white/60">bedtime</span>
          </button>
          <button 
            onClick={onOpenCart}
            className="relative w-10 h-10 glass rounded-full flex items-center justify-center active:scale-90 transition-transform"
          >
            <span className="material-icons-round text-lg text-white">shopping_bag</span>
            <div className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border border-black animate-pulse"></div>
          </button>
        </div>
      </header>

      {/* Promo Card - Leaderboard carousel (image only, no text) */}
      <div className="mb-8 relative">
        <div className="bg-white/5 rounded-[2.5rem] relative overflow-hidden border border-white/10 group h-64">
          {(leaderImages.length ? leaderImages : fallbackLeaderboard.map((p) => p.image)).map((src, index) => {
            const meta = fallbackLeaderboard[index % fallbackLeaderboard.length];
            const product = meta;
            return (
              <div
                key={`${product.id}-${index}`}
                className={`absolute inset-0 transition-opacity duration-1000 flex items-center justify-center ${
                  index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                <img
                  src={src}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            );
          })}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {(leaderImages.length ? leaderImages : fallbackLeaderboard).map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentSlide ? 'bg-primary w-6' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Countdown Section - Limited Edition Blind Box */}
      <button 
        onClick={onOpenDrop}
        className="w-full bg-primary rounded-[2.5rem] p-6 mb-10 text-left text-black shadow-[0_0_30px_rgba(212,255,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
           <span className="material-icons-round text-8xl">keyboard_double_arrow_right</span>
        </div>
        <div className="flex justify-between items-center mb-4 relative z-10">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Special Event</span>
          <span className="bg-black text-primary px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
            Limited Blind Box
          </span>
        </div>
        <div className="flex items-center gap-4 relative z-10">
           <div className="flex flex-col items-center">
             <span className="font-display text-4xl font-black">{format(timeLeft.h)}</span>
             <span className="text-[8px] font-bold uppercase opacity-50">Hours</span>
           </div>
           <span className="font-display text-3xl font-black opacity-30">:</span>
           <div className="flex flex-col items-center">
             <span className="font-display text-4xl font-black">{format(timeLeft.m)}</span>
             <span className="text-[8px] font-bold uppercase opacity-50">Mins</span>
           </div>
           <span className="font-display text-3xl font-black opacity-30">:</span>
           <div className="flex flex-col items-center">
             <span className="font-display text-4xl font-black">{format(timeLeft.s)}</span>
             <span className="text-[8px] font-bold uppercase opacity-50">Secs</span>
           </div>
           <div className="ml-auto text-right">
             <span className="text-[10px] font-black uppercase tracking-tighter block">Tap to Access</span>
             <span className="material-icons-round text-3xl italic opacity-40">bolt</span>
           </div>
        </div>
      </button>

      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="font-display text-2xl font-black italic uppercase leading-none">Style Series</h3>
          <p className="text-white/40 text-xs font-bold mt-1">Mystery NFT Blind Boxes</p>
        </div>
        <button className="text-primary text-[10px] font-black uppercase tracking-widest">See All</button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        {blindBoxes.map(p => (
          <div key={p.id} className="glass rounded-[2.5rem] p-3 flex flex-col group">
            <div className="aspect-[4/5] bg-white/5 rounded-[2rem] overflow-hidden relative mb-4 flex flex-col items-center justify-center border border-white/10 group-hover:border-primary/30 transition-colors">
               <span className="material-icons-round text-6xl text-primary/80 mb-2 drop-shadow-[0_0_15px_rgba(212,255,0,0.5)]">redeem</span>
               <span className="absolute text-3xl font-display font-black text-black -mt-2">?</span>
               <button className="absolute top-3 right-3 w-8 h-8 glass rounded-full flex items-center justify-center">
                 <span className="material-icons-round text-primary text-sm">favorite</span>
               </button>
            </div>
            <div className="px-2 pb-2">
               <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mb-1">{p.type}</p>
               <h4 className="font-bold text-sm leading-tight mb-3">{p.id}</h4>
               <div className="flex justify-between items-center">
                 <span className="font-display font-black text-lg flex items-center gap-1">
                   <span className="material-icons-round text-primary text-sm">token</span>
                   {p.price}
                 </span>
                 <button 
                  onClick={() => onAddToCart?.(p)}
                  className="bg-primary text-black p-2 rounded-2xl shadow-lg active:scale-90 transition-transform"
                 >
                   <span className="material-icons-round">add</span>
                 </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Categories Navigation */}
      <div className="mb-6">
        <h3 className="font-display text-xl font-black italic uppercase leading-none mb-4">Categories</h3>
        <div className="flex flex-col gap-3">
          {userCollections.map((col, idx) => {
            const isRegular = idx === 0;
            return (
              <div key={col.id} className="glass p-4 rounded-[2rem] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden relative">
                    {isRegular && cyclerImages.length > 0 ? (
                      <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-0.5">
                        {cyclerImages.slice(0, 4).map((src) => (
                          <img
                            key={src}
                            src={src}
                            alt="Regular Recycle"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="material-icons-round text-white/60">collections</span>
                    )}
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-sm">{col.name}</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">{col.count} Items</p>
                  </div>
                </div>

                {isRegular ? (
                  <button
                    type="button"
                    onClick={() => {
                      onAddToCart?.({
                        ...regularRecycleMystery,
                        image: cyclerImages[0] || regularRecycleMystery.image,
                      });
                      onOpenCart?.();
                    }}
                    className="relative w-12 h-12 rounded-2xl bg-primary text-black shadow-[0_0_20px_rgba(212,255,0,0.35)] active:scale-90 transition-transform flex items-center justify-center overflow-hidden"
                    title="Buy mystery recycle NFT"
                  >
                    <span className="material-icons-round text-lg">help</span>
                  </button>
                ) : (
                  <span className="material-icons-round text-white/30">chevron_right</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Store;
