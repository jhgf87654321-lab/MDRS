
import React from 'react';
import { View } from '../types';

interface NavbarProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeView, onViewChange }) => {
  return (
    <nav 
      className="fixed left-0 right-0 bottom-0 max-w-[430px] mx-auto px-6 pt-4 z-[100]"
      style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="bg-black/80 backdrop-blur-2xl rounded-full h-18 flex items-center justify-around px-2 py-2 shadow-2xl border border-white/10">
        <button 
          onClick={() => onViewChange(View.STORE)}
          className={`flex flex-col items-center gap-1 transition-all ${activeView === View.STORE ? 'text-primary' : 'text-white/40'}`}
        >
          <span className="material-icons-round">shopping_bag</span>
          <span className="text-[8px] font-bold uppercase">Store</span>
        </button>
        
        <button 
          onClick={() => onViewChange(View.WARDROBE)}
          className={`flex flex-col items-center gap-1 transition-all ${activeView === View.WARDROBE ? 'text-primary' : 'text-white/40'}`}
        >
          <span className="material-icons-round">checkroom</span>
          <span className="text-[8px] font-bold uppercase">Wardrobe</span>
        </button>

        <button 
          onClick={() => onViewChange(View.TRY_ON)}
          className="w-14 h-14 -translate-y-4 rounded-full bg-primary text-black shadow-[0_0_25px_rgba(212,255,0,0.5)] flex items-center justify-center active:scale-90 transition-transform"
        >
          <span className="material-icons-round text-3xl">view_in_ar</span>
        </button>

        <button 
          onClick={() => onViewChange(View.CREATOR)}
          className={`flex flex-col items-center gap-1 transition-all ${activeView === View.CREATOR ? 'text-primary' : 'text-white/40'}`}
        >
          <span className="material-icons-round">person_outline</span>
          <span className="text-[8px] font-bold uppercase">Avatar</span>
        </button>

        <button 
          onClick={() => onViewChange(View.HOME)}
          className={`flex flex-col items-center gap-1 transition-all ${activeView === View.HOME ? 'text-primary' : 'text-white/40'}`}
        >
          <span className="material-icons-round">home</span>
          <span className="text-[8px] font-bold uppercase">Home</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
