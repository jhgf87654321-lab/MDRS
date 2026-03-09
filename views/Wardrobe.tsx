import React, { useState } from 'react';

type AuthMode = 'signIn' | 'signUp';

interface PriceHistory {
  date: string;
  price: number;
}

interface WardrobeItem {
  id: string;
  name: string;
  price: number;
  image: string;
  purchaseDate: string;
  priceHistory: PriceHistory[];
  color?: string;
  colorName?: string;
}

interface WardrobeProps {
  onShare?: (mediaUrl: string) => void;
}

const Wardrobe: React.FC<WardrobeProps> = ({ onShare }) => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [isSuccess, setIsSuccess] = useState(false);
  const [customizingId, setCustomizingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [generatedNFT, setGeneratedNFT] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const leaderboardProducts = [
    { 
      id: 'Cyber Nomad #01', 
      name: 'Cyber Nomad #01',
      likes: 12450, 
      type: 'User NFT',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBaOKSjB2d9dKh6KOhkyXPq088wpSrv9uRrrQqJgnsAPSrk1GuXd6kPz1Vvk_-ziM5HXxbuSUtZPySyztFo6OBXQt_YvWZKvU8jLlEJDBgqhwYj8ZvdQ2eQuItMuahDt-BtBOHVb7Y-cUPgkfG_rxcs-Ma2d46RdD2nfXqV311B-QwJBA89uc8hauO03Bs8gmg6nyaOEGvHKz7isEhAFOCdbPBUMgNAbZ6yckmJ9zBMpQ9UO7G7kn5Wu1sRmuIsh4cgQTAYZzRF-2ZH' 
    },
    { 
      id: 'Neon Beast #42', 
      name: 'Neon Beast #42',
      likes: 9820, 
      type: 'User NFT',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAoATIVSbrj9vO-WA5HbmZE18PtqpvOej5R9OwCauCnD-sEkqdhez4ikIfLujc0cYKoXsvnlFGp3YyAV-3gwWOVvGje_a6XL4e6XFQe76QLTsekVJFS0aRkEJCGONhnaA08hhyNrk0qw5B7zo6koIDb_RTE_11ewuIih8km6wNmjDAxrnCI9F7Oon8tZP1QhK7kA-d8sl1wlT2gNxKFvu9fW2TXZ9yIXpUEIIGmdBx7KtpKot0p6Yl2kF0vkSkyNoKF-e7_SK0CnrTT' 
    },
    {
      id: 'Chrome Angel #07',
      name: 'Chrome Angel #07',
      likes: 8500,
      type: 'User NFT',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7EiJ_hhLJf-3T-E0UgXeAz6trCapwiGJ84ObO6-z-gvVifDsOqxOaTck0RXXTU9Yke84Te_E52cOrV4thgrqhLjS9gjzgJ-nnvkndpvptlJO42_dBEs8BQP7cs32gAhPu2mMQCi2j2huJF4FrH37r5SEC4NY2D-ldbp4Nutcw_ustrhw6104cNAB89YE0uHB2CRWaqPzeN8-G3-1sjECcFEmKQbfw1wjOweqocYpon-mT3R-28Bhic_G__hKzOG8SMf66nuzpNwF6'
    }
  ];

  React.useEffect(() => {
    const storedNFT = localStorage.getItem('generatedNFT');
    if (storedNFT) {
      setGeneratedNFT(storedNFT);
    }
  }, []);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % leaderboardProducts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [leaderboardProducts.length]);

  const [items, setItems] = useState<WardrobeItem[]>([
    { 
      id: '#FL-22', 
      name: 'Neon Pulse Runners', 
      price: 420, 
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCiEQCORVh-kLhp7NqmkpZ5HoOtxiVu4RhVvexm7jzjha_PPv68KVc_6CZjD5j4H9-IQBYqUWhiHWDqHgrEnNRDWagTRNXhjjt2pJ-sylQoTie7ASgZ_6m-VA3P0TG0s6MNwdHoLK33prSYM7Sdzmip7OBqpOxXu2MPOhsCe92UTT7dtqqS5LU2_KYbScFHF2hgeCVnhUJtKKywrRluBFqJi8_VRUUKkJl7kcyV658iG4d8u6IqCvNYX-zczx4bRuWS-4JRUgxsC4Xt',
      purchaseDate: '2024.11.12',
      priceHistory: [
        { date: '2024.11.12', price: 420 },
        { date: '2024.10.05', price: 380 },
        { date: '2024.08.20', price: 450 }
      ]
    },
    { 
      id: '#VS-89', 
      name: 'Holo-Vision Visor', 
      price: 1150, 
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAs0wGqI14i14Ax0ibu-oMdY0Qz0UMDGcy_wXhieO_nRGkaJ6w40Z7WPMqwoSKNcXPZ8eOpynERFt1QAgIw2RhJKFAfD-mj5gZEqJkblenGa143ioE3C_Kh1jt51A5pIrzxqT9O-Lak3g8to6rHbsJylBsrVIiLxqej-De-5Nl5EfVaYSF-y1jrF12VX2_waLd9ebJlewzcpRoBOxHbQrxo0VhBMp92HnbJlC7upA34pwgNJm12rudcdmYlJQO603QmXHfAiAJZUgKx',
      purchaseDate: '2025.01.20',
      priceHistory: [
        { date: '2025.01.20', price: 1150 },
        { date: '2024.12.15', price: 1200 },
        { date: '2024.11.01', price: 980 }
      ]
    },
    { 
      id: '#JK-04', 
      name: 'Carbon Shell Parka', 
      price: 890, 
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDw-AF6WJahwTXtwsOjJQL3IGfFWY0wwQgLx0szhnLrn3pKOXbflWaoZiuw2y_-ftITIVFMGgCIsGMmQ7ZdnES4lwuinSOKb3KBk0umLF1v8Sw3fEreOJReAq9L941kg4p_JsHEGaxPyx8OBuCAp7SxVJi9DC4Zjc7r2L_HuYCwQAMYUDwKH2fk3xBtN8mPeD6yXAw8EqU7bxgSEMaMFNTxHYQIHSRz7HjY8RS3N_c_HxrqX0DlqujqeMVnVHxCaErwWmBz4Lw3Qt2d',
      purchaseDate: '2024.09.15',
      priceHistory: [
        { date: '2024.09.15', price: 890 },
        { date: '2024.07.10', price: 920 },
        { date: '2024.05.04', price: 850 }
      ]
    }
  ]);

  const colorOptions = [
    { name: 'Default', filter: 'none', hex: '#D4FF00' },
    { name: 'Crimson', filter: 'hue-rotate(240deg) brightness(0.8)', hex: '#FF4D00' },
    { name: 'Cobalt', filter: 'hue-rotate(150deg)', hex: '#0066FF' },
    { name: 'Phantom', filter: 'grayscale(1) brightness(1.2)', hex: '#FFFFFF' }
  ];

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
    setTimeout(() => {
      setIsAuthOpen(false);
      setIsSuccess(false);
    }, 1800);
  };

  const toggleMode = () => {
    setAuthMode(authMode === 'signIn' ? 'signUp' : 'signIn');
  };

  const applyColor = (itemId: string, color: typeof colorOptions[0]) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, color: color.filter, colorName: color.name } : item
    ));
    setCustomizingId(null);
  };

  if (selectedItem) {
    return (
      <div className="relative min-h-screen flex flex-col bg_black animate-in fade-in duration-500">
        <div className="absolute inset-0 grid-bg pointer-events-none opacity-5"></div>
        
        <header className="relative z-20 px-8 pt-12 flex justify-between items-center">
          <button 
            onClick={() => setSelectedItem(null)}
            className="w-12 h-12 glass rounded-full flex items-center justify-center active:scale-90 transition-transform"
          >
            <span className="material-icons-round">west</span>
          </button>
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Item Decryption</p>
            <h2 className="text-xl font-future font-black tracking-tighter uppercase">PROTOCOL_{selectedItem.id.replace('#','')}</h2>
          </div>
          <div className="w-12"></div>
        </header>

        <main className="relative z-10 flex-1 flex flex-col px-8 pt-8 pb-32">
          <div className="bg-white/5 rounded-[3rem] p-10 mb-8 flex items-center justify-center relative overflow-hidden border border-white/10">
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-scan"></div>
            </div>
            <img 
              src={selectedItem.image} 
              alt={selectedItem.name} 
              style={{ filter: selectedItem.color || 'none' }}
              className="max-h-64 object-contain drop-shadow-[0_0_40px_rgba(212,255,0,0.2)]"
            />
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-3xl font-display font-black uppercase tracking-tighter leading-none">{selectedItem.name}</h3>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] bg-primary/20 text-primary px-3 py-1 rounded-full font-bold uppercase tracking-widest">Authenticated</span>
                  {selectedItem.colorName && <span className="text-[10px] bg-white/10 text-white/60 px-3 py-1 rounded-full font-bold uppercase tracking-widest">Tint: {selectedItem.colorName}</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-primary text-2xl font-display font-black">${selectedItem.price}</p>
                <p className="text-[8px] opacity-40 uppercase font-bold tracking-[0.2em]">Market Value</p>
              </div>
            </div>

            <div className="glass rounded-[2rem] p-6 space-y-6 border border-white/5">
              <div className="flex justify_between items-center">
                <div>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking_[0.3em] mb-1">Acquisition Date</p>
                  <p className="text-lg font-display font-black text-white">{selectedItem.purchaseDate}</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <span className="material-icons-round text-primary">event_available</span>
                </div>
              </div>

              <div className="h-px bg-white/10"></div>

              <div>
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.3em] mb-4">Value Trajectory</p>
                <div className="space-y-4">
                  {selectedItem.priceHistory.map((history, idx) => (
                    <div key={idx} className="flex justify_between items-center group">
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${idx === 0 ? 'bg-primary shadow-[0_0_8px_#D4FF00]' : 'bg-white/20'}`}></div>
                        <span className={`text-xs font-bold font-space ${idx === 0 ? 'text-white' : 'text-white/40'}`}>{history.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black ${idx === 0 ? 'text-primary' : 'text-white/60'}`}>${history.price}</span>
                        {idx < selectedItem.priceHistory.length - 1 && (
                          <span className={`material-icons-round text-xs ${history.price > selectedItem.priceHistory[idx+1].price ? 'text-primary' : 'text-accent'}`}>
                            {history.price > selectedItem.priceHistory[idx+1].price ? 'north_east' : 'south_east'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <button className="w-full py-5 rounded-2xl glass border border-white/10 flex items_center justify-center gap-2 active:scale-95 transition-all text-white/60 font-bold uppercase tracking-widest text-[10px]">
              <span className="material-icons-round text-sm">history_edu</span>
              View Ownership Ledger
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="relative z-50 px-8 pt-12 flex justify_between items-center mb-10">
        <div>
          <p className="text-[10px] uppercase tracking_[0.3em] font-space text_white/50 leading-none mb-2">Virtual Vault</p>
          <h2 className="text-3xl font-future font-black tracking-tighter leading-none">WARD<br/>ROBE</h2>
        </div>
        <button 
          onClick={() => {
            setAuthMode('signIn');
            setIsAuthOpen(true);
          }}
          className="glass p-1 rounded-full border border-white/10 shadow-2xl hover:border-primary/50 transition-all active:scale-90"
        >
          <img src="https://picsum.photos/100/100?seed=axon_prime" alt="Avatar" className="w-14 h-14 rounded-full object-cover" />
        </button>
      </header>

      <div className="px-8 pb-32">
        {/* Leaderboard Hero Showcase */}
        <div className="mb-8 relative">
          <div className="flex justify_between items-end mb-4">
            <div>
              <h3 className="font-display text-2xl font-black italic uppercase leading-none">Leaderboard</h3>
              <p className="text-white/40 text-[10px] font-bold mt-1 uppercase tracking-widest">This Week's Hottest NFTs</p>
            </div>
          </div>
          <div className="bg-white/5 rounded-[2.5rem] p-6 relative overflow-hidden border border-white/10 group h-80">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rotate-45 translate-x-12 -translate-y-12"></div>
            
            {leaderboardProducts.map((product, index) => (
              <div 
                key={product.id}
                className={`absolute inset-0 p-6 transition-opacity duration-1000 flex flex-col ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              >
                <div className="flex justify-between items-start mb-4 z-20">
                  <div>
                    <span className="inline-block px-3 py-1 bg-primary text-black text-[10px] font-bold uppercase rounded-full mb-2">Rank #{index + 1}</span>
                    <h3 className="text-2xl font-future font-black">{product.name}</h3>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="font-display font-black text-xl flex items-center gap-1 text-primary">
                      <span className="material-icons-round text-sm">favorite</span>
                      {product.likes.toLocaleString()}
                    </span>
                    <p className="text-[8px] opacity-60 uppercase tracking-widest mt-1">{product.type}</p>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center relative z-10">
                   <img 
                    src={product.image} 
                    alt={product.name}
                    className="max-h-full object-contain filter drop-shadow-2xl group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
              </div>
            ))}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {leaderboardProducts.map((_, idx) => (
                <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === currentSlide ? 'bg-primary w-6' : 'bg-white/30'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* My Cyber Collection Section */}
        <div className="mb-6">
          <div className="flex justify_between items-end mb-4">
            <div>
              <h3 className="font-display text-2xl font-black italic uppercase leading-none">My Cyber Collection</h3>
              <p className="text-white/40 text-[10px] font-bold mt-1 uppercase tracking-widest">Your Generated Assets</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {generatedNFT ? (
              <div className="glass rounded-[2rem] p-4 flex flex-col group relative">
                <div className="h-40 mb-4 flex items-center justify-center relative rounded-xl overflow-hidden border border-white/10">
                  <img 
                    src={generatedNFT} 
                    alt="My Avatar NFT" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" 
                  />
                  <div className="absolute top-2 right-2 bg-primary text-black text-[8px] font-bold px-2 py-1 rounded-full uppercase">
                    Minted
                  </div>
                </div>
                <h4 className="font-display text-xs uppercase font-bold leading-tight mb-1">Genesis Avatar</h4>
                <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mb-3">ID: #GEN-01</p>
                <button 
                  onClick={() => {
                    if (generatedNFT && onShare) {
                      onShare(generatedNFT);
                      return;
                    }
                    alert('Uploaded to Share Platform successfully!');
                  }}
                  className="w-full py-2 bg-white/10 hover:bg-primary hover:text-black rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-icons-round text-sm">public</span>
                  Share
                </button>
              </div>
            ) : (
              <div className="col-span-2 border-2 border-dashed border-white/10 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 opacity-50">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                  <span className="material-icons-round text-2xl">person_outline</span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-display font-bold uppercase block mb-1">No Assets Found</span>
                  <span className="text-[10px] text-white/60 uppercase tracking-widest">Generate an Avatar in the Creator tab</span>
                </div>
              </div>
            )}
            
            {/* Upload to Share Platform Button */}
            <button 
              onClick={() => {
                if (generatedNFT) {
                  if (onShare) {
                    onShare(generatedNFT);
                    return;
                  }
                  alert('Uploaded to Share Platform successfully!');
                } else {
                  alert('Please generate an Avatar NFT first.');
                }
              }}
              className="col-span-2 border-2 border-dashed border-primary/30 bg-primary/5 rounded-[2rem] p-4 flex flex-col items-center justify-center gap-2 hover:bg-primary/10 transition-colors active:scale-95 mt-4"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <span className="material-icons-round">cloud_upload</span>
              </div>
              <span className="text-[10px] font-display font-bold uppercase text-center text-primary">Upload to<br/>Share Platform</span>
            </button>
          </div>
        </div>
      </div>

      {isAuthOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="w-full max-w-[390px] bg-card-dark border border-white/10 rounded-[4.5rem] p-12 shadow-2xl relative overflow-hidden transition-all duration-500">
            <button 
              onClick={() => setIsAuthOpen(false)}
              className="absolute top-10 right-10 w-12 h-12 rounded-full glass flex items-center justify-center text-white/40 hover:text-white transition-colors z-20"
            >
              <span className="material-icons-round">close</span>
            </button>

            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-black mb-6 animate-pulse shadow-[0_0_30px_#D4FF00]">
                  <span className="material-icons-round text-4xl">{authMode === 'signIn' ? 'login' : 'how_to_reg'}</span>
                </div>
                <h3 className="text-3xl font-black mb-2 uppercase text-white tracking-tighter leading-none">{authMode === 'signIn' ? 'Synchronized' : 'Initialized'}</h3>
                <p className="text-white/30 text-[11px] uppercase tracking-[0.4em] font-bold mt-2">Neural Node Online</p>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="mb-14">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-[0.5em] mb-4 block underline underline-offset-8">Auth V.2.1</span>
                  <h3 className="text-4xl font-black leading-[0.9] uppercase tracking-tighter text-white">
                    {authMode === 'signIn' ? <>Establish<br/>Link</> : <>Avatar<br/>Genesis</>}
                  </h3>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/20 ml-6 tracking-[0.3em]">Address</label>
                    <input 
                      required
                      type="email" 
                      placeholder="USER_CORE@AXON.SYS"
                      className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] px-10 py-6 text-sm text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/10 font-space"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/20 ml-6 tracking-[0.3em]">Key</label>
                    <input 
                      required
                      type="password" 
                      placeholder="••••••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] px-10 py-6 text-sm text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-white text-black py-7 rounded-[3rem] flex items-center justify-between px-12 font-black uppercase tracking-[0.2em] text-[12px] mt-10 shadow-2xl active:scale-95 transition-all group"
                  >
                    <span>{authMode === 'signIn' ? 'Initiate' : 'Establish'}</span>
                    <div className="bg-primary p-3 rounded-2xl text-black group-hover:scale-110 transition-transform">
                      <span className="material-icons-round text-lg">{authMode === 'signIn' ? 'vpn_key' : 'fingerprint'}</span>
                    </div>
                  </button>
                </form>

                <button 
                  onClick={toggleMode} 
                  className="mt-12 text-[10px] text-white/30 uppercase tracking-[0.4em] hover:text-primary transition-colors text-center w-full font-bold"
                >
                  {authMode === 'signIn' ? "Request Protocol access" : "Node already active?"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Wardrobe;
