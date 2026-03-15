
import React, { useEffect, useMemo, useState } from 'react';

import { View } from '../types';
import { getRandomAestheticReferences, uploadImageToCloudBase, type AestheticReference } from '../lib/apiClient';
import { generateGeminiImage, type GeminiPart } from '../lib/geminiClient';
import { addNftToMyProfile } from '../lib/userProfile';
import { getMintJobSnapshot, startMintJob, subscribeMintJob, type MintJobResult } from '../lib/mintJob';
import { upsertImageInfo } from '../lib/imageInfo';

type AuthMode = 'signIn' | 'signUp';
type Category = 'Body' | 'Skin' | 'Style' | 'Design';
type Gender = 'Male' | 'Female' | 'Creature';
type CreatureTexture = 'Hairy' | 'Hairless';
type DesignMode = 'Random' | 'Custom';

interface ParameterSet {
  label: string;
  key: string;
  value: number;
}

type CyberCollectionItem = {
  image: string;
  serialNumber: string;
  isSpecial: boolean;
  theme: string;
  prompt: string;
  cosUrl?: string;
};

type CreatorStateV1 = {
  v: 1;
  activeCategory: Category;
  gender: Gender;
  creatureTexture: CreatureTexture;
  designMode: DesignMode;
  customDesign: { top: string; bottom: string; shoes: string };
  params: Record<string, number>;
  selectedSkinColor: string;
};

type CreatorProps = {
  onNavigate?: (view: View) => void;
};

