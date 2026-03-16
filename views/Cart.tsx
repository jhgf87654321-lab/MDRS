
import React from 'react';
import { CartItem } from '../types';

interface CartProps {
  items: CartItem[];
  onBack: () => void;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onDeploy?: () => Promise<void> | void;
}

const Cart: React.FC<CartProps> = ({ items, onBack, onUpdateQty, onRemove, onDeploy }) => {
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const processingFee = items.length > 0 ? 12.50 : 0;
  const total = subtotal + processingFee;
  const [deploying, setDeploying] = React.useState(false);

  return (
    <div className="relative min-h-screen flex flex-col bg-black p-6">
      <header className="pt-12 flex justify-between items-center mb-10">
        <button 
          onClick={onBack}
          className="w-12 h-12 glass rounded-full flex items-center justify-center active:scale-90 transition-transform"
        >
          <span className="material-icons-round">west</span>
        </button>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">购物摘要</p>
          <h2 className="text-2xl font-future font-black tracking-tighter uppercase">装备袋</h2>
        </div>
        <div className="w-12 h-12"></div> {/* Spacer */}
      </header>

      <div className="flex-1 space-y-6">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="glass rounded-[2.5rem] p-4 flex gap-4 border border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="w-24 h-24 bg-white/5 rounded-3xl overflow-hidden flex items-center justify-center p-2">
                <img src={item.image} alt={item.name} className="max-h-full object-contain drop-shadow-lg" />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] text-primary font-bold uppercase tracking-widest">{item.id}</p>
                    <h4 className="font-bold text-sm uppercase leading-tight">{item.name}</h4>
                  </div>
                  <button 
                    onClick={() => onRemove(item.id)}
                    className="text-white/20 hover:text-accent p-1 active:scale-90 transition-all"
                  >
                    <span className="material-icons-round text-sm">delete_outline</span>
                  </button>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="font-display font-black text-lg">${item.price}</span>
                  <div className="flex items-center gap-3 glass px-3 py-1 rounded-full">
                    <button 
                      onClick={() => onUpdateQty(item.id, -1)}
                      className="text-white/40 hover:text-white"
                    >
                      <span className="material-icons-round text-xs">remove</span>
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                    <button 
                      onClick={() => onUpdateQty(item.id, 1)}
                      className="text-white/40 hover:text-white"
                    >
                      <span className="material-icons-round text-xs">add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <span className="material-icons-round text-6xl mb-4">inventory_2</span>
            <p className="text-sm font-display font-bold uppercase tracking-widest">购物车为空</p>
          </div>
        )}
      </div>

      <div className="mt-10 pb-32 space-y-6">
        <div className="glass rounded-[2.5rem] p-6 space-y-3">
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
            <span className="text-white/40">小计</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
            <span className="text-white/40">平台服务费</span>
            <span className="text-primary">+${processingFee.toFixed(2)}</span>
          </div>
          <div className="h-px bg-white/10 my-2"></div>
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">合计</span>
            <span className="text-3xl font-display font-black text-white">${total.toFixed(2)}</span>
          </div>
        </div>

        <button 
          disabled={items.length === 0}
          onClick={async () => {
            if (!onDeploy || deploying || items.length === 0) return;
            setDeploying(true);
            try {
              await onDeploy();
            } finally {
              setDeploying(false);
            }
          }}
          className={`w-full py-6 rounded-[2rem] flex items-center justify-between px-10 group active:scale-95 transition-all shadow-2xl relative overflow-hidden ${items.length === 0 ? 'bg-white/10 text-white/20 cursor-not-allowed' : 'bg-white text-black'}`}
        >
          {items.length > 0 && (
            <div className="absolute inset-0 bg-primary/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
          )}
          <span className="relative z-10 text-lg font-black uppercase tracking-widest">{deploying ? '处理中…' : '确认购买'}</span>
          <div className={`relative z-10 p-2 rounded-xl flex items-center justify-center ${items.length === 0 ? 'bg-white/5 text-white/10' : 'bg-primary text-black'}`}>
            <span className="material-icons-round">{deploying ? 'hourglass_top' : 'near_me'}</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Cart;
