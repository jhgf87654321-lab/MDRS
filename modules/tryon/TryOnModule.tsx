import React, { useEffect, useRef, useState } from 'react';
import { generateGeminiImage } from '../../lib/geminiClient';
import { uploadImageToCloudBase } from '../../lib/apiClient';

type CameraMode = 'front' | 'rear' | 'off';

type CyberCollectionItem = {
  image: string;
  prompt?: string;
  serialNumber?: string;
  isSpecial?: boolean;
  theme?: string;
};

function safeParseJson<T>(value: string | null): { ok: true; value: T } | { ok: false; error: string } {
  if (!value) return { ok: false, error: 'empty' };
  try {
    return { ok: true, value: JSON.parse(value) as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function getStylePromptFromLocalStorage(): string {
  const nftDataStr = localStorage.getItem('generatedNFTData');
  const parsed = safeParseJson<{ prompt?: string }>(nftDataStr);
  if (parsed.ok && typeof parsed.value.prompt === 'string' && parsed.value.prompt.trim()) {
    return parsed.value.prompt.trim();
  }
  return 'high-end avant-garde fashion clothing';
}

async function compressDataUrl(dataUrl: string, maxDim: number, quality: number): Promise<string> {
  if (!dataUrl.startsWith('data:')) return dataUrl;
  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
  });
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
    const webp = canvas.toDataURL('image/webp', quality);
    if (webp) return webp;
  } catch {
    // ignore
  }
  return canvas.toDataURL('image/jpeg', quality);
}