const Creator: React.FC<CreatorProps> = ({ onNavigate }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('Body');
  const [gender, setGender] = useState<Gender>('Male');
  const [creatureTexture, setCreatureTexture] = useState<CreatureTexture>('Hairy');
  const [designMode, setDesignMode] = useState<DesignMode>('Random');
  const [customDesign, setCustomDesign] = useState({
    top: 'Coat',
    bottom: 'Pants',
    shoes: 'Sneakers'
  });
  
  // NFT Themes and Traits for randomness
  const themes = ['High-Fashion Editorial', 'Urban Techwear', 'Minimalist Avant-Garde', 'Graphic Lookbook', 'Streetwear Culture', 'Avant-Garde Magazine', 'Modern Tech-Fashion'];
  const materials = ['Technical Nylon', 'Patterned Silk', 'Matte Polymer', 'Transparent Vinyl', 'Heavy Cotton', 'Reflective Fabric'];
  const styles = ['Magazine Cover Layout', 'Editorial Studio Portrait', 'High-End Fashion Photography', 'Cinematic Character Shot', 'Futuristic Fashion Portrait'];

  // Parameter states for each category
  const [params, setParams] = useState<Record<string, number>>({
    muscularity: 82,
    jawline: 45,
    proportions: 64,
    heavy: 60,
    chromaticity: 90,
    era: 50,
    thickness: 50
  });

  const [selectedSkinColor, setSelectedSkinColor] = useState('#E0AC69'); // Default skin tone

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNFT, setGeneratedNFT] = useState<string | null>(null);
  const [nftData, setNftData] = useState<CyberCollectionItem | null>(null);
  const [nftMetadata, setNftMetadata] = useState<{ theme: string; rarity: string } | null>(null);

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

  const defaultCreatorState = useMemo<CreatorStateV1>(
    () => ({
      v: 1,
      activeCategory: 'Body',
      gender: 'Male',
      creatureTexture: 'Hairy',
      designMode: 'Random',
      customDesign: { top: 'Coat', bottom: 'Pants', shoes: 'Sneakers' },
      params: {
        muscularity: 82,
        jawline: 45,
        proportions: 64,
        heavy: 60,
        chromaticity: 90,
        era: 50,
        thickness: 50,
      },
      selectedSkinColor: '#E0AC69',
    }),
    [],
  );

  // Restore Creator controls when returning from other tabs
  useEffect(() => {
    try {
      const raw = localStorage.getItem('creatorState');
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<CreatorStateV1> | null;
      if (!parsed || parsed.v !== 1) return;

      if (parsed.activeCategory) setActiveCategory(parsed.activeCategory);
      if (parsed.gender) setGender(parsed.gender);
      if (parsed.creatureTexture) setCreatureTexture(parsed.creatureTexture);
      if (parsed.designMode) setDesignMode(parsed.designMode);
      if (parsed.customDesign) setCustomDesign(parsed.customDesign);
      if (parsed.params) setParams((prev) => ({ ...prev, ...parsed.params }));
      if (parsed.selectedSkinColor) setSelectedSkinColor(parsed.selectedSkinColor);
    } catch (e) {
      console.error('Failed to restore creatorState', e);
    }
  }, []);

  // Persist Creator controls so state survives navigation
  useEffect(() => {
    try {
      const payload: CreatorStateV1 = {
        ...defaultCreatorState,
        activeCategory,
        gender,
        creatureTexture,
        designMode,
        customDesign,
        params,
        selectedSkinColor,
      };
      localStorage.setItem('creatorState', JSON.stringify(payload));
    } catch (e) {
      // ignore quota errors; generation output is more important
      console.error('Failed to persist creatorState', e);
    }
  }, [activeCategory, gender, creatureTexture, designMode, customDesign, params, selectedSkinColor, defaultCreatorState]);

  // Restore last generated NFT and metadata when returning to Creator
  useEffect(() => {
    try {
      const snap = getMintJobSnapshot();
      if (snap.status === 'running') setIsGenerating(true);
      if (snap.status === 'done' && snap.result?.imageDataUrl) {
        setIsGenerating(false);
        setGeneratedNFT(snap.result.imageDataUrl);
        setNftMetadata({ theme: snap.result.theme, rarity: snap.result.rarity });
        setNftData({
          image: snap.result.imageDataUrl,
          serialNumber: snap.result.serialNumber,
          isSpecial: snap.result.isSpecial,
          theme: snap.result.theme,
          prompt: snap.result.prompt,
          ...(snap.result.cosUrl ? { cosUrl: snap.result.cosUrl } : {}),
        });
      }

      const storedImg = localStorage.getItem('generatedNFT');
      if (storedImg) {
        setGeneratedNFT(storedImg);
      }
      const storedData = localStorage.getItem('generatedNFTData');
      if (storedData) {
        const parsed = JSON.parse(storedData) as Partial<CyberCollectionItem> | null;
        if (parsed && parsed.theme) {
          setNftMetadata((prev) => ({
            theme: parsed.theme || prev?.theme || 'High-Fashion Editorial',
            rarity: prev?.rarity || 'Common',
          }));
        }
      }
    } catch (e) {
      console.error('Failed to restore Creator state', e);
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeMintJob((snap) => {
      if (snap.status === 'running') {
        setIsGenerating(true);
        return;
      }
      if (snap.status === 'done' && snap.result) {
        setIsGenerating(false);
        setGeneratedNFT(snap.result.imageDataUrl);
        setNftMetadata({ theme: snap.result.theme, rarity: snap.result.rarity });
        setNftData({
          image: snap.result.imageDataUrl,
          serialNumber: snap.result.serialNumber,
          isSpecial: snap.result.isSpecial,
          theme: snap.result.theme,
          prompt: snap.result.prompt,
          ...(snap.result.cosUrl ? { cosUrl: snap.result.cosUrl } : {}),
        });
        return;
      }
      if (snap.status === 'error') {
        setIsGenerating(false);
      }
    });
    return () => unsub();
  }, []);

  // Define parameters based on active category
  const getActiveParams = (): ParameterSet[] => {
    switch (activeCategory) {
      case 'Body':
        return [
          { label: 'Muscularity', key: 'muscularity', value: params.muscularity },
          { label: 'Build (Skinny -> Heavy)', key: 'heavy', value: params.heavy },
          { label: 'Height / Size', key: 'proportions', value: params.proportions },
          { label: 'Headwear (Clean -> Complex)', key: 'jawline', value: params.jawline },
        ];
      case 'Style':
        return [
          { label: 'Chromaticity', key: 'chromaticity', value: params.chromaticity },
          { label: 'Era (Retro -> Modern)', key: 'era', value: params.era },
          { label: 'Thickness (Sexy -> Heavy)', key: 'thickness', value: params.thickness },
        ];
      default:
        return [];
    }
  };

  const updateParam = (key: string, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const generateNFT = async () => {
    const run = async (): Promise<MintJobResult> => {
      // Randomize traits for high variety
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];
      const randomMaterial = materials[Math.floor(Math.random() * materials.length)];
      const randomStyle = styles[Math.floor(Math.random() * styles.length)];
      const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];
      const randomRarity = rarities[Math.floor(Math.random() * rarities.length)];

      const colorPalettes = ['Neon Pink & Cyan', 'Blood Orange & Slate', 'Electric Blue & Silver', 'Acid Green & Charcoal', 'Crimson & Gold', 'Lavender & Mint', 'Cyber Yellow & Black'];
      const randomColor = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];

      setNftMetadata({ theme: randomTheme, rarity: randomRarity });

      const colorStyle = params.chromaticity > 70 ? `The clothing has vibrant, highly saturated, and numerous colors, prominently featuring ${randomColor}. The background and skin tone must remain natural and unaffected by the clothing colors.` : params.chromaticity < 30 ? 'The clothing is strictly monochrome, black, white, and grey. The background and skin tone must remain natural and unaffected by the clothing colors.' : `The clothing has subtle color accents of ${randomColor}. The background and skin tone must remain natural.`;
      const eraStyle = params.era > 70 ? 'ultra-modern, futuristic, and cutting-edge' : params.era < 30 ? 'retro, vintage, neutral, and simple' : 'a blend of contemporary and classic styles';
      let finalStyleInstruction = `The aesthetic era is ${eraStyle}.`;
      const thicknessStyle = params.thickness > 70 ? 'heavy, multi-layered, oversized, protective, wearing many layers of clothing' : params.thickness < 30 ? 'minimal clothing, wearing very few clothes, revealing, sexy, bare skin, extremely lightweight' : 'standard balanced layering and amount of clothing';
      const headwearDesc = params.jawline < 30 ? 'bareheaded, clean hair, no head accessories' : params.jawline > 70 ? 'complex, elaborate headwear, masks, or heavy accessories' : 'simple head accessories';
      const buildDesc = params.heavy < 40 ? 'very skinny and slender' : params.heavy > 80 ? 'heavy-set, plus-size, and broad' : 'normal, average build';
      const isTanBio = selectedSkinColor === '#E0AC69';
      
      const characterDesc = gender === 'Creature'
        ? `A unique, otherworldly creature (alien, mutant, or bio-engineered beast). Texture: ${creatureTexture}. Size/Proportions: ${params.proportions > 70 ? 'Massive and imposing' : params.proportions < 30 ? 'Small and agile' : 'Medium build'}. Build: ${buildDesc}. Headwear: ${headwearDesc}.`
        : `A stylish ${gender.toLowerCase()} fashion model${isTanBio ? ' with East Asian facial features' : ''}. Body type: ${params.muscularity > 70 ? 'muscular' : 'lean'} and ${buildDesc}. Height: ${params.proportions > 70 ? 'Tall stature' : params.proportions < 30 ? 'Short stature' : 'Average height'}. Headwear: ${headwearDesc}.`;

      const outfitDesc = designMode === 'Custom'
        ? `Outfit consists of: Top - ${customDesign.top}, Bottom - ${customDesign.bottom}, Footwear - ${customDesign.shoes}.`
        : `Outfit: Fashion-forward avant-garde clothing made of ${randomMaterial}.`;

      const isSpecial = Math.random() < 0.1;
      let normalCount = parseInt(localStorage.getItem('normalMintCount') || '0', 10);
      let specialCount = parseInt(localStorage.getItem('specialMintCount') || '0', 10);

      let serialNumber = '';
      if (isSpecial) {
        specialCount += 1;
        localStorage.setItem('specialMintCount', specialCount.toString());
        serialNumber = `Sp.${specialCount.toString().padStart(5, '0')}`;
      } else {
        normalCount += 1;
        localStorage.setItem('normalMintCount', normalCount.toString());
        serialNumber = `No.${normalCount.toString().padStart(8, '0')}`;
      }

      const backgroundInstruction = isSpecial
        ? 'The background MUST be a solid, vibrant color that is a direct contrast or a harmonious analogous match to the primary color of the clothing. Do not use plain white or grey backgrounds.'
        : `Clean, minimalist studio setting (white, light grey, or soft neutral tones) with large, bold, artistic typography. The typography words and font style perfectly match the character's outfit vibe and the ${randomTheme} theme.`;

      const prompt = `A professional ${randomStyle} for a high-end fashion NFT. 
      Theme: ${randomTheme}. 
      The composition is a single, unified full-frame image featuring exactly ONE character.
      FRAMING (MUST FOLLOW): FULL-BODY / full-length portrait from head-to-toe. The entire character MUST be visible, including full legs, feet, and footwear, with comfortable margin above the head and below the feet. Do NOT crop at the head, knees, ankles, or feet. Do NOT zoom-in tight on just the face or torso.
      SAFETY: Absolutely no visible nipples, areola, or genitals. No explicit sex acts or pornographic content.
      Do NOT generate split screens, collages, multi-panel layouts, or separate detail shots. Do NOT generate QR codes, watermarks, or text barcodes that look like QR codes.
      Background: ${backgroundInstruction}
      Graphic Elements: Overlay the image with technical UI details, fine technical text, cross-hairs, and minimalist graphic annotations. Do NOT use QR codes.
      Character: ${characterDesc} The character is striking a dynamic, high-fashion magazine cover pose (e.g., confident gaze, dramatic angles, editorial body language).
      ${outfitDesc}
      Colors & Textures: ${colorStyle}. ${finalStyleInstruction} The clothing layering and amount is ${thicknessStyle}.
      Skin tone: ${selectedSkinColor}. 
      Photography: High-end fashion photography, studio lighting, soft shadows, photorealistic, around 1024px on the long edge, sharp focus, realistic skin texture. 
      The overall vibe is "High-Fashion Editorial" meets "Graphic Design", clean and modern.`;

      const parts: GeminiPart[] = [{ text: prompt }];
      // NOTE: reference-image prompt logic temporarily disabled.
      // The block that fetches aesthetic references and pushes inlineData parts
      // has been kept for future use, but is not executed for now to simplify generation.

      const imgData = await generateGeminiImage({ parts, model: 'gemini-2.5-flash-image' });

      const compressForStorage = async (dataUrl: string) => {
        try {
          if (!dataUrl.startsWith('data:')) return dataUrl;
          const img = new Image();
          img.src = dataUrl;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('load failed'));
          });
          // Keep 1K preview (do not downscale to 768) so upscaler gets better input.
          const maxDim = 1024;
          const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
          const w = Math.max(1, Math.round((img.width || 1) * scale));
          const h = Math.max(1, Math.round((img.height || 1) * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return dataUrl;
          ctx.drawImage(img, 0, 0, w, h);
          try {
            const webp = canvas.toDataURL('image/webp', 0.82);
            if (webp) return webp;
          } catch {
            // ignore
          }
          return canvas.toDataURL('image/jpeg', 0.82);
        } catch {
          return dataUrl;
        }
      };

      const storedImg = await compressForStorage(imgData);
      setGeneratedNFT(storedImg);
      localStorage.setItem('generatedNFT', storedImg);

      // Upscale 1K -> 2K via Upscayl, then upload to COS 2KUSERS/ with same name.
      let cosUrl: string | undefined;
      try {
        const fileName = `${serialNumber.replace(/\./g, '_')}.webp`;
        const resp = await fetch('/api/upscale-2k', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: storedImg, fileName }),
        });
        const text = await resp.text();
        const data = text ? (JSON.parse(text) as any) : {};
        if (!resp.ok || !data?.url) {
          throw new Error(typeof data?.error === 'string' ? data.error : 'Upscale failed');
        }
        cosUrl = String(data.url);
      } catch (e) {
        console.error('Upscale+upload to COS failed', e);
      }

      if (cosUrl) {
        try {
          await addNftToMyProfile({ cosUrl, serialNumber, source: 'mint' });
        } catch (e) {
          console.error('Failed to record minted NFT in profile', e);
        }
        try {
          const r = await fetch('/api/analyze-outfit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: cosUrl }),
          });
          const t = await r.text();
          const data = t ? (JSON.parse(t) as any) : {};
          if (r.ok && data?.info) {
            await upsertImageInfo({ serialNumber, imageUrl: cosUrl, source: 'mint', info: data.info });
          } else {
            console.warn('Outfit analysis skipped', { status: r.status, error: data?.error });
          }
        } catch (e) {
          console.warn('Outfit analysis failed (non-blocking)', e);
        }
      }

      const nftDataObj: CyberCollectionItem = {
        image: storedImg,
        serialNumber,
        isSpecial,
        theme: randomTheme,
        prompt,
        ...(cosUrl ? { cosUrl } : {}),
      };
      setNftData(nftDataObj);
      localStorage.setItem('generatedNFTData', JSON.stringify(nftDataObj));

      try {
        const collectionStr = localStorage.getItem('myCyberCollection');
        const collection = collectionStr ? (JSON.parse(collectionStr) as CyberCollectionItem[]) : [];
        const MAX_ITEMS = 8;
        const trimmed = collection.slice(0, MAX_ITEMS - 1);
        const next = [nftDataObj, ...trimmed];
        localStorage.setItem('myCyberCollection', JSON.stringify(next));
        window.dispatchEvent(new Event('axon:collection-updated'));
      } catch (e) {
        console.error('Error saving to collection', e);
        try {
          // Still notify Wardrobe/TryOn to re-read generatedNFTData at least
          window.dispatchEvent(new Event('axon:collection-updated'));
        } catch {
          // ignore
        }
      }
      return {
        imageDataUrl: storedImg,
        serialNumber,
        isSpecial,
        theme: randomTheme,
        rarity: randomRarity,
        prompt,
        cosUrl,
      };
    };

    setIsGenerating(true);
    try {
      await startMintJob(run);
    } catch (error) {
      console.error('Error generating NFT:', error);
      setIsGenerating(false);
    }
  };

  const categories: Category[] = ['Body', 'Skin', 'Style', 'Design'];

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
            onNavigate?.(View.AUTH);
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
               {isGenerating && !generatedNFT ? (
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
              <div className="animate-in fade-in zoom-in-95 duration-300">
                {gender === 'Creature' && (
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Creature Texture</span>
                    <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                      {['Hairy', 'Hairless'].map(t => (
                        <button key={t} onClick={() => setCreatureTexture(t as CreatureTexture)} className={`px-3 py-1 rounded text-[8px] uppercase font-bold transition-all ${creatureTexture === t ? 'bg-primary text-black' : 'text-white/50 hover:text-white'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-4">
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
              </div>
            ) : activeCategory === 'Design' ? (
              /* Design Mode Layout */
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Design Mode</span>
                  <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                    {['Random', 'Custom'].map(m => (
                      <button key={m} onClick={() => setDesignMode(m as DesignMode)} className={`px-4 py-1.5 rounded text-[9px] uppercase font-bold transition-all ${designMode === m ? 'bg-primary text-black' : 'text-white/50 hover:text-white'}`}>{m}</button>
                    ))}
                  </div>
                </div>
                
                {designMode === 'Custom' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Top</span>
                      <div className="flex flex-wrap gap-2">
                        {['Coat', 'Puffer', 'Crop Top', 'T-Shirt', 'Hoodie'].map(item => (
                          <button key={item} onClick={() => setCustomDesign(p => ({...p, top: item}))} className={`px-3 py-1.5 rounded-full text-[9px] uppercase font-bold border transition-all ${customDesign.top === item ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-white/10 text-white/60 hover:border-white/30'}`}>{item}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Bottom</span>
                      <div className="flex flex-wrap gap-2">
                        {['Shorts', 'Pants', 'Skirt', 'Long Skirt'].map(item => (
                          <button key={item} onClick={() => setCustomDesign(p => ({...p, bottom: item}))} className={`px-3 py-1.5 rounded-full text-[9px] uppercase font-bold border transition-all ${customDesign.bottom === item ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-white/10 text-white/60 hover:border-white/30'}`}>{item}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Shoes</span>
                      <div className="flex flex-wrap gap-2">
                        {['Sneakers', 'Combat Boots', 'Slippers', 'Regular Shoes'].map(item => (
                          <button key={item} onClick={() => setCustomDesign(p => ({...p, shoes: item}))} className={`px-3 py-1.5 rounded-full text-[9px] uppercase font-bold border transition-all ${customDesign.shoes === item ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-white/10 text-white/60 hover:border-white/30'}`}>{item}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {designMode === 'Random' && (
                  <div className="h-24 flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest">AI will generate a random outfit</span>
                  </div>
                )}
              </div>
            ) : (
              /* Slider Layout for Body, Style */
              <div className="space-y-6">
                {activeCategory === 'Body' && (
                  <div className="flex justify-between items-center mb-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Gender / Type</span>
                    <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                      {['Male', 'Female', 'Creature'].map(g => (
                        <button key={g} onClick={() => setGender(g as Gender)} className={`px-3 py-1 rounded text-[8px] uppercase font-bold transition-all ${gender === g ? 'bg-primary text-black' : 'text-white/50 hover:text-white'}`}>{g}</button>
                      ))}
                    </div>
                  </div>
                )}
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
            {generatedNFT && (
              <button
                type="button"
                onClick={async () => {
                  const url = nftData?.cosUrl || generatedNFT;
                  const name = (nftData?.serialNumber || 'avatar').replace(/\s/g, '_').replace(/\./g, '_') + '.jpg';
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
                    if (url && !url.startsWith('data:')) window.open(url, '_blank');
                  }
                }}
                className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/40 hover:bg-primary hover:text-black transition-colors"
                title="Save 2K image"
              >
                <span className="material-icons-round">download</span>
              </button>
            )}
            <button 
              onClick={() => {
                setParams({
                  muscularity: 82, jawline: 45, proportions: 64, heavy: 60,
                  chromaticity: 90, era: 50, thickness: 50
                });
                setSelectedSkinColor('#E0AC69');
                setGender('Male');
                setDesignMode('Random');
                setGeneratedNFT(null);
                setNftMetadata(null);
                setNftData(null);
              }}
              className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center glass hover:bg-white/10 transition-colors border border-white/10"
            >
              <span className="material-icons-round">refresh</span>
            </button>
          </div>
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
