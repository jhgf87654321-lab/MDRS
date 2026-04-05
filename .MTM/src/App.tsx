import React from 'react';
import { flushSync } from 'react-dom';
import { Sidebar } from './components/Sidebar';
import { HistoryPanel } from './components/HistoryPanel';
import { MainViewport, type MainViewportHandle } from './components/MainViewport';
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
import { translateSearchKeywordIfChinese } from './lib/searchKeywordTranslate';
import { loadDemoModelSlotUrls, persistDemoModelSlotUrls } from './lib/demoModelSlots';
import { MtmAuth } from './MtmAuth';
import { ThreeViewDevelopingPage } from './components/ThreeViewDevelopingPage';

export default function App() {
  const [attributes, setAttributes] = React.useState<CharacterAttributes>(DEFAULT_ATTRIBUTES);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showSettings, setShowSettings] = React.useState(false);
  const [currentView, setCurrentView] = React.useState<'landing' | 'models' | 'app'>('landing');
  const [tutorialStep, setTutorialStep] = React.useState(0);
  /** 开屏滚筒与 Models（demo）共用 8 槽位 */
  const [demoModelSlotUrls, setDemoModelSlotUrls] = React.useState(loadDemoModelSlotUrls);
  const handleDemoSlotReplace = React.useCallback((index: number, dataUrl: string) => {
    setDemoModelSlotUrls((prev) => {
      const next = [...prev];
      if (index >= 0 && index < next.length) next[index] = dataUrl;
      persistDemoModelSlotUrls(next);
      return next;
    });
  }, []);

  const [hydrated, setHydrated] = React.useState(false);
  const [cloudUser, setCloudUser] = React.useState<{ uid: string; email?: string } | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = React.useState(0);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [appGallery, setAppGallery] = React.useState<null | 'personal' | 'global' | 'search'>(null);
  const [gallerySearchKeyword, setGallerySearchKeyword] = React.useState('');
  /** 中文检索时保留原文，与译英并行匹配 MODELFILE.keywords */
  const [gallerySearchAlt, setGallerySearchAlt] = React.useState('');
  const [threeViewOpen, setThreeViewOpen] = React.useState(false);

  React.useEffect(() => {
    if (!cloudUser?.uid) {
      setAppGallery((prev) => (prev === 'personal' || prev === 'search' ? null : prev));
    }
  }, [cloudUser?.uid]);

  const PUBLISH_GLOBAL_KEY = 'mtm_publish_to_global';
  const [publishToGlobal, setPublishToGlobal] = React.useState(() => {
    try {
      if (typeof window === 'undefined') return true;
      const v = window.localStorage.getItem(PUBLISH_GLOBAL_KEY);
      if (v === null || v === '') return true;
      return v === '1';
    } catch {
      return true;
    }
  });
  const publishToGlobalRef = React.useRef(publishToGlobal);
  publishToGlobalRef.current = publishToGlobal;
  const mainViewportRef = React.useRef<MainViewportHandle>(null);

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

      flushSync(() => {
        setImageUrl(imageDataUrl);
      });
      // 教程遮罩 z 高于主视区，会挡住模卡下载；生成成功后关闭，未登录用户也可使用下载
      setTutorialStep(0);

      if (cloudUser?.uid) {
        // 必须先结束 Generating 遮罩，否则 html2canvas 截到的是加载层而非模卡
        flushSync(() => {
          setIsGenerating(false);
        });
        try {
          await new Promise((r) => requestAnimationFrame(() => r(undefined)));
          await new Promise((r) => requestAnimationFrame(() => r(undefined)));
          await new Promise((r) => setTimeout(r, 450));
          let cardPng = await mainViewportRef.current?.captureFullModelCardPng();
          if (!cardPng || cardPng.length < 2000) {
            await new Promise((r) => setTimeout(r, 550));
            cardPng = await mainViewportRef.current?.captureFullModelCardPng();
          }
          const uploadDataUrl =
            cardPng && cardPng.startsWith('data:image') && cardPng.length > 500 ? cardPng : imageDataUrl;
          await persistMtmGeneration(uploadDataUrl, prompt, cloudUser.uid, {
            publishToPublic: publishToGlobalRef.current === true,
          });
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
          <LandingPage
            cylinderImages={demoModelSlotUrls}
            onEnter={handleEnterApp}
            onNavigateToModels={() => setCurrentView('models')}
          />
        )}
        {currentView === 'models' && (
          <ModelsPage
            variant="demo"
            demoSlotUrls={demoModelSlotUrls}
            onDemoSlotReplace={handleDemoSlotReplace}
            onBack={() => setCurrentView('landing')}
          />
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <Sidebar
        onSettingsClick={() => setShowSettings(true)}
        onThreeViewOpen={() => setThreeViewOpen(true)}
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
            ref={mainViewportRef}
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
          onOpenGlobalGallery={() => setAppGallery('global')}
          onSubmitKeywordSearch={
            cloudUser?.uid
              ? async (kw) => {
                  const raw = kw.trim();
                  const q = (await translateSearchKeywordIfChinese(kw)).trim();
                  const effective = q || raw;
                  setGallerySearchKeyword(effective);
                  setGallerySearchAlt(raw && raw !== effective ? raw : '');
                  setAppGallery('search');
                }
              : undefined
          }
        />
      </div>

      <AnimatePresence>
        {threeViewOpen && (
          <ThreeViewDevelopingPage key="three-view-developing" onClose={() => setThreeViewOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currentView === 'app' &&
          appGallery &&
          (appGallery === 'global' || cloudUser?.uid) &&
          React.createElement(ModelsPage, {
            key: `${appGallery}-${gallerySearchKeyword}-${gallerySearchAlt}`,
            variant: appGallery,
            uid: cloudUser?.uid,
            email: cloudUser?.email,
            listRefreshKey: historyRefreshKey,
            searchKeyword: appGallery === 'search' ? gallerySearchKeyword : undefined,
            searchKeywordAlt: appGallery === 'search' ? gallerySearchAlt || undefined : undefined,
            onBack: () => {
              setAppGallery(null);
              setGallerySearchKeyword('');
              setGallerySearchAlt('');
            },
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
                <p className="text-[9px] font-mono text-black/50">
                  构建 ID：<span className="text-black">{__APP_BUILD_ID__}</span>（应与 Vercel 部署 Commit 前 7 位一致）
                </p>
              </div>

              <div className="space-y-4 text-[11px] leading-relaxed text-black/70">
                <p>
                  图像生成走 <code className="text-black">/api/gemini</code>，反推走 <code className="text-black">/api/gemini-text</code>
                  ；模特卡上传至 COS：<code className="text-black">MODELCARD/</code>（默认）或勾选公区时{' '}
                  <code className="text-black">MODELCARD/public/</code>，走 <code className="text-black">/api/mtm-modelcard-upload</code>。请配置{' '}
                  <code className="text-black">GEMINI_API_KEY</code> 与 <code className="text-black">COS_*</code>。云数据库需集合{' '}
                  <code className="text-black">HMRS</code>、<code className="text-black">MODELFILE</code>。
                </p>
                <p>
                  前端在国内域名、关 VPN 无法访问 Gemini 时：构建变量设{' '}
                  <code className="text-black">VITE_GEMINI_API_BASE_URL</code> 为可访问 Google 的 Vercel 根 URL（无尾斜杠）；COS 上传等仍用同源或{' '}
                  <code className="text-black">VITE_API_BASE_URL</code> 指向国内可达的 API。
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
          className="pointer-events-auto fixed bottom-4 right-4 z-[120] box-border w-[min(240px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden border border-black/10 bg-white px-3 py-3 text-left shadow-lg transition hover:border-black"
        >
          <span className="block truncate text-[10px] font-bold uppercase tracking-widest text-black">未登录</span>
          <span className="mt-1 block truncate text-[9px] font-bold uppercase tracking-wider leading-relaxed text-black/45">
            点击登录 / 注册
          </span>
        </button>
      )}
    </div>
  );
}
