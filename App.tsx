
import React, { useState } from 'react';
import { View, Product, CartItem } from './types';
import Navbar from './components/Navbar';
import Home from './views/Home';
import Wardrobe from './views/Wardrobe';
import TryOn from './views/TryOn';
import Creator from './views/Creator';
import Store from './views/Store';
import NewReleases from './views/NewReleases';
import Cart from './views/Cart';
import Collection from './views/Collection';
import Admin from './views/Admin';
import ShareHub from './views/ShareHub';
import CreatePost from './views/CreatePost';
import Auth from './views/Auth';
import { addNftToMyProfile } from './lib/userProfile';
import { upsertImageInfo } from './lib/imageInfo';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [shareMedia, setShareMedia] = useState<string[]>([]);

  const handleAddToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setCurrentView(View.CART);
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = item.qty + delta;
          if (newQty <= 0) return null;
          return { ...item, qty: newQty };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleDeploy = async () => {
    const items = cartItems.slice();
    if (items.length === 0) return;

    // Only the mystery recycle item has a real fulfillment flow right now.
    const mystery = items.find((x) => x.id === 'Regular Recycle Mystery');
    if (!mystery) {
      alert('这些商品暂未接入结算。');
      return;
    }

    const qty = Math.max(1, mystery.qty || 1);
    for (let i = 0; i < qty; i += 1) {
      const r = await fetch('/api/recycle-mystery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const t = await r.text();
      const data = t ? (JSON.parse(t) as any) : {};
      if (!r.ok || !data?.url || !data?.serialNumber) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Recycle purchase failed');
      }
      const cosUrl = String(data.url);
      const serialNumber = String(data.serialNumber);

      try {
        await addNftToMyProfile({ cosUrl, serialNumber, source: 'trade' });
      } catch {
        // ignore
      }

      try {
        const ar = await fetch('/api/analyze-outfit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: cosUrl }),
        });
        const at = await ar.text();
        const ad = at ? (JSON.parse(at) as any) : {};
        if (ar.ok && ad?.info) {
          await upsertImageInfo({ serialNumber, imageUrl: cosUrl, source: 'trade', info: ad.info });
        }
      } catch {
        // ignore
      }
    }

    setCartItems([]);
    window.dispatchEvent(new Event('axon:collection-updated'));
    setCurrentView(View.WARDROBE);
  };

  const renderView = () => {
    switch (currentView) {
      case View.HOME:
        return <Home onEnter={() => setCurrentView(View.SHARE_HUB)} onNavigate={setCurrentView} />;
      case View.WARDROBE:
        return (
          <Wardrobe
            onShare={(media) => {
              setShareMedia([media]);
              setCurrentView(View.CREATE_POST);
            }}
            onOpenShareHub={() => setCurrentView(View.SHARE_HUB)}
            onOpenAuth={() => setCurrentView(View.AUTH)}
          />
        );
      case View.TRY_ON: return <TryOn />;
      case View.CREATOR: return <Creator onNavigate={setCurrentView} />;
      case View.AUTH: return <Auth onNavigate={setCurrentView} />;
      case View.STORE: return (
        <Store 
          onOpenDrop={() => setCurrentView(View.NEW_RELEASES)} 
          onOpenCollection={() => setCurrentView(View.COLLECTION)}
          onOpenCart={() => setCurrentView(View.CART)} 
          onAddToCart={handleAddToCart}
        />
      );
      case View.NEW_RELEASES: return (
        <NewReleases 
          onBack={() => setCurrentView(View.STORE)} 
          onAddToCart={handleAddToCart}
        />
      );
      case View.COLLECTION: return (
        <Collection 
          onBack={() => setCurrentView(View.STORE)} 
          onAddToCart={handleAddToCart}
        />
      );
      case View.CART: return (
        <Cart 
          items={cartItems}
          onBack={() => setCurrentView(View.STORE)} 
          onUpdateQty={handleUpdateQty}
          onRemove={handleRemoveItem}
          onDeploy={handleDeploy}
        />
      );
      case View.ADMIN:
        return <Admin />;
      case View.SHARE_HUB:
        return <ShareHub onNavigate={setCurrentView} />;
      case View.CREATE_POST:
        return (
          <CreatePost
            initialMedia={shareMedia}
            onBack={() => setCurrentView(View.WARDROBE)}
            onSuccess={() => setCurrentView(View.SHARE_HUB)}
          />
        );
      default:
        return <Home onEnter={() => setCurrentView(View.SHARE_HUB)} onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="flex justify-center min-h-screen bg-black overflow-hidden select-none">
      <div className="relative w-full max-w-[430px] h-screen bg-background-dark overflow-hidden flex flex-col">
        {/* Background Grids */}
        <div className="fixed inset-0 grid-bg pointer-events-none opacity-10"></div>
        
        {/* Main Content Area — pb for fixed bottom nav */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 pb-28">
          {renderView()}
        </div>

        {/* Global Navigation */}
        <Navbar activeView={currentView} onViewChange={setCurrentView} />
      </div>
    </div>
  );
};

export default App;
