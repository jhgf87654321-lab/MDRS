
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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

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

  const renderView = () => {
    switch (currentView) {
      case View.HOME: return <Home onEnter={() => setCurrentView(View.STORE)} />;
      case View.WARDROBE: return <Wardrobe />;
      case View.TRY_ON: return <TryOn />;
      case View.CREATOR: return <Creator />;
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
        />
      );
      default: return <Home onEnter={() => setCurrentView(View.STORE)} />;
    }
  };

  return (
    <div className="flex justify-center min-h-screen bg-black overflow-hidden select-none">
      <div className="relative w-full max-w-[430px] h-screen bg-background-dark overflow-hidden flex flex-col">
        {/* Background Grids */}
        <div className="fixed inset-0 grid-bg pointer-events-none opacity-10"></div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative z-10">
          {renderView()}
        </div>

        {/* Global Navigation */}
        <Navbar activeView={currentView} onViewChange={setCurrentView} />
      </div>
    </div>
  );
};

export default App;
