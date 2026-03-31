
import React, { useEffect, useMemo, useState } from 'react';

import { GoogleGenAI } from '@google/genai';

import { View } from '../types';
import { getRandomAestheticReferences, uploadImageToCloudBase, type AestheticReference } from '../lib/apiClient';
import { generateGeminiImage, type GeminiPart } from '../lib/geminiClient';
import { addNftToMyProfile, ensureUserProfile } from '../lib/userProfile';
import { getCloudbaseAuth } from '../lib/cloudbase';
import { getMintJobSnapshot, startMintJob, subscribeMintJob, type MintJobResult } from '../lib/mintJob';
import { upsertImageInfo } from '../lib/imageInfo';

type AuthMode = 'signIn' | 'signUp';
type Category = 'Body' | 'Skin' | 'Style' | 'Design';
type Gender = 'Male' | 'Female' | 'Creature';
type CreatureTexture = 'Hairy' | 'Hairless';
type DesignMode = 'Random' | 'Custom';

const CATEGORY_LABEL: Record<Category, string> = {
  Body: '身体',
  Skin: '肤色',
  Style: '风格',
  Design: '设计',
};

const DESIGN_MODE_LABEL: Record<DesignMode, string> = {
  Random: '随机',
  Custom: '自定义',
};

const GENDER_LABEL: Record<Gender, string> = {
  Male: '男',
  Female: '女',
  Creature: '生物',
};

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
  ownerUid?: string;
};

type CreatorStateV1 = {
  v: 1;
  activeCategory: Category;
  gender: Gender;
  creatureTexture: CreatureTexture;
  designMode: DesignMode;
  customDesign: { top: string; bottom: string; shoes: string };
  aestheticStyle: 'Default' | '90s Haute Couture Runway';
  params: Record<string, number>;
  selectedSkinColor: string;
};

type CreatorProps = {
  onNavigate?: (view: View) => void;
};