export default function TryOnModule() {
  const [cameraMode, setCameraMode] = useState<CameraMode>('off');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [generatedNFT, setGeneratedNFT] = useState<string | null>(null);
  const [myCyberCollection, setMyCyberCollection] = useState<CyberCollectionItem[]>([]);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tryon' | 'nft'>('tryon');
  const [isApplying, setIsApplying] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedNFT = localStorage.getItem('generatedNFT');
    if (storedNFT) setGeneratedNFT(storedNFT);

    const storedCollection = localStorage.getItem('myCyberCollection');
    const parsed = safeParseJson<CyberCollectionItem[]>(storedCollection);
    if (parsed.ok && Array.isArray(parsed.value)) {
      setMyCyberCollection(parsed.value);
    } else if (storedCollection) {
      console.error('Failed to parse myCyberCollection', parsed);
    }

    const storedTryOn = localStorage.getItem('tryOnLastImage');
    if (storedTryOn) {
      setUploadedImage(storedTryOn);
      setViewMode('tryon');
    }
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    const start = async () => {
      if (cameraMode === 'off') return;
      const facingMode = cameraMode === 'front' ? 'user' : 'environment';
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        console.error('Error accessing camera', e);
        alert('Failed to access camera.');
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [cameraMode]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result;
      if (typeof result !== 'string') {
        console.error('Unexpected FileReader result', result);
        alert('Failed to read file.');
        return;
      }
      try {
        const compressed = await compressDataUrl(result, 1280, 0.85);
        setUploadedImage(compressed);
      } catch {
        setUploadedImage(result);
      }
      setViewMode('tryon');
      setCameraMode('off');
    };
    reader.onerror = (err) => {
      console.error('FileReader error', err);
      alert('Failed to read file.');
    };
    reader.readAsDataURL(file);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleApplyStyle = async () => {
    if (cooldownUntil && Date.now() < cooldownUntil) {
      const secs = Math.ceil((cooldownUntil - Date.now()) / 1000);
      alert(`Gemini quota is cooling down. Please try again in ~${secs}s.`);
      return;
    }

    let baseImage = uploadedImage;
    if (cameraMode !== 'off') baseImage = captureFrame();

    if (!baseImage) {
      alert('Please upload an image or turn on the camera.');
      return;
    }
    if (!generatedNFT) {
      alert('Please generate an NFT first in the Creator tab.');
      return;
    }

    setIsApplying(true);
    try {
      try {
        baseImage = await compressDataUrl(baseImage, 1280, 0.85);
      } catch {
        // ignore
      }

      const stylePrompt = getStylePromptFromLocalStorage();
      const prompt =
        `把图2人物的衣服穿在图1人物身上，\n` +
        `要求：\n` +
        `1）图1中的人物身份、五官、发型、肤色、身材比例、肢体姿势必须保持不变；图1的背景环境/镜头角度/构图/景深/光线方向也必须保持不变。\n` +
        `2）只替换服装：从图2中提取所有可见衣服（外套、内搭、下装、靴子/鞋履、明显配饰），把这整套造型自然地穿在图1人物身上。\n` +
        `3）必须同步替换图2中的鞋履和头部相关配饰（如帽子、头盔、发饰、头纱等）：如果图2人物穿了靴子或戴了头饰，那么图1结果中也必须穿同款靴子/鞋、戴同款头饰。\n` +
        `4）不能随意新增或删除鞋履和头饰：如果图2没有帽子，不要凭空加帽子；如果图2有头盔，不要在结果中去掉头盔。只允许做符合图1人物姿势和头部方向的透视调整。\n` +
        `5）服装（包括鞋履和头饰）的设计、版型、结构线、材质、颜色、图案、Logo/文字（如果这些属于“衣服本身”的印花或标识）都不能改变；只允许为了适配图1人物的身体和姿势而改变透视和褶皱（例如拉伸、弯曲、产生新的阴影和皱褶）。\n` +
        `6）严禁把图2的背景元素带入结果：不要保留图2里的背景、标语、海报、字母、图形或任何非服装元素。尤其不要让图2背景中的“FUTURE MODE”等文字出现在结果里。\n` +
        `7）结果必须是一张完整单图、高质量写实照片，光影自然；不能添加水印、UI、边框、海报文字、额外标识。若输出中出现任何不属于衣服本身的文字，请去除。\n` +
        `8）整体效果要看起来就像图1原始照片中，这个人真实穿上了图2这整套服装（含鞋子和头饰），人物姿势与背景完全不变。\n` +
        (stylePrompt ? `9）服装细节和整体气质尽量贴合以下风格描述（仅作为风格倾向，不得改变服装设计本体）：${stylePrompt}。\n` : '');

      // Upload both images to COS and send URLs to backend
      const [baseUrl, nftUrl] = await Promise.all([
        uploadImageToCloudBase(baseImage),
        uploadImageToCloudBase(generatedNFT),
      ]);

      const newImgData = await generateGeminiImage({
        prompt,
        imageUrls: [baseUrl, nftUrl],
        // Prefer a widely-available image model; backend will fallback if unsupported.
        model: 'gemini-3.1-flash-image-preview',
      });
      setUploadedImage(newImgData);
      localStorage.setItem('tryOnLastImage', newImgData);
      setViewMode('tryon');
      setCameraMode('off');
    } catch (error) {
      console.error('Error applying style', error);
      const msg = error instanceof Error ? error.message : String(error);
      const status = (error as any)?.status as number | undefined;
      if (status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('429')) {
        // 60s client cooldown to prevent hammering
        setCooldownUntil(Date.now() + 60_000);
        alert('Gemini quota exhausted (429). Please wait 1-2 minutes and try again.');
      } else {
        alert('Failed to apply style.');
      }
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      <header className="px-8 pt-12 flex justify-between items-start z-20">
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 bg-white flex items-center justify-center rounded-lg">
            <span className="material-icons-round text-black text-xl">blur_on</span>
          </div>
          <span className="text-2xl font-display font-black tracking-tighter">FUTR</span>
        </div>
        <div className="bg-primary text-black px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase animate-pulse-fast">
          AI Active
        </div>
      </header>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden py-10">
        <button
          type="button"
          onClick={() => {
            if (!uploadedImage || !generatedNFT) return;
            setViewMode((m) => (m === 'tryon' ? 'nft' : 'tryon'));
          }}
          className="relative w-[85%] aspect-[3/4] rounded-[3rem] overflow-hidden border border-white/10 text-left"
        >
          {cameraMode !== 'off' ? (
            <div className="w-full h-full p-4 flex items-center justify-center bg-black/10">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`max-w-full max-h-full object-contain ${cameraMode === 'front' ? 'scale-x-[-1]' : ''}`}
              />
            </div>
          ) : (
            <div className="w-full h-full p-4 flex items-center justify-center bg-black/10">
              <img
                src={
                  (viewMode === 'nft' ? generatedNFT : uploadedImage) ||
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuCKAMKp0TtEWJYJNcZuRTSgY_qvozq8oPMukJQbQpVZgsHfEt4BELcOppAn9n2f69uW7rHKIppo3NkRAt0fNpWMEQet9_wvR1rbxCAsCi4cJxkoEIVWWgVreHMFkfNN0rRiDtjI1zo24VYB5qj6Vspq0H9mvbfg8v8AYD3amnNu3uYh6CPqSLVBcmRRYlxolIlYPXF2Ruc6Jqsn7-U6JhYZaue9IdiNF1JDy4KM4mM5jNjapu6onKj9gQY0JkJrsmRd4rW6qBYwzv45'
                }
                alt="Portrait"
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          <div className="absolute left-0 right-0 h-[2px] bg-primary shadow-[0_0_20px_#D4FF00] animate-scan z-20"></div>
          {!uploadedImage && cameraMode === 'off' && (
            <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
              <div className="text-6xl font-display font-black text-white/20 leading-none">
                TECH
                <br />
                WEAR
              </div>
            </div>
          )}

          {uploadedImage && generatedNFT && cameraMode === 'off' && (
            <div className="absolute top-4 left-4 z-30 px-3 py-1 rounded-full bg-black/50 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/70">
              Tap to toggle: {viewMode === 'tryon' ? 'Try-on' : 'NFT'}
            </div>
          )}
        </button>

        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 glass rounded-full z-30">
          <button
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black shadow-lg overflow-hidden"
            onClick={() => {
              if (myCyberCollection.length > 0) {
                setIsCollectionModalOpen(true);
                return;
              }
              if (generatedNFT) {
                setUploadedImage(generatedNFT);
                setCameraMode('off');
                return;
              }
              alert('Please generate an NFT first in the Creator tab.');
            }}
          >
            {myCyberCollection.length > 0 ? (
              <img src={myCyberCollection[0].image} alt="NFT" className="w-full h-full object-cover" />
            ) : generatedNFT ? (
              <img src={generatedNFT} alt="NFT" className="w-full h-full object-cover" />
            ) : (
              <span className="material-icons-round text-sm">person</span>
            )}
          </button>
          <button
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              cameraMode === 'rear' ? 'bg-primary text-black' : 'text-white/50'
            }`}
            onClick={() => setCameraMode(cameraMode === 'rear' ? 'off' : 'rear')}
          >
            <span className="material-icons-round text-sm">flip_camera_ios</span>
          </button>
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="material-icons-round text-sm">photo_library</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
        </div>

        {/* Sidebar placeholder from upgrade4 */}
        <div
          className={`absolute right-0 top-1/2 -translate-y-1/2 flex items-center transition-transform duration-300 z-30 ${
            isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <button
            className="w-8 h-16 bg-black/50 backdrop-blur-md rounded-l-xl flex items-center justify-center border border-r-0 border-white/10 text-white/50 absolute -left-8"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <span className="material-icons-round text-xl">{isSidebarOpen ? 'chevron_right' : 'chevron_left'}</span>
          </button>
          <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-l-3xl flex flex-col gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center p-2">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBG6WqRaM55MRml9LIPs_F5kVbZokZOg2YSXEGbMsVuJaVnAQcul7346_uJBQfrumeMs4RJiVPPq0C4EwSgycaRap4Wa4bVXnw8Oeb26kb3FQX08gbiOAYcgZK5kNmSxC3_IQXEOvQlOiHo1jtmsUxbA-5gYQPmcqtYnorvKBp9s2gJ6jYpum6fuqx7rk1d9NBrIOSAk-Qj_kjrZ9KLLaz1MHOsgcTHCYMcR-spaluEu3woUbt8YGT0nEQQAqMItW19S-MbmrJzPWm"
                className="max-h-full object-contain mix-blend-multiply"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center p-2 grayscale">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2Q-pOZFhFDId8Com849gNPMDIdk84Yw2ZccQg-Fvrbaj-Zc-VcMXfDuGuhNxV6s_Idsxl9QHdG75f7fH2GDsi5ALKimD42BMkZz1l24Ws9xMONdRNuZE8BBWc9-ZoJ7GI8bCmAHcuKAAPKAcN7pGtgA42Abo1NAEVMas9UiS38mHh8ZTRGSTnCNC5eBDGrgHCRkSCwsJTibEVnb7wNKt27uPA9T2lT8mm4gucQ12QR81i3kmuRM5oVGnhmkU02I1xgOdTGc88E2SI"
                className="max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center p-2 grayscale">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVucNnGP65fT1VxBGQcOoAzZo1MdQtInARpkrmjQ5DFXf7fJ-90am7UYwO8rJnGOamgndOjTd5M8DPSo31EuJR1CpEjd_w8Nfzf8PHhBjlR5vtEHG7CtmuE1s5e2sue2rQ9D8d9TkFgWbE7ei6X6iwZLk8zcoyu_RYcnlFjNJFEUH1hdJ7EFPAE4WNcpBQnzlTsPQpQe5WCL8cZ07unSfUy7N5r5DAmUQ8VhqEW9XlR_PA8JC9J2dGmALI-KiFraD9M2kyNkERE7vE"
                className="max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-black glass p-4 pb-28 rounded-t-[3rem] border-t border-white/10 z-30 flex justify-center">
        <button
          onClick={() => void handleApplyStyle()}
          disabled={isApplying || (cooldownUntil !== null && Date.now() < cooldownUntil)}
          className="w-full max-w-xs bg-primary/10 border border-primary/50 text-primary py-4 rounded-[2rem] flex items-center justify-center gap-3 group active:scale-95 transition-all shadow-[0_0_20px_rgba(212,255,0,0.2)] hover:bg-primary/20 backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className={`material-icons-round text-xl ${isApplying ? 'animate-spin' : ''}`}>{isApplying ? 'sync' : 'auto_awesome'}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {isApplying ? 'Applying...' : cooldownUntil !== null && Date.now() < cooldownUntil ? 'Cooling down...' : 'Apply NFT Style'}
          </span>
        </button>
      </div>

      {isCollectionModalOpen && myCyberCollection.length > 0 && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="w-full max-w-[380px] glass rounded-[2.5rem] border border-white/10 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary">My Cyber Collection</h3>
              <button
                onClick={() => setIsCollectionModalOpen(false)}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
              >
                <span className="material-icons-round">close</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto no-scrollbar">
              {myCyberCollection.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setUploadedImage(item.image);
                    setCameraMode('off');
                    setIsCollectionModalOpen(false);
                  }}
                  className="aspect-square rounded-2xl overflow-hidden border border-white/10 hover:border-primary/50 transition-colors"
                >
                  <img src={item.image} alt="NFT" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

