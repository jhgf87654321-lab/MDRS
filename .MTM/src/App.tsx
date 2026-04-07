import React, { Suspense } from 'react';
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
import { getLandingMusicResolvedSrc } from '@nftt/lib/landingMusic';
import { VIDEO_NAV_HREF } from './lib/navConstants';
import { MtmAuth } from './MtmAuth';
const ThreeViewDevelopingPage = React.lazy(() =>
  import('./components/ThreeViewDevelopingPage').then((m) => ({ default: m.ThreeViewDevelopingPage })),
);

export default function App() {
  const [attributes, setAttributes] = React.useState<CharacterAttributes>(DEFAULT_ATTRIBUTES);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [persistNotice, setPersistNotice] = React.useState<string | null>(null);
  const [isPersisting, setIsPersisting] = React.useState(false);
  const lastPersistRef = React.useRef<null | { dataUrl: string; prompt: string; uid: string; publishToPublic: boolean }>(
    null,
  );

  const shrinkImageDataUrlForReference = React.useCallback(async (dataUrl: string): Promise<string> => {
    // 参考图过大时：Gemini inlineData 传输与解码容易失败；这里做一次轻量缩边 + JPEG 压缩
    if (!dataUrl?.startsWith('data:image')) return dataUrl;
    if (typeof document === 'undefined') return dataUrl;
    const MAX_EDGE = 1536;
    const JPEG_QUALITY = 0.88;
    return await new Promise<string>((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          const w0 = img.naturalWidth || 0;
          const h0 = img.naturalHeight || 0;
          if (!w0 || !h0) return resolve(dataUrl);
          const scale = Math.max(w0, h0) > MAX_EDGE ? MAX_EDGE / Math.max(w0, h0) : 1;
          const w = Math.max(1, Math.round(w0 * scale));
          const h = Math.max(1, Math.round(h0 * scale));
          if (scale === 1 && dataUrl.length < 1_500_000) {
            // 小图不必重复压缩（避免画质损失）
            return resolve(dataUrl);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(dataUrl);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      } catch {
        resolve(dataUrl);
      }
    });
  }, []);
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

  const bgmSrc = React.useMemo(() => getLandingMusicResolvedSrc(), []);
  const [bgmPlaying, setBgmPlaying] = React.useState(true);
  const bgmRef = React.useRef<HTMLAudioElement | null>(null);
  const bgmWantPlayRef = React.useRef(true);
  bgmWantPlayRef.current = bgmPlaying;

  /** 先静音 play（策略允许），再尝试有声；无手势时静音播放仍可进行，首次交互后解锁声音 */
  const tryPlayBgm = React.useCallback(() => {
    const el = bgmRef.current;
    if (!el || !bgmWantPlayRef.current) return;
    el.muted = true;
    void el.play().then(() => {
      el.muted = false;
      void el.play().catch(() => {
        el.muted = true;
      });
    }).catch(() => {
      el.muted = false;
      void el.play().catch(() => {
        el.muted = true;
        void el.play().catch(() => {});
      });
    });
  }, []);

  const bgmRefSetter = React.useCallback(
    (el: HTMLAudioElement | null) => {
      bgmRef.current = el;
      if (el && bgmWantPlayRef.current) {
        el.muted = true;
        void el.play().catch(() => {});
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const a = bgmRef.current;
            if (!a || !bgmWantPlayRef.current) return;
            a.muted = false;
            void a.play().catch(() => {
              a.muted = true;
              void a.play().catch(() => {});
            });
          });
        });
      }
    },
    [],
  );

  React.useEffect(() => {
    const onUnlockSound = () => {
      const a = bgmRef.current;
      if (!a || !bgmWantPlayRef.current) return;
      if (a.muted || a.paused) {
        a.muted = false;
        void a.play().catch(() => {});
      }
    };
    const opts: AddEventListenerOptions = { capture: true };
    document.addEventListener('pointerdown', onUnlockSound, opts);
    document.addEventListener('pointerup', onUnlockSound, opts);
    document.addEventListener('click', onUnlockSound, opts);
    document.addEventListener('keydown', onUnlockSound, opts);
    document.addEventListener('touchstart', onUnlockSound, { ...opts, passive: true });
    document.addEventListener('touchend', onUnlockSound, { ...opts, passive: true });
    document.addEventListener('wheel', onUnlockSound, { ...opts, passive: true });
    return () => {
      document.removeEventListener('pointerdown', onUnlockSound, opts);
      document.removeEventListener('pointerup', onUnlockSound, opts);
      document.removeEventListener('click', onUnlockSound, opts);
      document.removeEventListener('keydown', onUnlockSound, opts);
      document.removeEventListener('touchstart', onUnlockSound, opts);
      document.removeEventListener('touchend', onUnlockSound, opts);
      document.removeEventListener('wheel', onUnlockSound, opts);
    };
  }, []);

  React.useEffect(() => {
    const el = bgmRef.current;
    if (!el) return;
    if (bgmPlaying) tryPlayBgm();
    else el.pause();
  }, [bgmPlaying, tryPlayBgm]);

  React.useEffect(() => {
    const el = bgmRef.current;
    if (!el) return;
    const onReady = () => {
      if (bgmWantPlayRef.current) tryPlayBgm();
    };
    el.addEventListener('canplaythrough', onReady);
    el.addEventListener('canplay', onReady);
    const timers = [0, 100, 400, 1000].map((ms) => window.setTimeout(onReady, ms));
    return () => {
      timers.forEach(clearTimeout);
      el.removeEventListener('canplaythrough', onReady);
      el.removeEventListener('canplay', onReady);
    };
  }, [tryPlayBgm]);

  React.useEffect(() => {
    if (!hydrated) return;
    const timers = [0, 150, 500].map((ms) =>
      window.setTimeout(() => {
        if (bgmWantPlayRef.current) tryPlayBgm();
      }, ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [hydrated, tryPlayBgm]);

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
    setPersistNotice(null);
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
        const refDataUrl = await shrinkImageDataUrlForReference(attributes.referenceImage);
        const base64Data = refDataUrl.split(',')[1];
        const mimeType = refDataUrl.split(';')[0].split(':')[1];
        const weightText = `\n\nIMPORTANT: Use the provided image as a strong reference for the SUBJECT ONLY (the person). The influence weight of this reference image should be considered as ${Math.round(attributes.referenceWeight * 100)}%.\nCRITICAL: Extract ONLY the person's identity and physical details (face, skin texture, freckles/moles/birthmarks, hair, proportions). IGNORE and DO NOT replicate any text, UI, subtitles, watermarks, logos, frames, interface elements, phone screens, posters, or background typography from the reference image.`;
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
          setIsPersisting(true);
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
          const publishToPublic = publishToGlobalRef.current === true;
          lastPersistRef.current = { dataUrl: uploadDataUrl, prompt, uid: cloudUser.uid, publishToPublic };
          await persistMtmGeneration(uploadDataUrl, prompt, cloudUser.uid, { publishToPublic });
          setPersistNotice(null);
          setHistoryRefreshKey((k) => k + 1);
        } catch (persistErr) {
          console.error('Persist image failed:', persistErr);
          const msg = persistErr instanceof Error ? persistErr.message : String(persistErr);
          setPersistNotice(
            msg.includes('HMRS_PROFILE_CREATE_FAILED')
              ? '图片已生成，但同步失败：HMRS 档案创建/读取失败（可重试同步或检查 HMRS 权限）。'
              : '图片已生成，但同步到后端失败（可重试同步）。',
          );
        } finally {
          setIsPersisting(false);
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

  const handleRetryPersist = React.useCallback(async () => {
    const payload = lastPersistRef.current;
    if (!payload) {
      setPersistNotice('没有可重试的同步任务（请先生成一张模卡）。');
      return;
    }
    setPersistNotice(null);
    setIsPersisting(true);
    try {
      await persistMtmGeneration(payload.dataUrl, payload.prompt, payload.uid, { publishToPublic: payload.publishToPublic });
      setPersistNotice(null);
      setHistoryRefreshKey((k) => k + 1);
    } catch (e) {
      console.error('Retry persist failed:', e);
      const msg = e instanceof Error ? e.message : String(e);
      setPersistNotice(
        msg.includes('HMRS_PROFILE_CREATE_FAILED')
          ? '重试同步仍失败：HMRS 档案异常（请检查 HMRS 集合与规则）。'
          : '重试同步仍失败，请稍后再试或检查后端权限。',
      );
    } finally {
      setIsPersisting(false);
    }
  }, []);

  return (
    <>
      <audio
        ref={bgmRefSetter}
        src={bgmSrc}
        loop
        playsInline
        preload="auto"
        autoPlay
        className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
        aria-hidden
      />
      {!hydrated ? (
        <div className="flex h-screen w-screen items-center justify-center bg-white font-sans text-[10px] font-bold uppercase tracking-widest text-black/40">
          加载中…
        </div>
      ) : (
    <div className="relative flex h-screen w-screen overflow-hidden bg-white font-sans">
      <AnimatePresence>
        {currentView === 'landing' && (
          <LandingPage
            cylinderImages={demoModelSlotUrls}
            onEnter={handleEnterApp}
            onNavigateToModels={() => setCurrentView('models')}
            bgmPlaying={bgmPlaying}
            onBgmToggle={() => setBgmPlaying((v) => !v)}
            onOpenThreeView={() => setThreeViewOpen(true)}
            onOpenVideo={() => window.open(VIDEO_NAV_HREF, '_blank', 'noopener,noreferrer')}
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
        bgmPlaying={bgmPlaying}
        onBgmPlay={() => setBgmPlaying(true)}
        onBgmStop={() => setBgmPlaying(false)}
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
            persistNotice={persistNotice}
            isPersisting={isPersisting}
            onRetryPersist={() => void handleRetryPersist()}
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
          <Suspense fallback={null}>
            <ThreeViewDevelopingPage key="three-view-developing" onClose={() => setThreeViewOpen(false)} />
          </Suspense>
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
      )}
    </>
  );
}
