
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

  const products: Product[] = [
    { 
      id: 'Vortex Shell J1', 
      name: 'Vortex Shell J1',
      price: 499, 
      type: 'Physical',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBaOKSjB2d9dKh6KOhkyXPq088wpSrv9uRrrQqJgnsAPSrk1GuXd6kPz1Vvk_-ziM5HXxbuSUtZPySyztFo6OBXQt_YvWZKvU8jLlEJDBgqhwYj8ZvdQ2eQuItMuahDt-BtBOHVb7Y-cUPgkfG_rxcs-Ma2d46RdD2nfXqV311B-QwJBA89uc8hauO03Bs8gmg6nyaOEGvHKz7isEhAFOCdbPBUMgNAbZ6yckmJ9zBMpQ9UO7G7kn5Wu1sRmuIsh4cgQTAYZzRF-2ZH' 
    },
    { 
      id: 'Neon Stride S1', 
      name: 'Neon Stride S1',
      price: 320, 
      type: 'Hybrid',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAoATIVSbrj9vO-WA5HbmZE18PtqpvOej5R9OwCauCnD-sEkqdhez4ikIfLujc0cYKoXsvnlFGp3YyAV-3gwWOVvGje_a6XL4e6XFQe76QLTsekVJFS0aRkEJCGONhnaA08hhyNrk0qw5B7zo6koIDb_RTE_11ewuIih8km6wNmjDAxrnCI9F7Oon8tZP1QhK7kA-d8sl1wlT2gNxKFvu9fW2TXZ9yIXpUEIIGmdBx7KtpKot0p6Yl2kF0vkSkyNoKF-e7_SK0CnrTT' 
    }
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

      {/* Promo Card */}
      <div className="relative h-60 bg-black rounded-[2.5rem] overflow-hidden border border-white/5 mb-8">
        <img 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKVvSeS_jFSKy_qYFh-qzTPXQG9c5W4lGXCAAMHC6UXlJuZtUhYFlkwLFL_XFT00NjnEpki-BE-8HHYTNtx6LYoABdgihwU82UpPf4dUweM3KGB8W2X26m6yt38zS4zrzk2NBnVLKFgRFoTOTvdXQ-IdzKojIAAzmaYVpPaX274TPnfN9CgGPM5Pt0PPWIHbbaXUpX8s37IuL14D9Ue5O43PbRosooKlWKTW7_1EYFePwdObEdM8ZLWxTP2okoK9lRJy8Qt8v-ta-X" 
          alt="Sneaker Promo"
          className="w-full h-full object-cover -rotate-12 scale-125 opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <h2 className="font-display text-4xl font-black text-white leading-none mb-4">TECH<br/>WEAR</h2>
          <button 
            onClick={onOpenCollection}
            className="bg-white text-black px-6 py-2 rounded-full font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
          >
            <span>View Collection</span>
            <span className="material-icons-round text-sm">east</span>
          </button>
        </div>
      </div>

      {/* Countdown Section */}
      <button 
        onClick={onOpenDrop}
        className="w-full bg-primary rounded-[2.5rem] p-6 mb-10 text-left text-black shadow-[0_0_30px_rgba(212,255,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
           <span className="material-icons-round text-8xl">keyboard_double_arrow_right</span>
        </div>
        <div className="flex justify-between items-center mb-4 relative z-10">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Limited Drop</span>
          <span className="bg-black text-primary px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
            Live Now
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
          <h3 className="font-display text-2xl font-black italic uppercase leading-none">New Drops</h3>
          <p className="text-white/40 text-xs font-bold mt-1">Curated for your cyber wardrobe</p>
        </div>
        <button className="text-primary text-[10px] font-black uppercase tracking-widest">See All</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {products.map(p => (
          <div key={p.id} className="glass rounded-[2.5rem] p-3 flex flex-col group">
            <div className="aspect-[4/5] bg-white/5 rounded-[2rem] overflow-hidden relative mb-4">
               <img src={p.image} alt={p.id} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
               <button className="absolute top-3 right-3 w-8 h-8 glass rounded-full flex items-center justify-center">
                 <span className="material-icons-round text-white/50 text-sm">favorite</span>
               </button>
            </div>
            <div className="px-2 pb-2">
               <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mb-1">{p.type}</p>
               <h4 className="font-bold text-sm leading-tight mb-3">{p.id}</h4>
               <div className="flex justify-between items-center">
                 <span className="font-display font-black text-lg">${p.price}</span>
                 <button 
                  onClick={() => onAddToCart?.(p)}
                  className="bg-primary text-black p-2 rounded-xl shadow-lg active:scale-90 transition-transform"
                 >
                   <span className="material-icons-round">add</span>
                 </button>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Store;
