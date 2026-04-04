import React from 'react';
import { Sidebar } from './components/Sidebar';
import { HistoryPanel } from './components/HistoryPanel';
import { MainViewport } from './components/MainViewport';
import { CustomizationPanel } from './components/CustomizationPanel';
import { LandingPage } from './components/LandingPage';
import { ModelsPage } from './components/ModelsPage';
import { TutorialOverlay } from './components/TutorialOverlay';
import { CharacterAttributes, DEFAULT_ATTRIBUTES } from './types';
import { generatePrompt } from './lib/promptGenerator';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { getCloudbaseAuth, pickWebAuthUserIdEmail } from '@nftt/lib/cloudbase';
import { generateGeminiImage } from '@nftt/lib/geminiClient';
import { generateGeminiText } from '@nftt/lib/geminiTextClient';
import { persistMtmGeneration } from '@nftt/lib/mtmModelPersist';
import { MtmAuth } from './MtmAuth';

export default function App() {
  const [attributes, setAttributes] = React.useState<CharacterAttributes>(DEFAULT_ATTRIBUTES);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showSettings, setShowSettings] = React.useState(false);
  const [currentView, setCurrentView] = React.useState<'landing' | 'models' | 'app'>('landing');
  const [tutorialStep, setTutorialStep] = React.useState(0);

  const [hydrated, setHydrated] = React.useState(false);
  const [cloudUser, setCloudUser] = React.useState<{ uid: string; email?: string } | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = React.useState(0);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [appGallery, setAppGallery] = React.useState<null | 'personal' | 'global'>(null);

  React.useEffect(() => {
    if (!cloudUser?.uid) setAppGallery(null);
  }, [cloudUser?.uid]);

  const PUBLISH_GLOBAL_KEY = 'mtm_publish_to_global';
  const [publishToGlobal, setPublishToGlobal] = React.useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem(PUBLISH_GLOBAL_KEY) === '1';
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      window.localStorage.setItem(PUBLISH_GLOBAL_KEY, publishToGlobal ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [publishToGlobal]);

  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const syncUser = React.useCallback(async () => {
    const auth = getCloudbaseAuth();
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    try {
      for (let i = 0; i < 14; i += 1) {
        const u = await auth.getCurrentUser();
        const picked = pickWebAuthUserIdEmail(u);
        if (picked) {
          if (mountedRef.current) setCloudUser(picked);
          return;
        }
        await sleep(i === 0 ? 0 : 70 * i);
      }
      if (mountedRef.current) setCloudUser(null);
    } catch {
      if (mountedRef.current) setCloudUser(null);
    }
  }, []);

  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      await syncUser();
      if (mountedRef.current) setHydrated(true);
      try {
        const sub = getCloudbaseAuth().onAuthStateChange(() => {
          void syncUser();
        });
        unsubscribe = sub?.data?.subscription?.unsubscribe;
      } catch (e) {
        console.error('onAuthStateChange failed', e);
      }
    })();

    return () => {
      try {
        unsubscribe?.();
      } catch {
        /* ignore */
      }
    };
  }, [syncUser]);

  const handleEnterApp = () => {
    setCurrentView('app');
    setTutorialStep(1);
  };

  const handleSignOut = async () => {
    setCloudUser(null);
    try {
      await getCloudbaseAuth().signOut();
    } catch (e) {
      console.error(e);
    }
    setCloudUser(null);
  };

  const handleInterrogate = async (file: File) => {
    setIsGenerating(true);
    setError(null);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(file);
      });
      const base64Image = await base64Promise;
      const base64Data = base64Image.split(',')[1];
      const mimeType = base64Image.split(';')[0].split(':')[1];

      const interrogatedPrompt = await generateGeminiText({
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          {
            text: 'Analyze this high-fashion model image and provide a detailed prompt that could be used to generate a similar image. Focus on ethnicity, hair, face features, lighting, and clothing. Return only the prompt string, no other text.',
          },
        ],
      });
      setAttributes((prev) => ({ ...prev, interrogatedPrompt }));
    } catch (err) {
      console.error('Interrogation failed:', err);
      setError('关键词反推失败，请确认主站 /api 已启动且已配置 GEMINI_API_KEY。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async (customPrompt?: string) => {
    setError(null);
    setIsGenerating(true);
    try {
      const prompt = customPrompt || generatePrompt(attributes);
      const model = 'gemini-2.5-flash-image' as const;

      let imageDataUrl: string;

      if (attributes.isVirtualRestoration && attributes.virtualImage) {
        const base64Data = attributes.virtualImage.split(',')[1];
        const mimeType = attributes.virtualImage.split(';')[0].split(':')[1];
        imageDataUrl = await generateGeminiImage({
          model,
          parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }],
        });
      } else if (attributes.referenceImage) {
        const base64Data = attributes.referenceImage.split(',')[1];
        const mimeType = attributes.referenceImage.split(';')[0].split(':')[1];
        const weightText = `\n\nIMPORTANT: Use the provided image as a strong reference for the subject's face, features, and overall vibe. The influence weight of this reference image should be considered as ${Math.round(attributes.referenceWeight * 100)}%.`;
        imageDataUrl = await generateGeminiImage({
          model,
          parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt + weightText }],
        });
      } else {
        imageDataUrl = await generateGeminiImage({ model, prompt });
      }

      setImageUrl(imageDataUrl);

      if (cloudUser?.uid) {
        try {
          const { url } = await persistMtmGeneration(imageDataUrl, prompt, cloudUser.uid, {
            publishToPublic: publishToGlobal,
          });
          setImageUrl(url);
          setHistoryRefreshKey((k) => k + 1);
        } catch (persistErr) {
          console.error('Persist image failed:', persistErr);
          setError('图片已生成，但保存到 MODELCARD / 数据库失败，请检查 COS 与 HMRS、MODELFILE 权限。');
        }
      }
    } catch (err: unknown) {
      console.error('Generation failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') ? '配额紧张，请稍后再试。' : `生成失败：${msg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white font-sans text-[10px] font-bold uppercase tracking-widest text-black/40">
        加载中…
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-white font-sans">
      <AnimatePresence>
        {currentView === 'landing' && (
          <LandingPage onEnter={handleEnterApp} onNavigateToModels={() => setCurrentView('models')} />
        )}
        {currentView === 'models' && (
          <ModelsPage variant="demo" onBack={() => setCurrentView('landing')} />
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <Sidebar
        onSettingsClick={() => setShowSettings(true)}
        onSignOut={() => void handleSignOut()}
        userEmail={cloudUser?.email}
        isLoggedIn={!!cloudUser}
        onOpenAuth={() => setShowAuthModal(true)}
      />
      <div className="relative z-10 ml-24 flex flex-1 gap-0">
        <CustomizationPanel
          attributes={attributes}
          onChange={setAttributes}
          onGenerate={() => void handleGenerate()}
          onInterrogate={handleInterrogate}
          isGenerating={isGenerating}
        />
        <div className="min-w-0 flex-1 bg-[#f8f8f8]">
          <MainViewport
            imageUrl={imageUrl}
            isGenerating={isGenerating}
            onGenerate={() => void handleGenerate()}
            error={error}
            attributes={attributes}
            onAttributesChange={(attrs) => setAttributes(attrs)}
          />
        </div>
        <HistoryPanel
          uid={cloudUser?.uid ?? ''}
          email={cloudUser?.email}
          refreshKey={historyRefreshKey}
          publishToGlobal={publishToGlobal}
          onPublishToGlobalChange={setPublishToGlobal}
          onOpenPersonalGallery={
            cloudUser?.uid ? () => setAppGallery('personal') : undefined
          }
          onOpenGlobalGallery={cloudUser?.uid ? () => setAppGallery('global') : undefined}
        />
      </div>

      <AnimatePresence>
        {currentView === 'app' &&
          appGallery &&
          cloudUser?.uid &&
          React.createElement(ModelsPage, {
            key: appGallery,
            variant: appGallery,
            uid: cloudUser.uid,
            email: cloudUser.email,
            listRefreshKey: historyRefreshKey,
            onBack: () => setAppGallery(null),
          })}
      </AnimatePresence>

      {tutorialStep > 0 && (
        <TutorialOverlay
          step={tutorialStep}
          onNext={() => setTutorialStep((prev) => (prev < 4 ? prev + 1 : 0))}
          onSkip={() => setTutorialStep(0)}
        />
      )}

      <MtmAuth
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSignedIn={(info) => setCloudUser({ uid: info.uid, email: info.email })}
      />

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="absolute right-6 top-6 text-black/20 transition-colors hover:text-black"
              >
                <X size={20} />
              </button>

              <div className="mb-8 flex flex-col gap-2">
                <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-black">设置</h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">本应用内置 API</p>
              </div>

              <div className="space-y-4 text-[11px] leading-relaxed text-black/70">
                <p>
                  图像生成走 <code className="text-black">/api/gemini</code>，反推走 <code className="text-black">/api/gemini-text</code>
                  ；模特卡上传至 COS 目录 <code className="text-black">MODELCARD/</code>（序号文件名）走{' '}
                  <code className="text-black">/api/mtm-modelcard-upload</code>。请配置 <code className="text-black">GEMINI_API_KEY</code> 与{' '}
                  <code className="text-black">COS_*</code>。云数据库需集合 <code className="text-black">HMRS</code>、<code className="text-black">MODELFILE</code>。
                </p>
                <p>
                  本地开发：在本应用目录放 <code className="text-black">.env.local</code>（含 <code className="text-black">GEMINI_API_KEY</code>
                  、<code className="text-black">COS_*</code>）；终端 1 在此目录运行 <code className="text-black">npm run dev:api</code>（
                  <code className="text-black">vercel dev</code>，默认 3000）；终端 2 <code className="text-black">npm run dev</code>，Vite 将{' '}
                  <code className="text-black">/api</code> 代理到 3000。
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="mt-8 w-full bg-black py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white"
              >
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {currentView === 'app' && !cloudUser && (
        <button
          type="button"
          onClick={() => setShowAuthModal(true)}
          className="pointer-events-auto fixed bottom-6 right-6 z-[120] max-w-[240px] border border-black/10 bg-white px-4 py-3 text-left shadow-lg transition hover:border-black"
        >
          <span className="block text-[10px] font-bold uppercase tracking-widest text-black">未登录</span>
          <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider leading-relaxed text-black/45">
            点击登录 / 注册
          </span>
        </button>
      )}
    </div>
  );
}
