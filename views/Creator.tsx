
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

type AuthMode = 'signIn' | 'signUp';
type Category = 'Body' | 'Head' | 'Skin' | 'Style';

interface ParameterSet {
  label: string;
  key: string;
  value: number;
}

const Creator: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('Body');
  
  // NFT Themes and Traits for randomness
  const themes = ['High-Fashion Editorial', 'Urban Techwear', 'Minimalist Avant-Garde', 'Graphic Lookbook', 'Streetwear Culture', 'Avant-Garde Magazine', 'Modern Tech-Fashion'];
  const materials = ['Technical Nylon', 'Patterned Silk', 'Matte Polymer', 'Transparent Vinyl', 'Heavy Cotton', 'Reflective Fabric'];
  const styles = ['Magazine Cover Layout', 'Fashion Lookbook Spread', 'Graphic Design Poster', 'Editorial Studio Portrait', 'Minimalist UI Overlay'];

  // Parameter states for each category
  const [params, setParams] = useState<Record<string, number>>({
    muscularity: 82,
    definition: 45,
    proportions: 64,
    jawline: 30,
    eyeWidth: 55,
    faceDepth: 40,
    texture: 70,
    luminance: 25,
    glow: 15,
    chromaticity: 90,
    metallic: 60,
    opacity: 100
  });

  const [selectedSkinColor, setSelectedSkinColor] = useState('#E0AC69'); // Default skin tone

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNFT, setGeneratedNFT] = useState<string | null>(null);
  const [nftMetadata, setNftMetadata] = useState<{ theme: string; rarity: string } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [isSuccess, setIsSuccess] = useState(false);

  const skinColors = [
    { name: 'Light Bio', hex: '#FFDBAC' },
    { name: 'Warm Bio', hex: '#F1C27D' },
    { name: 'Tan Bio', hex: '#E0AC69' },
    { name: 'Rich Bio', hex: '#8D5524' },
    { name: 'Deep Bio', hex: '#3B2219' },
    { name: 'Phantom', hex: '#E2E2E2' },
    { name: 'Obsidian', hex: '#1A1A1A' },
    { name: 'Neon Puls', hex: '#D4FF00' },
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

  // Define parameters based on active category
  const getActiveParams = (): ParameterSet[] => {
    switch (activeCategory) {
      case 'Body':
        return [
          { label: 'Muscularity', key: 'muscularity', value: params.muscularity },
          { label: 'Definition', key: 'definition', value: params.definition },
          { label: 'Proportions', key: 'proportions', value: params.proportions },
        ];
      case 'Head':
        return [
          { label: 'Jawline', key: 'jawline', value: params.jawline },
          { label: 'Eye Width', key: 'eyeWidth', value: params.eyeWidth },
          { label: 'Face Depth', key: 'faceDepth', value: params.faceDepth },
        ];
      case 'Style':
        return [
          { label: 'Chromaticity', key: 'chromaticity', value: params.chromaticity },
          { label: 'Metallic', key: 'metallic', value: params.metallic },
          { label: 'Opacity', key: 'opacity', value: params.opacity },
        ];
      default:
        return [];
    }
  };

  const updateParam = (key: string, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const generateNFT = async () => {
    setGenerationError(null);
    setIsGenerating(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
        throw new Error(
          'Missing Gemini API key. Set VITE_GEMINI_API_KEY in .env.local (restart the dev server after changing env vars).'
        );
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Randomize traits for high variety
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];
      const randomMaterial = materials[Math.floor(Math.random() * materials.length)];
      const randomStyle = styles[Math.floor(Math.random() * styles.length)];
      const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];
      const randomRarity = rarities[Math.floor(Math.random() * rarities.length)];

      setNftMetadata({ theme: randomTheme, rarity: randomRarity });

      const prompt = `A professional ${randomStyle} for a high-end fashion NFT. 
      Theme: ${randomTheme}. 
      The composition is a sophisticated graphic design layout, resembling a premium fashion magazine or a modern streetwear lookbook. 
      Background: Clean, minimalist studio setting (white, light grey, or soft neutral tones) with large, bold, artistic typography (words like "CULTURE", "AXON", "FUTURE", "SONNY", "DESOLATE"). 
      Graphic Elements: Overlay the image with technical UI details, barcodes, fine technical text, cross-hairs, and minimalist graphic annotations. 
      Character: A stylish model with a unique fashion identity. Instead of a full helmet, the model might wear a sleek mask, designer goggles, or a high-tech headpiece that allows the face and hair to be part of the aesthetic. 
      Outfit: Fashion-forward techwear or avant-garde clothing made of ${randomMaterial}, such as a structured hoodie, a sleek bodysuit, or a patterned garment. 
      Skin tone: ${selectedSkinColor}. 
      Body type: ${params.muscularity > 70 ? 'muscular' : 'lean'}. 
      Photography: High-end fashion photography, studio lighting, soft shadows, photorealistic, 8k uhd, sharp focus, realistic skin texture. 
      The overall vibe is "High-Fashion Editorial" meets "Graphic Design", clean and modern.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          setGeneratedNFT(`data:image/png;base64,${base64EncodeString}`);
          break;
        }
      }
    } catch (error) {
      const rawMessage =
        (typeof (error as any)?.message === 'string' && (error as any).message) || String(error);

      let prettyMessage = rawMessage;
      if (rawMessage.includes('User location is not supported for the API use')) {
        prettyMessage =
          'Gemini API is not available from your current network/location. Try a different network/VPN egress in a supported region, or move the call to a backend deployed in a supported region.';
      }

      setGenerationError(prettyMessage);
      console.error("Error generating NFT:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const categories: Category[] = ['Body', 'Head', 'Skin', 'Style'];

  return (
    <div className="relative min-h-full flex flex-col">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none -z-20">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-primary/5 blur-[120px] rounded-full"></div>
      </div>

      <header className="relative z-50 px-8 pt-12 flex justify-between items-center mb-6">
        <div>
          <h1 className="font-future font-black text-3xl leading-none text-white tracking-tighter uppercase">NFT<br/>MINT</h1>
          <p className="text-[10px] mt-2 tracking-[0.4em] uppercase text-white/40 font-bold leading-none">NFT Collection V.1</p>
        </div>
        
        <button 
          onClick={() => {
            setAuthMode('signIn');
            setIsAuthOpen(true);
          }}
          className="glass p-1 rounded-full border border-white/10 shadow-2xl hover:border-primary/50 transition-all active:scale-90"
        >
          <img src="https://picsum.photos/100/100?seed=axon_prime" alt="User" className="w-14 h-14 rounded-full object-cover" />
        </button>
      </header>

      {/* Elongated Character Generation Preview Window */}
      <div className="px-12 mb-8 relative z-10">
        <div className="glass rounded-[3rem] border border-white/10 overflow-hidden relative shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
          {/* Diagnostic Header */}
          <div className="bg-white/5 border-b border-white/5 px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#D4FF00]"></span>
              <span className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">Blockchain Node: Active</span>
            </div>
            <div className="text-[7px] font-mono text-white/30 uppercase tracking-widest">
              NFT ID: #0x8277_MINT
            </div>
          </div>
          
          {/* Main Viewport */}
          <div className="h-[480px] relative overflow-hidden bg-black/40">
             <div className="absolute left-0 right-0 h-px bg-primary/50 shadow-[0_0_20px_#D4FF00] animate-scan z-20"></div>
             
             {/* Target Corners */}
             <div className="absolute top-8 left-8 w-6 h-6 border-l border-t border-primary/40 rounded-tl-sm"></div>
             <div className="absolute top-8 right-8 w-6 h-6 border-r border-t border-primary/40 rounded-tr-sm"></div>
             <div className="absolute bottom-8 left-8 w-6 h-6 border-l border-b border-primary/40 rounded-bl-sm"></div>
             <div className="absolute bottom-8 right-8 w-6 h-6 border-r border-b border-primary/40 rounded-br-sm"></div>

             <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none"></div>
             
             {/* Preview Metadata */}
             <div className="absolute top-1/2 -translate-y-1/2 left-8 flex flex-col gap-6">
                <div className="space-y-1">
                  <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.3em] block">Rarity</span>
                  <span className={`text-[9px] font-mono font-bold ${
                    nftMetadata?.rarity === 'Mythic' ? 'text-accent' : 
                    nftMetadata?.rarity === 'Legendary' ? 'text-yellow-400' : 
                    'text-primary'
                  }`}>{nftMetadata?.rarity || '---'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.3em] block">Theme</span>
                  <span className="text-[9px] font-mono text-white font-bold tracking-tighter">{nftMetadata?.theme || '---'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.3em] block">Network</span>
                  <span className="text-[9px] font-mono text-white/40 font-bold">AXON_MAINNET</span>
                </div>
             </div>

             <div className="absolute bottom-10 left-10 flex flex-col gap-1">
                <span className="text-[6px] font-bold text-white/40 uppercase tracking-[0.4em]">Minting Progress</span>
                <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                   <div className={`h-full bg-primary shadow-[0_0_10px_#D4FF00] transition-all duration-1000 ${isGenerating ? 'w-1/2 animate-pulse' : generatedNFT ? 'w-full' : 'w-0'}`}></div>
                </div>
             </div>

             <div className="absolute bottom-10 right-10 flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[6px] font-bold text-white/40 uppercase tracking-[0.3em] block">Frame Rate</span>
                  <span className="text-[10px] font-black text-white">120.00</span>
                </div>
                <div className="w-8 h-8 rounded-full border border-primary/20 flex items-center justify-center">
                  <span className="material-icons-round text-primary text-sm animate-spin" style={{ animationDuration: '3s' }}>hourglass_empty</span>
                </div>
             </div>

             {/* Focus Overlay */}
             <div className="absolute inset-0 flex items-center justify-center">
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] animate-pulse">Minting NFT...</span>
                  </div>
                ) : (
                  <img 
                    src={generatedNFT || "https://lh3.googleusercontent.com/aida-public/AB6AXuD--GjfU0623yeRTQGDPufUFR_AcyGbJCkDdfYQhfa33Z6nvca-1TOXhrwFVg2N5RiCHhhy3LLnHiNPE21vAD5DcA2Ybgp58Awi8kx4HgdooY_0bSzEqpbjpS_-iChDaVB9XFOMF0XySUyr9DnLfvAKLRMLpUF0--s_ZQjd6bE-PCd32yRsBhZZlVXDlRTVcQxdS8H7_Soy7rKtHqLCBYjz1d1plDnlgiynjzy3CuJtVjDwjEZDYaBtic2CIRWiQ6BOaehZHTtoXjrT"} 
                    alt="Detail Focus"
                    className={`w-full h-full object-cover transition-all duration-700 ${generatedNFT ? 'scale-100' : 'scale-[4] mix-blend-screen brightness-125 saturate-50'}`}
                    style={!generatedNFT ? { filter: `drop-shadow(0 0 10px ${selectedSkinColor})` } : {}}
                    referrerPolicy="no-referrer"
                  />
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Main Control Panel */}
      <div className="mt-auto px-8 pb-32 relative z-10">
        <div className="glass rounded-[2.5rem] p-6 shadow-2xl border border-white/5">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[10px] font-bold tracking-[0.3em] uppercase text-primary">{activeCategory} Parameters</h2>
            <span className="material-icons-round text-white/30 text-sm">settings</span>
          </div>

          <div className="min-h-[160px] flex flex-col justify-center">
            {activeCategory === 'Skin' ? (
              /* Color Selection Layout for Skin */
              <div className="grid grid-cols-4 gap-4 animate-in fade-in zoom-in-95 duration-300">
                {skinColors.map((color) => (
                  <button
                    key={color.hex}
                    onClick={() => setSelectedSkinColor(color.hex)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div 
                      className={`w-12 h-12 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center ${
                        selectedSkinColor === color.hex 
                        ? 'border-primary shadow-[0_0_15px_rgba(212,255,0,0.4)] scale-110' 
                        : 'border-white/10 hover:border-white/30'
                      }`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {selectedSkinColor === color.hex && (
                        <span className="material-icons-round text-primary text-sm mix-blend-difference">check</span>
                      )}
                    </div>
                    <span className={`text-[7px] font-bold uppercase tracking-tighter ${selectedSkinColor === color.hex ? 'text-primary' : 'text-white/20'}`}>
                      {color.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              /* Slider Layout for Body, Head, Style */
              <div className="space-y-6">
                {getActiveParams().map(param => (
                  <div key={param.key} className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex justify-between text-[11px] uppercase font-bold">
                      <span className="text-white/60">{param.label}</span>
                      <span className="text-primary font-black">{param.value}%</span>
                    </div>
                    <input 
                      type="range" 
                      value={param.value}
                      onChange={(e) => updateParam(param.key, parseInt(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 mt-8">
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-5 py-2 rounded-full font-bold text-[10px] uppercase transition-all duration-300 ${
                  activeCategory === cat 
                  ? 'bg-primary text-black shadow-[0_0_15px_rgba(212,255,0,0.2)]' 
                  : 'glass text-white/40 hover:text-white/70'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={generateNFT}
              disabled={isGenerating}
              className="flex-1 bg-white text-black py-4.5 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl font-black uppercase tracking-[0.2em] text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isGenerating ? 'Minting...' : 'Generate Unique NFT'}</span>
              <span className="material-icons-round text-sm">{isGenerating ? 'hourglass_top' : 'token'}</span>
            </button>
            <button 
              onClick={() => {
                setParams({
                  muscularity: 82, definition: 45, proportions: 64,
                  jawline: 30, eyeWidth: 55, faceDepth: 40,
                  texture: 70, luminance: 25, glow: 15,
                  chromaticity: 90, metallic: 60, opacity: 100
                });
                setSelectedSkinColor('#E0AC69');
                setGeneratedNFT(null);
                setNftMetadata(null);
                setGenerationError(null);
              }}
              className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center glass hover:bg-white/10 transition-colors border border-white/10"
            >
              <span className="material-icons-round">refresh</span>
            </button>
          </div>

          {generationError && (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[10px] font-semibold tracking-wide text-red-100">
              {generationError}
            </div>
          )}
        </div>
      </div>

      {/* Authentication Modal */}
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
                  <span className="text-[11px] font-bold text-primary uppercase tracking-[0.5em] mb-4 block underline underline-offset-8">Web3 V.1.0</span>
                  <h3 className="text-4xl font-black leading-[0.9] uppercase tracking-tighter text-white">
                    {authMode === 'signIn' ? <>Establish<br/>Wallet</> : <>NFT<br/>Minting</>}
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

export default Creator;