const Creator: React.FC<CreatorProps> = ({ onNavigate }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('Body');
  const [gender, setGender] = useState<Gender>('Female');
  const [creatureTexture, setCreatureTexture] = useState<CreatureTexture>('Hairless');
  const [designMode, setDesignMode] = useState<DesignMode>('Random');
  const [customDesign, setCustomDesign] = useState({
    top: 'Coat',
    bottom: 'Pants',
    shoes: 'Sneakers'
  });
  const [aestheticStyle, setAestheticStyle] = useState<CreatorStateV1['aestheticStyle']>('Default');
  const [hbaImageBase64, setHbaImageBase64] = useState<string | null>(null);
  const [customTopImage, setCustomTopImage] = useState<string | null>(null);
  const [customTopDesc, setCustomTopDesc] = useState<string | null>(null);
  const [isAnalyzingTop, setIsAnalyzingTop] = useState(false);
  const [customBottomImage, setCustomBottomImage] = useState<string | null>(null);
  const [customBottomDesc, setCustomBottomDesc] = useState<string | null>(null);
  const [isAnalyzingBottom, setIsAnalyzingBottom] = useState(false);
  const [customShoesImage, setCustomShoesImage] = useState<string | null>(null);
  const [customShoesDesc, setCustomShoesDesc] = useState<string | null>(null);
  const [isAnalyzingShoes, setIsAnalyzingShoes] = useState(false);
  
  // NFT Themes and Traits for randomness
  const themes = ['High-Fashion Editorial', 'Urban Techwear', 'Minimalist Avant-Garde', 'Graphic Lookbook', 'Streetwear Culture', 'Avant-Garde Magazine', 'Modern Tech-Fashion'];
  const materials = ['Matte Nylon', 'Crisp Cotton', 'Heavy Wool', 'Premium Leather', 'Textured Denim', 'Fine Linen'];
  const styles = ['Magazine Cover Layout', 'Editorial Studio Portrait', 'High-End Fashion Photography', 'Cinematic Character Shot', 'Futuristic Fashion Portrait'];

  // Parameter states for each category
  const [params, setParams] = useState<Record<string, number>>({
    muscularity: 35,
    jawline: 70,
    proportions: 64,
    heavy: 25,
    chromaticity: 60,
    era: 29,
    thickness: 100
  });

  const [selectedSkinColor, setSelectedSkinColor] = useState('#E0AC69'); // Default skin tone (Tan Bio)

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNFT, setGeneratedNFT] = useState<string | null>(null);
  const [nftData, setNftData] = useState<CyberCollectionItem | null>(null);
  const [nftMetadata, setNftMetadata] = useState<{ theme: string; rarity: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [isSuccess, setIsSuccess] = useState(false);

  const skinColors: Array<{ name: string; hex: string; hint?: string }> = [
    { name: 'Light Bio', hex: '#FFDBAC' },
    { name: 'Warm Bio', hex: '#F1C27D' },
    { name: 'Tan Bio', hex: '#E0AC69', hint: '（亚洲人概率up）' },
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
      gender: 'Female',
      creatureTexture: 'Hairless',
      designMode: 'Random',
      customDesign: { top: 'Coat', bottom: 'Pants', shoes: 'Sneakers' },
      aestheticStyle: 'Default',
      params: {
        muscularity: 35,
        jawline: 70,
        proportions: 64,
        heavy: 25,
        chromaticity: 60,
        era: 29,
        thickness: 100,
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
      if (parsed.aestheticStyle) setAestheticStyle(parsed.aestheticStyle);
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
        aestheticStyle,
        params,
        selectedSkinColor,
      };
      localStorage.setItem('creatorState', JSON.stringify(payload));
    } catch (e) {
      // ignore quota errors; generation output is more important
      console.error('Failed to persist creatorState', e);
    }
  }, [activeCategory, gender, creatureTexture, designMode, customDesign, aestheticStyle, params, selectedSkinColor, defaultCreatorState]);

  useEffect(() => {
    let mounted = true;
    ensureUserProfile()
      .then((doc) => {
        if (!mounted) return;
        const url = doc?.avatarUrl ? String(doc.avatarUrl).trim() : '';
        setAvatarUrl(url || null);
      })
      .catch(() => {
        if (mounted) setAvatarUrl(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
            rarity: prev?.rarity || '普通',
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
          { label: '肌肉', key: 'muscularity', value: params.muscularity },
          { label: '体型（瘦 → 壮）', key: 'heavy', value: params.heavy },
          { label: '身高 / 比例', key: 'proportions', value: params.proportions },
          { label: '头饰（简 → 繁）', key: 'jawline', value: params.jawline },
        ];
      case 'Style':
        return [
          { label: '色彩浓度（Chromaticity）', key: 'chromaticity', value: params.chromaticity },
          { label: '年代（复古 → 现代 / Era）', key: 'era', value: params.era },
          { label: '厚重（性感 → 厚重 / Thickness）', key: 'thickness', value: params.thickness },
        ];
      default:
        return [];
    }
  };

  const updateParam = (key: string, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const MAX_CUSTOM_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
  const compressDataUrlForGeminiInline = async (dataUrl: string): Promise<string> => {
    // Only compress data URLs (base64 payload) to reduce /api/gemini request size.
    if (!dataUrl.startsWith('data:')) return dataUrl;

    const img = new Image();
    img.src = dataUrl;

    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('load failed'));
      });
    } catch {
      return dataUrl;
    }

    const maxDim = 1024;
    const w0 = img.width || 1;
    const h0 = img.height || 1;
    const scale = Math.min(1, maxDim / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;

    ctx.drawImage(img, 0, 0, w, h);

    // Prefer WebP to shrink base64 size.
    try {
      const webp = canvas.toDataURL('image/webp', 0.82);
      if (webp) return webp;
    } catch {
      // ignore
    }

    try {
      return canvas.toDataURL('image/jpeg', 0.82);
    } catch {
      return dataUrl;
    }
  };

  const handleCustomUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'top' | 'bottom' | 'shoes',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_CUSTOM_UPLOAD_BYTES) {
      alert('上传图片大小超过 10MB，请换小一点的图片后再试。');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawDataUrl = reader.result as string;
      const dataUrl = await compressDataUrlForGeminiInline(rawDataUrl);

      if (type === 'top') {
        setCustomTopImage(dataUrl);
        setIsAnalyzingTop(true);
      } else if (type === 'bottom') {
        setCustomBottomImage(dataUrl);
        setIsAnalyzingBottom(true);
      } else {
        setCustomShoesImage(dataUrl);
        setIsAnalyzingShoes(true);
      }

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const base64Data = dataUrl.split(',')[1];
        const mimeType = dataUrl.split(';')[0].split(':')[1];

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-preview',
          contents: {
            parts: [
              {
                text: `Analyze this image of a clothing item (${type}). Provide a highly detailed, concise description of its design, color, material, graphics, cut, and specific details. Do not include any introductory text, just the description.`,
              },
              {
                inlineData: { data: base64Data, mimeType },
              },
            ],
          },
        });

        const desc = response.text?.trim() || `custom ${type} matching the reference image`;
        if (type === 'top') setCustomTopDesc(desc);
        else if (type === 'bottom') setCustomBottomDesc(desc);
        else setCustomShoesDesc(desc);
      } catch (error) {
        console.error(`Failed to analyze ${type} image`, error);
        const fallbackDesc = `custom ${type} matching the reference image`;
        if (type === 'top') setCustomTopDesc(fallbackDesc);
        else if (type === 'bottom') setCustomBottomDesc(fallbackDesc);
        else setCustomShoesDesc(fallbackDesc);
      } finally {
        if (type === 'top') setIsAnalyzingTop(false);
        else if (type === 'bottom') setIsAnalyzingBottom(false);
        else setIsAnalyzingShoes(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const generateNFT = async () => {
    const run = async (): Promise<MintJobResult> => {
      // Randomize traits for high variety
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];
      const randomMaterial = materials[Math.floor(Math.random() * materials.length)];
      const randomStyle = styles[Math.floor(Math.random() * styles.length)];
      const rarities = ['普通', '不凡', '稀有', '史诗', '传奇', '神话'];
      const randomRarity = rarities[Math.floor(Math.random() * rarities.length)];

      const colorPalettes = ['Neon Pink & Cyan', 'Blood Orange & Slate', 'Electric Blue & Silver', 'Acid Green & Charcoal', 'Crimson & Gold', 'Lavender & Mint', 'Cyber Yellow & Black'];
      const randomColor = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];

      setNftMetadata({ theme: randomTheme, rarity: randomRarity });

      // Map UI parameters to prompt instructions (sync with .upgrade13)
      const colorStyleBase =
        params.chromaticity > 70
          ? `The clothing features a bold, high-contrast color palette, prominently featuring ${randomColor}. The design can include tasteful prints or patterns, but they must be clean, premium, and elegant. Absolutely avoid overly dense, messy, chaotic, or "dirty" looking patterns. The background and skin tone must remain natural.`
          : params.chromaticity < 30
            ? 'The clothing is strictly monochrome, black, white, and grey. The background and skin tone must remain natural.'
            : `The clothing has subtle, elegant color accents of ${randomColor}. The background and skin tone must remain natural.`;
      const eraStyle = params.era > 70 ? 'ultra-modern, futuristic, and cutting-edge' : params.era < 30 ? 'retro, vintage, neutral, and simple' : 'a blend of contemporary and classic styles';
      let finalStyleInstruction = `The aesthetic era is ${eraStyle}.`;
      if (aestheticStyle !== 'Default') {
        finalStyleInstruction += ` The specific aesthetic style MUST be highly influenced by: ${aestheticStyle}.`;
      }
      const thicknessStyle = params.thickness > 70
        ? 'heavy, multi-layered, oversized, protective, wearing many layers of clothing'
        : params.thickness < 30
          ? 'minimal clothing, revealing, bare skin, extremely lightweight'
          : 'standard balanced layering and amount of clothing';

      const complexHeadwearStyles = [
        'Dark Mecha: heavy mechanical full-face mask, intricate robotic parts, matte black and dark grey, exposed red wires, glowing sensor eyes, decal stickers, cybernetic mecha aesthetic',
        'Sleek Minimalist: sleek minimalist glossy black glass visor covering eyes, aerodynamic design, sci-fi minimalist',
        'Neon Cyberpunk: translucent orange futuristic visor and industrial headphones, neon light reflections, UI interface graphics on the glass, detailed mechanical textures',
        'Fantasy Cyber: stylized cybernetic kitsune mask on the side of the head, traditional elements fused with high-tech armor, intricate gold micro-chips, artistic cyberpunk'
      ];
      const randomComplexHeadwear = complexHeadwearStyles[Math.floor(Math.random() * complexHeadwearStyles.length)];

      const headwearArchetypes = [
        {
          core: 'bionic filigree implants and cybernetic facial decals',
          material: 'polished silver chrome and matte white ceramic',
          detail: 'ornate engravings and cybernetic face plates',
          style: 'avant-garde fashion, mechanical doll aesthetic',
        },
        {
          core: 'oni/kitsune half-mask with horns and tactical HUD goggles',
          material: 'matte white ceramic with glowing LED filaments',
          detail: 'exoskeleton ribs',
          style: 'cyber-samurai / cyber-ninja vibe',
        },
        {
          core: 'oversized translucent visor',
          material: 'translucent neon acrylic and digital glitch patterns',
          detail: 'integrated antennas',
          style: 'vaporwave / glitchcore style',
        },
        {
          core: 'mechanical chin guard and cybernetic ear-mounted sensors',
          material: 'carbon fiber and tech-mesh',
          detail: 'typography decals and warning labels',
          style: 'techwear aesthetic',
        },
      ];
      const selectedArchetype = headwearArchetypes[Math.floor(Math.random() * headwearArchetypes.length)];

      const retroComplexHeadwearStyles = [
        'Minimalist Noir: wide slightly transparent silk ribbon tied as a blindfold, dramatic shadows, chiaroscuro lighting, stark high contrast, minimalist aesthetic, elegant and cinematic',
        'Deconstructed Architecture: huge architectural pleated conical hat or structural headpiece, neutral and grey tones, deconstructed silhouette, high-fashion runway look, sharp editorial lighting, minimalist yet dramatic',
        'Vintage Glamour: extravagant vintage fashion hat with intricate netting, paired with oversized ornate retro earrings, classic haute couture styling, soft cinematic glamour lighting, elegant retro fashion portrait'
      ];
      const randomRetroComplexHeadwear = retroComplexHeadwearStyles[Math.floor(Math.random() * retroComplexHeadwearStyles.length)];

      const retroHeadwearArchetypes = [
        {
          core: 'silk ribbon blindfold',
          material: 'slightly transparent glossy silk and sheer velvet',
          detail: 'dramatic shadows and chiaroscuro lighting',
          style: 'gothic aesthetic, monochrome photography, elegant and cinematic',
        },
        {
          core: 'architectural wide-brimmed hat or pleated conical headpiece',
          material: 'sheer lace & mesh with exaggerated proportions',
          detail: 'hard studio lighting and sharp silhouettes',
          style: 'editorial photography, deconstructed silhouette, minimalist yet dramatic',
        },
        {
          core: '发簪与高发髻',
          material: 'sleek hair styled in a high bun with ornamental hairpin',
          detail: 'soft vintage glamour lighting',
          style: 'classic haute couture, elegant retro fashion portrait',
        },
      ];
      const selectedRetroArchetype = retroHeadwearArchetypes[Math.floor(Math.random() * retroHeadwearArchetypes.length)];

      let headwearDesc = '';
      if (params.era > 50) {
        if (params.jawline > 70) {
          headwearDesc = `complex headwear (${randomComplexHeadwear})`;
        } else if (params.jawline < 10) {
          headwearDesc = 'bareheaded, clean hair, no head accessories';
        } else if (params.jawline < 30) {
          headwearDesc = `subtle head accessory: ${selectedArchetype.core}`;
        } else if (params.jawline < 50) {
          headwearDesc = `moderate head accessory: ${selectedArchetype.core} made of ${selectedArchetype.material}`;
        } else {
          headwearDesc = `detailed head accessory: ${selectedArchetype.core} made of ${selectedArchetype.material}, featuring ${selectedArchetype.detail}, ${selectedArchetype.style}`;
        }
      } else {
        if (params.jawline > 70) {
          headwearDesc = `complex headwear (${randomRetroComplexHeadwear})`;
        } else if (params.jawline < 10) {
          headwearDesc = 'bareheaded, clean hair, no head accessories';
        } else if (params.jawline < 30) {
          headwearDesc = `subtle head accessory: ${selectedRetroArchetype.core}`;
        } else if (params.jawline < 50) {
          headwearDesc = `moderate head accessory: ${selectedRetroArchetype.core} made of ${selectedRetroArchetype.material}`;
        } else {
          headwearDesc = `detailed head accessory: ${selectedRetroArchetype.core} made of ${selectedRetroArchetype.material}, featuring ${selectedRetroArchetype.detail}, ${selectedRetroArchetype.style}`;
        }
      }
      // Fix for "heavy" causing bare chests: Explicitly state "fully clothed" unless thickness is very low
      const chestCoverage = params.thickness < 30 ? '' : 'fully clothed with chest completely covered';
      const buildDesc = params.heavy < 40 ? `very skinny and slender, ${chestCoverage}` : params.heavy > 80 ? `heavy-set, plus-size, and broad, ${chestCoverage}` : `normal, average build, ${chestCoverage}`;
      const isTanBio = selectedSkinColor === '#E0AC69';

      // Avatar / creature keywords — aligned with `.upgrade12/views/Creator.tsx`
      let creatureTextureDesc = '';
      let creatureSpecialInstructions = '';
      if (creatureTexture === 'Hairless') {
        const hairlessSubStyles = [
          'Bio-mechanical/Cybernetic: Neo-minimalist biomechanical, Cyber-Gothic. Hairless bionic humanoid creature, faceless white ceramic head, sleek aerodynamic exoskeleton. Exposed intricate internal wires, carbon fiber body, sharp aggressive spikes, glowing optic slits. High-fashion techwear, flowing black capes, tactical robes, carrying katana, minimalist aesthetic. Clean gray studio background, cinematic rim lighting, high contrast (Black and White dominance). DO NOT INCLUDE: human skin, human face, eyes, nose, mouth, hair, fur, organic texture, colorful, messy, low-tech, rustic.',
          'Ethereal Divinity: Highly sacred and divine presence. The creature has translucent skin with a gel-like white surface, while the inner color glows with the selected skin tone. Large, expressive, and divine eyes. Majestic horns, gold filigree, surreal fantasy, ethereal atmosphere.',
          'Avant-garde/Fabric: striking hairless feline facial structure, sleek Sphynx cat face shape and skin texture, optional delicate lace veil (non-essential element), textile textures, fashion editorial, high contrast, mysterious cat-like features, cat ears silhouette.',
        ];
        const selectedHairlessStyle = hairlessSubStyles[Math.floor(Math.random() * hairlessSubStyles.length)];
        creatureTextureDesc = `Sleek hairless creature, humanoid monster, avant-garde style, biomechanical or ethereal details, intricate headpiece. Sub-style: ${selectedHairlessStyle}`;
        creatureSpecialInstructions =
          'CRITICAL CREATURE INSTRUCTION: Absolutely NO fur, NO fluffy textures. The overall color palette should be constrained to black, white, and grey, but allow the selected skin tone to act as a vibrant inner glow or accent. Lighting MUST be studio lighting with sharp rim light against a minimalist grey or white background.';
      } else {
        creatureTextureDesc =
          'Covered in high-fashion, meticulously groomed fur or hair. A majestic, beast-like humanoid with a powerful, primal yet elegant runway presence.';
      }

      const characterDesc =
        gender === 'Creature'
          ? `A unique, otherworldly creature (alien, mutant, or bio-engineered humanoid). Texture/Vibe: ${creatureTextureDesc}. Size/Proportions: ${params.proportions > 70 ? 'Massive and imposing' : params.proportions < 30 ? 'Small and agile' : 'Medium build'}. Build: ${buildDesc}. Headwear: ${headwearDesc}. ${creatureSpecialInstructions}`
          : `A stylish ${gender.toLowerCase()} fashion model${isTanBio ? ' with East Asian facial features' : ''}. Body type: ${params.muscularity > 70 ? 'muscular' : 'lean'} and ${buildDesc}. Height: ${params.proportions > 70 ? 'Tall stature' : params.proportions < 30 ? 'Short stature' : 'Average height'}. Headwear: ${headwearDesc}.`;

      const aimShoeDesc =
        'black high-top chunky boots with a prominent silver side zipper, thick ridged platform sole, black laces, and a contrasting light grey toe cap';
      const hbaHoodieDesc =
        "black double-layered hoodie with hood up. Outer layer has short sleeves with raw frayed edges over long black sleeves. Features white graphics: 'ANZIMA RACING' outlined text logo on chest, checkered flag graphic, circular logo, and a symmetrical tribal graphic on the front kangaroo pocket. Black drawstrings with silver metal tips and silver metal rivets on the pocket corners";
      const topDesc =
        customDesign.top === 'HBA'
          ? `${hbaHoodieDesc}, exactly matching the reference`
          : customDesign.top === 'Custom'
            ? `${customTopDesc || 'custom top matching the reference image'}, exactly matching the reference`
            : customDesign.top;
      const bottomDesc =
        customDesign.bottom === 'Custom'
          ? `${customBottomDesc || 'custom bottom matching the reference image'}, exactly matching the reference`
          : customDesign.bottom;
      const shoesDesc =
        customDesign.shoes === 'aim'
          ? `${aimShoeDesc}, exactly matching the reference`
          : customDesign.shoes === 'Custom'
            ? `${customShoesDesc || 'custom shoes matching the reference image'}, exactly matching the reference`
            : customDesign.shoes;
      const outfitDesc =
        designMode === 'Custom'
          ? `Outfit consists of: Top - ${topDesc}, Bottom - ${bottomDesc}, Footwear - ${shoesDesc}.`
          : `Outfit: Fashion-forward avant-garde clothing made of ${randomMaterial}.`;

      const isSpecial = true;
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
        : `Minimal studio backdrop (white/grey/soft neutral) with bold typography matching the ${randomTheme} vibe.`;
      let complexRetroKeywords = '';
      if (params.thickness > 80 && params.era < 50) {
        complexRetroKeywords =
          '\n' +
          'CRITICAL STYLE OVERRIDE (High Complexity Retro):\n' +
          '- Concept & Style: Deconstruction (breaking traditional clothing structures, asymmetrical, destructive re-stitching and combination), Modern Hanbok / Neo-Traditional (blending traditional Eastern classical clothing like cross collars and large skirts with modern streetwear), Wasteland / Cyberpunk (rugged doomsday survival feel with futuristic tech rebellion), Maximalism (rich layers, stacked elements, rejecting minimalism).\n' +
          '- Silhouette & Cut: Oversized / Voluminous (exaggerated fluffiness, extreme spatial presence and aura), Multi-layered (multiple layers of fabric stacked inside and out, adding heaviness, 3D structure, and dynamic beauty when walking), Cinched High Waist (emphasized high waistline with a wide belt, straps, or metal chains to elongate the lower body proportions).';
      }

      // Special Design options (from .upgrade6)
      const usesSpecialDesignPrompts =
        designMode === 'Custom' &&
        (customDesign.top === 'HBA' ||
          customDesign.top === 'Custom' ||
          customDesign.bottom === 'Custom' ||
          customDesign.shoes === 'aim' ||
          customDesign.shoes === 'Custom');

      const colorStyle = usesSpecialDesignPrompts
        ? 'Do NOT recolor or add colored trims/piping/stitching to the referenced garments. Keep the garment colors and graphics exactly as the reference (no extra neon accents).'
        : colorStyleBase;

      const overlayInstruction = isSpecial
        ? ''
        : 'Overlay: minimal technical UI lines/crosshair as a BACKGROUND overlay only. DO NOT place UI graphics on clothing. (no QR codes, no watermarks).\n';

      const customFramingInstruction =
        designMode === 'Custom' &&
        (customDesign.top === 'HBA' ||
          customDesign.top === 'Custom' ||
          customDesign.bottom === 'Custom' ||
          customDesign.shoes === 'aim' ||
          customDesign.shoes === 'Custom')
          ? 'Framing: full-body head-to-toe portrait, centered, inside the canvas with visible padding at the top and bottom; ensure the entire head is fully visible with no head cut-off (no cropping).'
          : '';

      const isEraFuturisticHuman = params.era > 95 && gender !== 'Creature';

      let prompt: string;
      if (isEraFuturisticHuman) {
        // 1. Clothing Branches
        const clothingBranches = [
          'Sleek Bodysuits: Cybernetic bodysuit, sleek tactical skin, paneling details, high-tech compression suit.',
          'Heavy Techwear: Oversized techwear jacket, hakama-style pants, tactical gear, asymmetrical silhouettes, cyber-samurai armor.',
          'Experimental Fabrics: Translucent PVC raincoat, glowing optic fibers, plissé fabric, ethereal flowing drapes.'
        ];
        const selectedClothingBranch = clothingBranches[Math.floor(Math.random() * clothingBranches.length)];

        // 2. Character Identity
        const characterIdentity = 'Artificial Beauty: porcelain-like clean skin, cold and detached expression, sharp or lifeless eyes (inorganic feel). Cyborg/Android: partial precision mechanical embedding, such as mechanical devices on the ears, neck interfaces, or mechanized lower legs. Hairstyle: minimalist silver-white short hair, sleek bob, or completely enclosed by a high-tech helmet.';

        // 3. Material Definition
        const materialDefinition =
          'Materials: Polished enamel, matte carbon fiber, liquid-like PVC, high-density nylon, iridescent fabric.';

        // 4. Composition
        const composition =
          'Composition: High-fashion editorial photography, minimalist studio background, sharp rim lighting, cinematic depth of field, graphic design layout vibes.';

        // 5. Stylized Keywords
        const stylizedKeywordsOptions = [
          'Ethereal Fashion: Translucent textures, pastel glowing neon, volumetric smoke, airy, delicate but futuristic.',
          'Combat Mecha: Mecha-arms, sleek katana, heavy plating, industrial straps, dark techwear aesthetic.',
          'Minimalist Android: Pure white aesthetic, porcelain skin, sleek exoskeleton, surgical precision, elegant silence.',
        ];
        const selectedStylizedKeywords =
          stylizedKeywordsOptions[Math.floor(Math.random() * stylizedKeywordsOptions.length)];

        // 6. Color Control
        const colorControl = 'Color Palette: [Main: White/Black/Grey] + [Accent: Electric Blue/Neon Green/Cherry Blossom Pink]. NO messy colors. (monochromatic base:1.3), (single neon accent color:1.2).';

        // 7. Detail Density
        const detailDensity =
          '(intricate mechanical joints:1.2), (complex garment construction:1.1), (minimalist overall look:1.1).';

        prompt =
          `A professional high-end luxury fashion NFT.\n` +
          `Theme: Futuristic Techwear Aesthetic and Cyber-Avant-Garde.\n` +
          `${composition}\n` +
          `Character: A highly advanced humanoid model. ${characterIdentity} Skin tone: ${selectedSkinColor}.\n` +
          (customFramingInstruction ? `${customFramingInstruction}\n` : '') +
          `Outfit: ${selectedClothingBranch} ${outfitDesc}\n` +
          `${materialDefinition}\n` +
          `Style Keywords: ${selectedStylizedKeywords}\n` +
          `Colors: ${colorControl}\n` +
          `Details: ${detailDensity}\n` +
          `CRITICAL AESTHETIC INSTRUCTION: The image MUST look like a high-end real photograph. Holographic, iridescent, or reflective materials are allowed, but they MUST look like real physical fabrics photographed in a studio, NOT like a digital illustration, 3D render, or hand-drawn art. Avoid overly dense, messy, or chaotic fabric patterns. Use premium material textures.\n` +
          `CRITICAL LIGHTING AND PRODUCT INSTRUCTION: All clothing items (especially the top and shoes) MUST perfectly blend with the scene's lighting, BUT their core design, graphics, logos, and structure MUST NOT BE ALTERED from the provided reference images. This is a strict virtual try-on: the reference garments must be preserved pixel-for-pixel in terms of design, only adapting to the character's pose and lighting.\n` +
          `The overall vibe is "High-Fashion Editorial" meets "Graphic Design", clean, premium, and modern.\n` +
          `${complexRetroKeywords}`;
      } else if (gender === 'Female' && params.era >= 0 && params.era <= 20) {
        prompt =
          `A professional ${randomStyle} for a high-end luxury fashion NFT. Avant-garde fashion photography, high-fashion editorial full-body shot of a woman.\n` +
          `Theme: ${randomTheme}.\n` +
          `Style: Maximalist aesthetic, textile art, Japanese avant-garde style. ${finalStyleInstruction}\n` +
          `Character & Headpiece: ${characterDesc} Porcelain skin, bold red lips. Skin tone: ${selectedSkinColor}. The character is striking a dynamic, high-fashion magazine cover pose (e.g., confident gaze, dramatic angles, editorial body language).\n` +
          (customFramingInstruction ? `${customFramingInstruction}\n` : '') +
          `Clothing & Texture: patchwork, Bold geometric patterns mixed with floral motifs. The clothing layering and amount is ${thicknessStyle}.\n` +
          `${outfitDesc}\n` +
          `Environment & Lighting: ${backgroundInstruction} Studio lighting, sharp focus, high contrast.\n` +
          `Color Palette: ${colorStyle}. Core color logic MUST feature highly saturated colors contrasted with black and white.\n` +
          `CRITICAL AESTHETIC INSTRUCTION: The image MUST look like a high-end real photograph. Holographic, iridescent, or reflective materials are allowed, but they MUST look like real physical fabrics photographed in a studio, NOT like a digital illustration, 3D render, or hand-drawn art. Use premium material textures.\n` +
          `CRITICAL LIGHTING AND PRODUCT INSTRUCTION: All clothing items (especially the top and shoes) MUST perfectly blend with the scene's lighting, BUT their core design, graphics, logos, and structure MUST NOT BE ALTERED from the provided reference images. This is a strict virtual try-on: the reference garments must be preserved pixel-for-pixel in terms of design, only adapting to the character's pose and lighting.\n` +
          `The overall vibe is "Avant-garde Maximalism", highly detailed, 8k resolution.\n` +
          `${complexRetroKeywords}`;
      } else {
        prompt =
          `A professional ${randomStyle} for a high-end luxury fashion NFT.\n` +
          `Theme: ${randomTheme}.\n` +
          `The composition is a single, unified full-frame image featuring exactly ONE character. Do NOT generate split screens, collages, multi-panel layouts, or separate detail shots. Do NOT generate QR codes, watermarks, or text barcodes that look like QR codes.\n` +
          `Background: ${backgroundInstruction}\n` +
          `Graphic Elements: Overlay the image with minimalist, clean graphic design elements. Do NOT draw UI elements ON the clothing itself.\n` +
          `Character: ${characterDesc} The character is striking a dynamic, high-fashion magazine cover pose (e.g., confident gaze, dramatic angles, editorial body language).\n` +
          (customFramingInstruction ? `${customFramingInstruction}\n` : '') +
          `${outfitDesc}\n` +
          `Colors & Textures: ${colorStyle}. ${finalStyleInstruction} The clothing layering and amount is ${thicknessStyle}.\n` +
          `Skin tone: ${selectedSkinColor}.\n` +
          `Photography & Quality: High-end luxury fashion photography, haute couture, sophisticated tailoring. Studio lighting, soft shadows, photorealistic, 8k uhd, sharp focus, realistic skin texture.\n` +
          `CRITICAL AESTHETIC INSTRUCTION: The image MUST look like a high-end real photograph. Holographic, iridescent, or reflective materials are allowed, but they MUST look like real physical fabrics photographed in a studio, NOT like a digital illustration, 3D render, or hand-drawn art. Avoid overly dense, messy, or chaotic fabric patterns. Use premium material textures.\n` +
          `CRITICAL LIGHTING AND PRODUCT INSTRUCTION: All clothing items (especially the top and shoes) MUST perfectly blend with the scene's lighting, BUT their core design, graphics, logos, and structure MUST NOT BE ALTERED from the provided reference images. This is a strict virtual try-on: the reference garments must be preserved pixel-for-pixel in terms of design, only adapting to the character's pose and lighting.\n` +
          `The overall vibe is "High-Fashion Editorial" meets "Graphic Design", clean, premium, and modern.\n` +
          `${complexRetroKeywords}`;
      }

      const parts: GeminiPart[] = [];

      const dataUrlToInlinePart = (dataUrl: string) => {
        const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!m) return null;
        return { inlineData: { mimeType: m[1]!, data: m[2]! } } as GeminiPart;
      };

      // Add 'HBA' top reference if selected (user-uploaded image)
      if (designMode === 'Custom' && customDesign.top === 'HBA') {
        if (hbaImageBase64) {
          const inline = dataUrlToInlinePart(hbaImageBase64);
          if (inline && 'inlineData' in inline) {
            parts.push({
              text:
                'VIRTUAL TRY-ON TASK - GARMENT 1 (TOP): The following image shows the EXACT hoodie the character must wear. DO NOT redesign it. DO NOT alter the colors, text, logos, graphics, stitching colors, or cut. Do NOT add colored piping/edges/neon accents. Preserve the hoodie 100% identical to the reference.',
            });
            parts.push(inline);
          } else {
            parts.push({
              text: `CRITICAL INSTRUCTION: The character MUST wear the exact hoodie described: ${hbaHoodieDesc}. The design, shape, graphics, and details of this hoodie must be perfectly replicated on the character.`,
            });
          }
        } else {
          parts.push({
            text: `CRITICAL INSTRUCTION: The character MUST wear the exact hoodie described: ${hbaHoodieDesc}. Do NOT recolor it and do NOT add colored trims/piping/stitching. The design, shape, graphics, and details of this hoodie must be perfectly replicated on the character.`,
          });
        }
      }

      // Add 'Custom' top reference (upload) if selected
      if (designMode === 'Custom' && customDesign.top === 'Custom' && customTopImage) {
        const inline = dataUrlToInlinePart(customTopImage);
        if (inline && 'inlineData' in inline) {
          parts.push({
            text:
              'VIRTUAL TRY-ON TASK - GARMENT 1 (TOP): The following image shows the EXACT top the character must wear. DO NOT redesign it. DO NOT alter the text, logos, graphics, or cut. You MUST preserve the exact graphics, exact cut, exact textures, and exact proportions. If the image shows a mannequin, replace the mannequin with the character described later, but leave the top 100% untouched and identical to this reference.',
          });
          parts.push(inline);
        }
      }

      // Add 'Custom' bottom reference (upload) if selected
      if (designMode === 'Custom' && customDesign.bottom === 'Custom' && customBottomImage) {
        const inline = dataUrlToInlinePart(customBottomImage);
        if (inline && 'inlineData' in inline) {
          parts.push({
            text:
              'VIRTUAL TRY-ON TASK - GARMENT 2 (BOTTOM): The following image shows the EXACT bottom the character must wear. DO NOT redesign it. DO NOT alter the text, logos, graphics, or cut. You MUST preserve the exact graphics, exact cut, exact textures, and exact proportions. If the image shows a mannequin, replace the mannequin with the character described later, but leave the bottom 100% untouched and identical to this reference.',
          });
          parts.push(inline);
        }
      }

      // Add 'aim' shoe reference if selected (fixed reference URL)
      if (designMode === 'Custom' && customDesign.shoes === 'aim') {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const resp = await fetch(
            'https://lh3.googleusercontent.com/aida-public/AB6AXuD--GjfU0623yeRTQGDPufUFR_AcyGbJCkDdfYQhfa33Z6nvca-1TOXhrwFVg2N5RiCHhhy3LLnHiNPE21vAD5DcA2Ybgp58Awi8kx4HgdooY_0bSzEqpbjpS_-iChDaVB9XFOMF0XySUyr9DnLfvAKLRMLpUF0--s_ZQjd6bE-PCd32yRsBhZZlVXDlRTVcQxdS8H7_Soy7rKtHqLCBYjz1d1plDnlgiynjzy3CuJtVjDwjEZDYaBtic2CIRWiQ6BOaehZHTtoXjrT',
            { signal: controller.signal },
          );
          clearTimeout(timeout);
          if (resp.ok) {
            const blob = await resp.blob();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(String(reader.result || ''));
              reader.onerror = () => reject(new Error('read fail'));
              reader.readAsDataURL(blob);
            });
            const inline = dataUrlToInlinePart(dataUrl);
            if (inline && 'inlineData' in inline) {
              parts.push({
                text: `VIRTUAL TRY-ON TASK - GARMENT 3 (SHOES): The following image shows the EXACT shoes the character must wear (${aimShoeDesc}). DO NOT change their design. Copy the shoes exactly onto the character's feet.`,
              });
              parts.push(inline);
            }
          }
        } catch (e) {
          console.warn('Failed to fetch aim shoe reference image', e);
        }
      } else if (designMode === 'Custom' && customDesign.shoes === 'Custom' && customShoesImage) {
        const inline = dataUrlToInlinePart(customShoesImage);
        if (inline && 'inlineData' in inline) {
          parts.push({
            text: 'VIRTUAL TRY-ON TASK - GARMENT 3 (SHOES): The following image shows the EXACT shoes the character must wear. DO NOT change their design. Copy the shoes exactly as they appear in the reference image onto the character\'s feet.',
          });
          parts.push(inline);
        }
      }

      // Finally, add the main prompt text
      parts.push({ text: prompt });

      const imgData = await generateGeminiImage({
        parts,
        model: usesSpecialDesignPrompts ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image',
      });

      const compressForStorage = async (dataUrl: string) => {
        try {
          if (!dataUrl.startsWith('data:')) return dataUrl;
          const img = new Image();
          img.src = dataUrl;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('load failed'));
          });
          const size = 2048;
          const srcW = img.width || 1;
          const srcH = img.height || 1;

          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) return dataUrl;

          // Preserve full content using letterbox (no center-crop),
          // so the head/top never gets cut off by post-processing.
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, size, size);

          const scale = Math.min(size / srcW, size / srcH);
          const dw = Math.max(1, Math.round(srcW * scale));
          const dh = Math.max(1, Math.round(srcH * scale));
          const dx = Math.round((size - dw) / 2);
          const dy = Math.round((size - dh) / 2);
          ctx.drawImage(img, dx, dy, dw, dh);

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

      // IMPORTANT (mobile performance + cross-device safety):
      // - Do NOT block the UI/mint job on network uploads or DB writes.
      // - Do NOT use serialNumber as the COS object key (it collides across devices and causes "other users' images" to appear).
      //   Use a unique filename instead, while keeping serialNumber as metadata in the profile/db.
      void (async () => {
        const pendingKey = 'axon:pending-mint-sync';
        let oneKUrl: string | undefined;
        try {
          // Mobile-friendly: upload a smaller image (1024 max) to avoid request-size limits.
          const uploadImg = await (async () => {
            try {
              const resp = await fetch(storedImg);
              const blob = await resp.blob();
              const bmp = await createImageBitmap(blob);
              const maxDim = 1024;
              const scale = Math.min(1, maxDim / Math.max(bmp.width || 1, bmp.height || 1));
              const w = Math.max(1, Math.round((bmp.width || 1) * scale));
              const h = Math.max(1, Math.round((bmp.height || 1) * scale));
              const canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              if (!ctx) return storedImg;
              ctx.drawImage(bmp, 0, 0, w, h);
              try {
                const webp = canvas.toDataURL('image/webp', 0.82);
                if (webp) return webp;
              } catch {
                // ignore
              }
              return canvas.toDataURL('image/jpeg', 0.82);
            } catch {
              return storedImg;
            }
          })();

          const uniqueSuffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
          const fileName = `${serialNumber.replace(/\./g, '_')}_${uniqueSuffix}.webp`;
          oneKUrl = await uploadImageToCloudBase(uploadImg, { prefix: 'MINT/', fileName });
        } catch (e) {
          console.error('Upload 2K image failed', e);
          try {
            localStorage.setItem(pendingKey, JSON.stringify({ serialNumber, createdAt: Date.now(), dataUrl: storedImg }));
          } catch {
            // ignore storage quota errors
          }
          // On mobile, users won't see console; surface a minimal hint.
          alert('上传失败：该 NFT 暂未同步到 Wardrobe。请稍后在 Wardrobe 中重试同步，或检查登录状态/网络。');
          return;
        }

        try {
          await addNftToMyProfile({ cosUrl: oneKUrl, serialNumber, source: 'mint' });
          try {
            localStorage.removeItem(pendingKey);
          } catch {
            // ignore
          }
          window.dispatchEvent(new Event('axon:collection-updated'));
        } catch (e) {
          console.error('Failed to record minted NFT in profile', e);
          try {
            localStorage.setItem(pendingKey, JSON.stringify({ serialNumber, createdAt: Date.now(), cosUrl: oneKUrl }));
          } catch {
            // ignore
          }
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes('NOT_SIGNED_IN')) {
            // Prompt login on mobile/guest sessions so sync can succeed.
            setAuthMode('signIn');
            setIsAuthOpen(true);
            alert('请先登录以同步到 Wardrobe。');
          } else {
            alert('同步到 Wardrobe 失败，请稍后在 Wardrobe 中重试同步。');
          }
        }

        try {
          const r = await fetch('/api/analyze-outfit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: oneKUrl }),
          });
          const t = await r.text();
          const data = t ? (JSON.parse(t) as any) : {};
          if (r.ok && data?.info) {
            await upsertImageInfo({ serialNumber, imageUrl: oneKUrl, source: 'mint', info: data.info });
          } else {
            console.warn('Outfit analysis skipped', { status: r.status, error: data?.error });
          }
        } catch (e) {
          console.warn('Outfit analysis failed (non-blocking)', e);
        }
      })();

      // 2K 放大仅在 Wardrobe 内点击“生成 2K”时执行，避免移动端铸造流程被网络/云托管卡住。
      const cosUrl: string | undefined = undefined;

      const nftDataObj: CyberCollectionItem = {
        ownerUid: ((await getCloudbaseAuth().getCurrentUser()) as any)?.uid,
        image: storedImg,
        serialNumber,
        isSpecial,
        theme: randomTheme,
        prompt,
        ...(cosUrl ? { cosUrl } : {}),
      };
      setNftData(nftDataObj);
      localStorage.setItem('generatedNFTData', JSON.stringify(nftDataObj));

      // Notify pages (e.g. Admin "management test") that rely on generatedNFTData / generatedNFT.
      try {
        window.dispatchEvent(new Event('axon:generated-nft-updated'));
      } catch {
        // ignore
      }

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
          <h1 className="font-future font-black text-3xl leading-none text-white tracking-tighter uppercase">NFT<br/>铸造</h1>
          <p className="text-[10px] mt-2 tracking-[0.4em] uppercase text-white/40 font-bold leading-none">NFT 系列 V.1</p>
        </div>
        
        <button 
          onClick={() => {
            onNavigate?.(View.AUTH);
          }}
          className="glass p-1 rounded-full border border-white/10 shadow-2xl hover:border-primary/50 transition-all active:scale-90"
        >
          <img
            src={avatarUrl || 'https://picsum.photos/100/100?seed=axon_prime'}
            alt="User"
            className="w-14 h-14 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        </button>
      </header>

      {/* Elongated Character Generation Preview Window */}
      <div className="px-12 mb-8 relative z-10">
        <div className="glass rounded-[3rem] border border-white/10 overflow-hidden relative shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
          {/* Diagnostic Header */}
          <div className="bg-white/5 border-b border-white/5 px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#D4FF00]"></span>
              <span className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">区块节点：在线</span>
            </div>
            <div className="text-[7px] font-mono text-white/30 uppercase tracking-widest">
              NFT 编号：#0x8277_MINT
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
                  <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.3em] block">稀有度</span>
                  <span className={`text-[9px] font-mono font-bold ${
                    nftMetadata?.rarity === 'Mythic' ? 'text-accent' : 
                    nftMetadata?.rarity === 'Legendary' ? 'text-yellow-400' : 
                    'text-primary'
                  }`}>{nftMetadata?.rarity || '---'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.3em] block">主题</span>
                  <span className="text-[9px] font-mono text-white font-bold tracking-tighter">{nftMetadata?.theme || '---'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.3em] block">网络</span>
                  <span className="text-[9px] font-mono text-white/40 font-bold">AXON_MAINNET</span>
                </div>
             </div>

             <div className="absolute bottom-10 left-10 flex flex-col gap-1">
                <span className="text-[6px] font-bold text-white/40 uppercase tracking-[0.4em]">铸造进度</span>
                <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                   <div className={`h-full bg-primary shadow-[0_0_10px_#D4FF00] transition-all duration-1000 ${isGenerating ? 'w-1/2 animate-pulse' : generatedNFT ? 'w-full' : 'w-0'}`}></div>
                </div>
             </div>

             <div className="absolute bottom-10 right-10 flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[6px] font-bold text-white/40 uppercase tracking-[0.3em] block">帧率</span>
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
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] animate-pulse">铸造中…</span>
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
                      className="flex flex-col items-center gap-2 group relative"
                    >
                      {color.hint ? (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] font-bold text-primary/80 uppercase tracking-widest whitespace-nowrap">
                          {color.hint}
                        </span>
                      ) : null}
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
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">设计模式</span>
                  <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                    {(['Random', 'Custom'] as DesignMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setDesignMode(m)}
                        className={`px-4 py-1.5 rounded text-[9px] uppercase font-bold transition-all ${designMode === m ? 'bg-primary text-black' : 'text-white/50 hover:text-white'}`}
                      >
                        {DESIGN_MODE_LABEL[m]}
                      </button>
                    ))}
                  </div>
                </div>
                
                {designMode === 'Custom' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">上装</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: '大衣', value: 'Coat' },
                          { label: '羽绒', value: 'Puffer' },
                          { label: '短上衣', value: 'Crop Top' },
                          { label: 'T恤', value: 'T-Shirt' },
                          { label: '卫衣', value: 'Hoodie' },
                          { label: 'HBA（特殊）', value: 'HBA' },
                          { label: 'Custom（上传）', value: 'Custom' },
                        ].map((item) => (
                          <button
                            key={item.value}
                            onClick={() => setCustomDesign((p) => ({ ...p, top: item.value }))}
                            className={`px-3 py-1.5 rounded-full text-[9px] uppercase font-bold border transition-all ${
                              customDesign.top === item.value
                                ? item.value === 'HBA' || item.value === 'Custom'
                                  ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)]'
                                  : 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                                : item.value === 'HBA' || item.value === 'Custom'
                                  ? 'border-blue-500/50 text-blue-400 hover:border-blue-400 hover:shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                  : 'border-white/10 text-white/60 hover:border-white/30'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      {customDesign.top === 'HBA' && (
                        <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                          <label className="block text-[8px] font-bold text-white/40 uppercase tracking-widest mb-2">
                            上传 HBA 参考图（可选）
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = () => setHbaImageBase64(reader.result as string);
                              reader.readAsDataURL(file);
                            }}
                            className="text-[9px] text-white/60 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[9px] file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all"
                          />
                          {hbaImageBase64 && (
                            <img
                              src={hbaImageBase64}
                              alt="HBA 参考图"
                              className="mt-3 h-16 w-16 object-cover rounded-lg border border-white/20"
                            />
                          )}
                        </div>
                      )}

                      {customDesign.top === 'Custom' && (
                        <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                          <label className="block text-[8px] font-bold text-white/40 uppercase tracking-widest mb-2">
                            上传 Custom 上装参考图（可选）
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => void handleCustomUpload(e, 'top')}
                            className="text-[9px] text-white/60 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[9px] file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all"
                          />
                          {isAnalyzingTop && <span className="text-[10px] text-primary animate-pulse ml-2">Analyzing...</span>}
                          {customTopImage && (
                            <img
                              src={customTopImage}
                              alt="Custom Top"
                              className="mt-3 h-16 w-16 object-cover rounded-lg border border-white/20"
                            />
                          )}
                          {customTopDesc && (
                            <p className="mt-2 text-[8px] text-white/60 leading-tight">{customTopDesc}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">下装</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: '短裤', value: 'Shorts' },
                          { label: '长裤', value: 'Pants' },
                          { label: '短裙', value: 'Skirt' },
                          { label: '长裙', value: 'Long Skirt' },
                          { label: 'Custom（上传）', value: 'Custom' },
                        ].map((item) => (
                          <button
                            key={item.value}
                            onClick={() => setCustomDesign((p) => ({ ...p, bottom: item.value }))}
                            className={`px-3 py-1.5 rounded-full text-[9px] uppercase font-bold border transition-all ${
                              customDesign.bottom === item.value
                                ? item.value === 'Custom'
                                  ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)]'
                                  : 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                                : item.value === 'Custom'
                                  ? 'border-blue-500/50 text-blue-400 hover:border-blue-400 hover:shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                  : 'border-white/10 text-white/60 hover:border-white/30'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      {customDesign.bottom === 'Custom' && (
                        <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                          <label className="block text-[8px] font-bold text-white/40 uppercase tracking-widest mb-2">
                            上传 Custom 下装参考图（可选）
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => void handleCustomUpload(e, 'bottom')}
                            className="text-[9px] text-white/60 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[9px] file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all"
                          />
                          {isAnalyzingBottom && <span className="text-[10px] text-primary animate-pulse ml-2">Analyzing...</span>}
                          {customBottomImage && (
                            <img
                              src={customBottomImage}
                              alt="Custom Bottom"
                              className="mt-3 h-16 w-16 object-cover rounded-lg border border-white/20"
                            />
                          )}
                          {customBottomDesc && (
                            <p className="mt-2 text-[8px] text-white/60 leading-tight">{customBottomDesc}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">鞋履</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: '运动鞋', value: 'Sneakers' },
                          { label: '战术靴', value: 'Combat Boots' },
                          { label: '拖鞋', value: 'Slippers' },
                          { label: '便鞋', value: 'Regular Shoes' },
                          { label: 'AIM（特殊）', value: 'aim' },
                          { label: 'Custom（上传）', value: 'Custom' },
                        ].map((item) => (
                          <button
                            key={item.value}
                            onClick={() => setCustomDesign((p) => ({ ...p, shoes: item.value }))}
                            className={`px-3 py-1.5 rounded-full text-[9px] uppercase font-bold border transition-all ${
                              customDesign.shoes === item.value
                                ? item.value === 'aim' || item.value === 'Custom'
                                  ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)]'
                                  : 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                                : item.value === 'aim' || item.value === 'Custom'
                                  ? 'border-blue-500/50 text-blue-400 hover:border-blue-400 hover:shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                  : 'border-white/10 text-white/60 hover:border-white/30'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      {customDesign.shoes === 'Custom' && (
                        <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                          <label className="block text-[8px] font-bold text-white/40 uppercase tracking-widest mb-2">
                            上传 Custom 鞋履参考图（可选）
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => void handleCustomUpload(e, 'shoes')}
                            className="text-[9px] text-white/60 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[9px] file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all"
                          />
                          {isAnalyzingShoes && <span className="text-[10px] text-primary animate-pulse ml-2">Analyzing...</span>}
                          {customShoesImage && (
                            <img
                              src={customShoesImage}
                              alt="Custom Shoes"
                              className="mt-3 h-16 w-16 object-cover rounded-lg border border-white/20"
                            />
                          )}
                          {customShoesDesc && (
                            <p className="mt-2 text-[8px] text-white/60 leading-tight">{customShoesDesc}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {designMode === 'Random' && (
                  <div className="h-24 flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest">AI 将随机生成一套造型</span>
                  </div>
                )}
              </div>
            ) : (
              /* Slider Layout for Body, Style */
              <div className="space-y-6">
                {activeCategory === 'Body' && (
                  <div className="flex justify-between items-center mb-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">性别 / 类型</span>
                    <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                      {(['Male', 'Female', 'Creature'] as Gender[]).map((g) => (
                        <button
                          key={g}
                          onClick={() => setGender(g)}
                          className={`px-3 py-1 rounded text-[8px] uppercase font-bold transition-all ${gender === g ? 'bg-primary text-black' : 'text-white/50 hover:text-white'}`}
                        >
                          {GENDER_LABEL[g]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {activeCategory === 'Style' && (
                  <div className="flex justify-between items-center mb-4 animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">审美风格</span>
                    <div className="flex gap-1 bg-white/5 p-1 rounded-lg overflow-x-auto no-scrollbar max-w-[60%]">
                      {[
                        { label: '默认', value: 'Default' as const },
                        { label: "90's 高定", value: '90s Haute Couture Runway' as const },
                      ].map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setAestheticStyle(s.value)}
                          className={`px-3 py-1 rounded text-[8px] uppercase font-bold transition-all whitespace-nowrap ${
                            aestheticStyle === s.value ? 'bg-primary text-black' : 'text-white/50 hover:text-white'
                          }`}
                        >
                          {s.label}
                        </button>
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
            {categories.map((cat) => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-5 py-2 rounded-full font-bold text-[10px] uppercase transition-all duration-300 ${
                  activeCategory === cat 
                  ? 'bg-primary text-black shadow-[0_0_15px_rgba(212,255,0,0.2)]' 
                  : 'glass text-white/40 hover:text-white/70'
                }`}
              >
                {CATEGORY_LABEL[cat]}
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={generateNFT}
              disabled={isGenerating}
              className="flex-1 bg-white text-black py-4.5 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl font-black uppercase tracking-[0.2em] text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{isGenerating ? '铸造中…' : '生成专属 NFT'}</span>
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
                title="保存 2K 图片"
              >
                <span className="material-icons-round">download</span>
              </button>
            )}
            <button 
              onClick={() => {
                setParams({
                  muscularity: 35, jawline: 70, proportions: 64, heavy: 25,
                  chromaticity: 60, era: 29, thickness: 100
                });
                setSelectedSkinColor('#E0AC69');
                setGender('Female');
                setCreatureTexture('Hairless');
                setDesignMode('Random');
                setAestheticStyle('Default');
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
                <p className="text-white/30 text-[11px] uppercase tracking-[0.4em] font-bold mt-2">神经节点在线</p>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="mb-14">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-[0.5em] mb-4 block underline underline-offset-8">Web3 V.1.0</span>
                  <h3 className="text-4xl font-black leading-[0.9] uppercase tracking-tighter text-white">
                    {authMode === 'signIn' ? <>连接<br/>钱包</> : <>NFT<br/>铸造</>}
                  </h3>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/20 ml-6 tracking-[0.3em]">账号</label>
                    <input 
                      required
                      type="email" 
                      placeholder="USER_CORE@AXON.SYS"
                      className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] px-10 py-6 text-sm text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/10 font-space"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/20 ml-6 tracking-[0.3em]">密码</label>
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
                    <span>{authMode === 'signIn' ? '开始' : '建立'}</span>
                    <div className="bg-primary p-3 rounded-2xl text-black group-hover:scale-110 transition-transform">
                      <span className="material-icons-round text-lg">{authMode === 'signIn' ? 'vpn_key' : 'fingerprint'}</span>
                    </div>
                  </button>
                </form>

                <button 
                  onClick={toggleMode} 
                  className="mt-12 text-[10px] text-white/30 uppercase tracking-[0.4em] hover:text-primary transition-colors text-center w-full font-bold"
                >
                  {authMode === 'signIn' ? '请求协议接入' : '节点已激活？'}
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
