import React, { useState } from 'react';
import { uploadImageToCloudBase } from '../lib/apiClient';
import { addNftToMyProfile, listMyOwnedNfts } from '../lib/userProfile';

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

type CyberCollectionItem = {
  image: string;
  serialNumber: string;
  isSpecial: boolean;
  theme: string;
  prompt: string;
};

interface WardrobeProps {
  onShare?: (mediaUrl: string) => void;
  onOpenShareHub?: () => void;
  onOpenAuth?: () => void;
}

const Wardrobe: React.FC<WardrobeProps> = ({ onShare, onOpenShareHub, onOpenAuth }) => {
  const [customizingId, setCustomizingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [generatedNFT, setGeneratedNFT] = useState<string | null>(null);
  const [collection, setCollection] = useState<CyberCollectionItem[]>([]);
  const [selectedNft, setSelectedNft] = useState<CyberCollectionItem | null>(null);
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

  const reloadLocalAssets = async () => {
    try {
      // Only use CloudBase profile owned NFTs (COS urls). Do not fall back to browser cache.
      try {
        // Best-effort: if mint finished on mobile but sync failed, retry here when Wardrobe opens.
        // This makes mobile behavior match desktop even under flaky networks/session delays.
        try {
          const pendingRaw = localStorage.getItem('axon:pending-mint-sync');
          if (pendingRaw) {
            const pending = JSON.parse(pendingRaw) as {
              serialNumber?: string;
              cosUrl?: string;
              dataUrl?: string;
            };
            const serialNumber = typeof pending.serialNumber === 'string' ? pending.serialNumber : undefined;
            let cosUrl = typeof pending.cosUrl === 'string' ? pending.cosUrl : undefined;
            if (!cosUrl && typeof pending.dataUrl === 'string' && pending.dataUrl.startsWith('data:')) {
              const uniqueSuffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
              const fileName = `${(serialNumber || 'No_00000000').replace(/\./g, '_')}_${uniqueSuffix}.webp`;
              cosUrl = await uploadImageToCloudBase(pending.dataUrl, { prefix: 'MINT/', fileName });
            }
            if (cosUrl) {
              await addNftToMyProfile({ cosUrl, serialNumber, source: 'mint' });
              localStorage.removeItem('axon:pending-mint-sync');
            }
          }
        } catch (e) {
          // Keep silent here; user already sees the "后台校验" tip.
          console.warn('pending mint sync retry skipped', e);
        }

        const owned = await listMyOwnedNfts();
        const validOwned = Array.isArray(owned)
          ? owned.filter((x) => typeof x.cosUrl === 'string' && x.cosUrl.trim().length > 0)
          : [];
        const next: CyberCollectionItem[] = validOwned.map((x) => ({
          image: x.cosUrl,
          cosUrl: x.cosUrl,
          serialNumber: x.serialNumber || 'No.00000000',
          isSpecial: (x.serialNumber || '').startsWith('Sp.'),
          theme: 'Owned',
          prompt: '',
        }));
        setCollection(next);
        setGeneratedNFT(next[0]?.image ?? null);
        return;
      } catch {
        setCollection([]);
        setGeneratedNFT(null);
        return;
      }
    } catch (e) {
      console.error('Failed to load cyber collection', e);
    }
  };

  React.useEffect(() => {
    void reloadLocalAssets();

    const onUpdated = () => void reloadLocalAssets();
    const onVis = () => {
      if (document.visibilityState === 'visible') void reloadLocalAssets();
    };
    window.addEventListener('axon:collection-updated', onUpdated);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('axon:collection-updated', onUpdated);
      document.removeEventListener('visibilitychange', onVis);
    };
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
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">物品解密</p>
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
                  <span className="text-[10px] bg-primary/20 text-primary px-3 py-1 rounded-full font-bold uppercase tracking-widest">已认证</span>
                  {selectedItem.colorName && <span className="text-[10px] bg-white/10 text-white/60 px-3 py-1 rounded-full font-bold uppercase tracking-widest">Tint: {selectedItem.colorName}</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-primary text-2xl font-display font-black">${selectedItem.price}</p>
                <p className="text-[8px] opacity-40 uppercase font-bold tracking-[0.2em]">市场价值</p>
              </div>
            </div>

            <div className="glass rounded-[2rem] p-6 space-y-6 border border-white/5">
              <div className="flex justify_between items-center">
                <div>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking_[0.3em] mb-1">获取日期</p>
                  <p className="text-lg font-display font-black text-white">{selectedItem.purchaseDate}</p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <span className="material-icons-round text-primary">event_available</span>
                </div>
              </div>

              <div className="h-px bg-white/10"></div>

              <div>
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.3em] mb-4">价值走势</p>
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

  const latestNft = collection[0];

  return (
    <div className="min-h-full flex flex-col">
      {/* Header aligned with Home / Creator avatar placement */}
      <header className="relative z-50 px-8 pt-12 flex justify-between items-center mb-10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-space text-white/50 leading-none mb-2">
            Virtual Vault
          </p>
          <h2 className="text-3xl font-future font-black tracking-tighter leading-none">
            WARD
            <br />
            ROBE
          </h2>
        </div>
        <button
          onClick={() => {
            if (onOpenAuth) {
              onOpenAuth();
            }
          }}
          className="glass p-1 rounded-full border border-white/10 shadow-2xl hover:border-primary/50 transition-all active:scale-90"
        >
          <img
            src="https://picsum.photos/100/100?seed=axon_prime"
            alt="Avatar"
            className="w-14 h-14 rounded-full object-cover"
          />
        </button>
      </header>

      <div className="px-8 pb-32">
        {/* Share Platform Hero (from Store) */}
        <div className="relative h-60 bg-black rounded-[2.5rem] overflow-hidden border border-white/5 mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <span className="material-icons-round text-5xl text-primary mb-2">public</span>
            <h2 className="font-display text-4xl font-black text-white leading-none mb-2">
              分享
              <br />
              平台
            </h2>
            <p className="text-[10px] text-white/60 uppercase tracking-widest mb-4">发现与交易用户 NFT</p>
            <button
              onClick={() => {
                if (onOpenShareHub) {
                  onOpenShareHub();
                } else {
                  alert('正在打开分享平台…');
                }
              }}
              className="bg-white text-black px-6 py-2 rounded-full font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
            >
              <span>进入平台</span>
              <span className="material-icons-round text-sm">east</span>
            </button>
          </div>
        </div>

        {/* My Cyber Collection Section */}
        <div className="mb-6">
          <div className="flex justify_between items-end mb-4">
            <div>
              <h3 className="font-display text-2xl font-black italic uppercase leading-none">我的藏品</h3>
              <p className="text-white/40 text-[10px] font-bold mt-1 uppercase tracking-widest">你的生成资产</p>
              <p className="text-white/30 text-[10px] font-bold mt-2 tracking-widest">
                生成的图像需在后台校验后更新，请稍等
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {collection.length > 0 ? (
              <>
                {collection.slice(0, 8).map((item) => (
                  <div key={item.serialNumber} className="glass rounded-[2rem] p-3 flex flex-col group relative">
                    <button
                      type="button"
                      onClick={() => setSelectedNft(item)}
                      className="h-36 mb-3 flex items-center justify-center relative rounded-2xl overflow-hidden border border-white/10 w-full"
                    >
                      <img
                        src={item.image}
                        alt={item.theme || 'NFT'}
                        className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500"
                      />
                      <div className="absolute top-2 right-2 bg-primary text-black text-[8px] font-bold px-2 py-1 rounded-full uppercase">
                        {item.isSpecial ? '特别' : '已铸造'}
                      </div>
                    </button>
                    <h4 className="font-display text-[11px] uppercase font-bold leading-tight mb-1 line-clamp-1">
                      {item.theme || '初代形象'}
                    </h4>
                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                      {item.serialNumber}
                    </p>
                  </div>
                ))}
              </>
            ) : (
              <div className="col-span-2 border-2 border-dashed border-white/10 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 opacity-50">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                  <span className="material-icons-round text-2xl">person_outline</span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-display font-bold uppercase block mb-1">暂无资产</span>
                  <span className="text-[10px] text-white/60 uppercase tracking-widest">请在“形象”中生成你的 NFT</span>
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
                  alert('已上传到分享平台！');
                } else {
                  alert('请先生成形象 NFT。');
                }
              }}
              className="col-span-2 border-2 border-dashed border-primary/30 bg-primary/5 rounded-[2rem] p-4 flex flex-col items-center justify-center gap-2 hover:bg-primary/10 transition-colors active:scale-95 mt-4"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <span className="material-icons-round">cloud_upload</span>
              </div>
              <span className="text-[10px] font-display font-bold uppercase text-center text-primary">上传到<br/>分享平台</span>
            </button>
          </div>
        </div>
      </div>

      {selectedNft && (
        <div className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-card-dark rounded-[3rem] border border-white/10 p-6 relative">
            <button
              type="button"
              onClick={() => setSelectedNft(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full glass flex items-center justify-center text-white/60 hover:text-white"
            >
              <span className="material-icons-round">close</span>
            </button>
            <div className="mb-4">
              <p className="text-[10px] text-primary font-bold uppercase tracking-[0.3em] mb-1">
                {selectedNft.isSpecial ? '特别版 NFT' : '标准版 NFT'}
              </p>
              <h3 className="text-xl font-display font-black uppercase tracking-tight">
                {selectedNft.theme || '形象 NFT'}
              </h3>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-[0.3em] mt-1">
                {selectedNft.serialNumber}
              </p>
            </div>
            <div className="rounded-3xl overflow-hidden border border-white/10 mb-4">
              <img src={selectedNft.image} alt={selectedNft.theme} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    const url = selectedNft.image;
                    const name = (selectedNft.serialNumber || 'nft').replace(/\s/g, '_') + '.jpg';
                    try {
                      if (url.startsWith('data:')) {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = name;
                        a.click();
                        return;
                      }
                      const res = await fetch(url, { mode: 'cors' });
                      const blob = await res.blob();
                      const obj = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = obj;
                      a.download = name;
                      a.click();
                      URL.revokeObjectURL(obj);
                    } catch (e) {
                      console.error(e);
                      window.open(url, '_blank');
                    }
                  }}
                  className="flex-1 py-3 rounded-2xl bg-primary/20 hover:bg-primary hover:text-black text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 border border-primary/40"
                >
                  <span className="material-icons-round text-sm">download</span>
                  保存
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const fetchBlobNoCache = async (url: string) => {
                        // Some CDNs/COS may respond 304 without a usable body for fetch(),
                        // so we force a fresh response and retry with a cache-buster.
                        const first = await fetch(url, { mode: 'cors', cache: 'no-store' });
                        if (first.ok) return await first.blob();
                        const busted =
                          url + (url.includes('?') ? '&' : '?') + `cb=${Date.now().toString(16)}`;
                        const second = await fetch(busted, { mode: 'cors', cache: 'reload' });
                        if (!second.ok) {
                          throw new Error(`Failed to fetch image (${second.status})`);
                        }
                        return await second.blob();
                      };

                      const name =
                        (selectedNft.serialNumber || 'nft')
                          .replace(/\s/g, '_')
                          .replace(/\./g, '_') + '_2k.webp';
                      let dataUrl: string;
                      if (selectedNft.image.startsWith('data:')) {
                        dataUrl = selectedNft.image;
                      } else {
                        const blob = await fetchBlobNoCache(selectedNft.image);
                        if (!blob.size) throw new Error('Empty image blob');
                        dataUrl = await new Promise<string>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () => resolve(String(reader.result));
                          reader.onerror = () => reject(new Error('read failed'));
                          reader.readAsDataURL(blob);
                        });
                      }
                      const resp = await fetch('/api/upscale-2k', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ dataUrl, fileName: name }),
                      });
                      const text = await resp.text();
                      const data = text ? (JSON.parse(text) as any) : {};
                      if (!resp.ok || !data?.url) {
                        throw new Error(typeof data?.error === 'string' ? data.error : 'Upscale failed');
                      }
                      const url = String(data.url);
                      const b2 = await fetchBlobNoCache(url);
                      if (!b2.size) throw new Error('Empty 2K image blob');
                      const obj = URL.createObjectURL(b2);
                      const a = document.createElement('a');
                      a.href = obj;
                      a.download = name;
                      a.click();
                      URL.revokeObjectURL(obj);
                    } catch (e) {
                      console.error(e);
                      alert('生成 2K 失败。');
                    }
                  }}
                  className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-primary hover:text-black text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 border border-white/20"
                >
                  <span className="material-icons-round text-sm">high_quality</span>
                  生成 2K
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onShare) {
                      onShare(selectedNft.image);
                      return;
                    }
                    alert('已上传到分享平台！');
                  }}
                  className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-primary hover:text-black text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1"
                >
                  <span className="material-icons-round text-sm">public</span>
                  分享
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = collection.filter((c) => c.serialNumber !== selectedNft.serialNumber);
                    setCollection(next);
                    localStorage.setItem('myCyberCollection', JSON.stringify(next));
                    setSelectedNft(null);
                  }}
                  className="w-28 py-3 rounded-2xl bg-red-500/10 border border-red-500/40 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/30"
                >
                  回收
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Wardrobe;
