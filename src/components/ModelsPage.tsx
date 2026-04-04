import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Search, Filter } from 'lucide-react';

interface ModelsPageProps {
  onBack: () => void;
}

const mockModels = [
  { id: 1, name: "Aria", author: "@studio_x", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80" },
  { id: 2, name: "Nova", author: "@digital_dreams", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80" },
  { id: 3, name: "Kai", author: "@creator_01", img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80" },
  { id: 4, name: "Luna", author: "@synth_art", img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80" },
  { id: 5, name: "Orion", author: "@future_faces", img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80" },
  { id: 6, name: "Stella", author: "@pixel_perfect", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80" },
  { id: 7, name: "Atlas", author: "@meta_models", img: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80" },
  { id: 8, name: "Lyra", author: "@ai_atelier", img: "https://images.unsplash.com/photo-1488161628813-04466f872507?auto=format&fit=crop&w=800&q=80" },
];

export function ModelsPage({ onBack }: ModelsPageProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white text-black font-sans flex flex-col z-[100] overflow-hidden"
    >
      {/* Header */}
      <div className="flex justify-between items-center p-8 border-b border-black/5 bg-white z-10">
        <button 
          onClick={onBack} 
          className="flex items-center gap-4 text-xs font-bold tracking-widest uppercase hover:opacity-50 transition-opacity"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="text-2xl font-display font-bold tracking-tighter uppercase">Public Models</div>
        <div className="flex gap-6 text-black/40">
          <button className="hover:text-black transition-colors"><Search size={20} /></button>
          <button className="hover:text-black transition-colors"><Filter size={20} /></button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 p-8 overflow-y-auto no-scrollbar bg-[#f8f8f8]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {mockModels.map((m, i) => (
            <motion.div 
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group cursor-pointer flex flex-col gap-4"
            >
              <div className="aspect-[3/4] bg-black/5 overflow-hidden relative shadow-sm border border-black/5">
                <img 
                  src={m.img} 
                  alt={m.name}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-105" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500" />
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="font-bold text-sm tracking-wide">{m.name}</span>
                <span className="text-[9px] font-bold text-black/40 tracking-widest uppercase">{m.author}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
