import React from 'react';
import {
  getHmrsProfile,
  watchHmrsModelImageUrls,
  type HmrsProfileDoc,
} from '@nftt/lib/hmrsDb';
import {
  listModelFilesByUid,
  listPublicModelFiles,
  watchPublicModelFiles,
  type ModelFileDoc,
} from '@nftt/lib/modelFileDb';
import { Search, MoreHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export type PersonalCard = { imageUrl: string; keywords: string };

function buildPersonalCards(urls: string[], files: ModelFileDoc[]): PersonalCard[] {
  const kw = new Map<string, string>();
  for (const f of files) {
    if (f.cosUrl) kw.set(f.cosUrl, f.keywords || '');
  }
  return urls.map((imageUrl) => ({ imageUrl, keywords: kw.get(imageUrl) || '' }));
}

type Props = {
  uid: string;
  email?: string;
  refreshKey: number;
  publishToGlobal: boolean;
  onPublishToGlobalChange: (v: boolean) => void;
  /** 点击 Personal 缩略图：进入与开屏 Models 相同布局的个人全图库 */
  onOpenPersonalGallery?: () => void;
  /** 点击 Global 缩略图：进入公区全图库 */
  onOpenGlobalGallery?: () => void;
};

const GLOBAL_PREVIEW_LIMIT = 4;

export function HistoryPanel({
  uid,
  email,
  refreshKey,
  publishToGlobal,
  onPublishToGlobalChange,
  onOpenPersonalGallery,
  onOpenGlobalGallery,
}: Props) {
  const [personalCards, setPersonalCards] = React.useState<PersonalCard[]>([]);
  const [publicFiles, setPublicFiles] = React.useState<ModelFileDoc[]>([]);
  const [currentTopIndices, setCurrentTopIndices] = React.useState([0, 1]);
  const [mineError, setMineError] = React.useState<string | null>(null);
  const [publicError, setPublicError] = React.useState<string | null>(null);
  const [watchFallback, setWatchFallback] = React.useState(false);
  const [publicWatchFallback, setPublicWatchFallback] = React.useState(false);

  React.useEffect(() => {
    setWatchFallback(false);
    setPublicWatchFallback(false);
  }, [uid]);

  const loadPersonal = React.useCallback(async () => {
    if (!uid) {
      setPersonalCards([]);
      return;
    }
    setMineError(null);
    try {
      const hmrs: HmrsProfileDoc | null = await getHmrsProfile(uid);
      const urls = Array.isArray(hmrs?.modelImageUrls) ? hmrs.modelImageUrls : [];
      const files = await listModelFilesByUid(uid, 120);
      setPersonalCards(buildPersonalCards(urls, files));
    } catch (e) {
      console.error(e);
      setMineError('个人档案（HMRS）加载失败，请检查集合与安全规则');
    }
  }, [uid]);

  const loadPublic = React.useCallback(async () => {
    if (!uid) {
      setPublicFiles([]);
      return;
    }
    setPublicError(null);
    try {
      const rows = await listPublicModelFiles(24);
      setPublicFiles(
        rows
          .filter((r) => r.uid !== uid)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, GLOBAL_PREVIEW_LIMIT),
      );
    } catch (e) {
      console.error(e);
      setPublicFiles([]);
      setPublicError('公开作品（MODELFILE）加载失败');
    }
  }, [uid]);

  const loadOnce = React.useCallback(async () => {
    if (!uid) {
      setPersonalCards([]);
      setPublicFiles([]);
      setMineError(null);
      setPublicError(null);
      return;
    }
    await loadPersonal();
    await loadPublic();
  }, [uid, loadPersonal, loadPublic]);

  React.useEffect(() => {
    void loadOnce();
  }, [loadOnce, refreshKey]);

  React.useEffect(() => {
    if (!uid || watchFallback) return;

    const w = watchHmrsModelImageUrls(
      async (urls) => {
        try {
          const files = await listModelFilesByUid(uid, 120);
          setPersonalCards(buildPersonalCards(urls, files));
          setMineError(null);
        } catch (e) {
          console.error(e);
        }
      },
      (err) => {
        console.error('watch HMRS', err);
        setWatchFallback(true);
      },
    );

    return () => w.close();
  }, [uid, watchFallback]);

  React.useEffect(() => {
    if (!watchFallback) return;
    const id = setInterval(() => void loadOnce(), 15_000);
    return () => clearInterval(id);
  }, [watchFallback, loadOnce]);

  React.useEffect(() => {
    if (!uid || publicWatchFallback) return;

    const w = watchPublicModelFiles(
      uid,
      (rows) => {
        setPublicFiles(rows);
        setPublicError(null);
      },
      (err) => {
        console.error('watch MODELFILE public', err);
        setPublicWatchFallback(true);
      },
    );

    return () => w.close();
  }, [uid, publicWatchFallback]);

  React.useEffect(() => {
    if (!publicWatchFallback) return;
    const id = setInterval(() => void loadPublic(), 6_000);
    return () => clearInterval(id);
  }, [publicWatchFallback, loadPublic]);

  React.useEffect(() => {
    if (personalCards.length <= 2) return;

    const interval = setInterval(() => {
      setCurrentTopIndices((prev) => {
        const next1 = Math.floor(Math.random() * personalCards.length);
        let next2 = Math.floor(Math.random() * personalCards.length);
        while (next2 === next1 && personalCards.length > 1) {
          next2 = Math.floor(Math.random() * personalCards.length);
        }
        return [next1, next2];
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [personalCards]);

  const topImages = React.useMemo((): PersonalCard[] => {
    const n = personalCards.length;
    if (n === 0) return [];
    if (n === 1) return [personalCards[0]];
    const i = Math.max(0, Math.min(currentTopIndices[0] % n, n - 1));
    let j = Math.max(0, Math.min(currentTopIndices[1] % n, n - 1));
    if (j === i) j = (i + 1) % n;
    return [personalCards[i], personalCards[j]];
  }, [personalCards, currentTopIndices]);

  const isGuest = !uid;
  const displayEmail = isGuest ? '访客' : email?.trim() || '已登录';
  const loadError = mineError || publicError;

  return (
    <div className="z-40 flex h-full w-[300px] flex-col gap-8 border-l border-black/5 bg-white p-8">
      <div className="flex flex-col gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-black/40">Archive</p>
        <div className="group flex items-center gap-3 border-b border-black/10 py-2 transition-colors hover:border-black">
          <Search size={14} className="text-black/20 transition-colors group-hover:text-black" />
          <input
            type="text"
            placeholder="SEARCH"
            className="w-full border-none bg-transparent text-[10px] font-bold uppercase tracking-widest text-black outline-none placeholder:text-black/20"
          />
        </div>
      </div>

      {loadError && <p className="text-[9px] leading-relaxed text-red-600">{loadError}</p>}
      {watchFallback && (
        <p className="text-[8px] font-bold uppercase tracking-widest text-black/30">
          实时推送不可用，已改为定时同步
        </p>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black">Personal</h3>
          <div className="flex gap-1">
            <div className="h-1 w-1 animate-pulse bg-black" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {topImages.length > 0 ? (
            topImages.map((img, i) => (
              <button
                key={`${img.imageUrl}-${i}`}
                type="button"
                disabled={!onOpenPersonalGallery}
                onClick={() => onOpenPersonalGallery?.()}
                className={cn(
                  'group relative aspect-[3/4] w-full overflow-hidden border border-black/5 bg-black/5 p-0 text-left grayscale transition-all duration-500',
                  onOpenPersonalGallery
                    ? 'cursor-pointer hover:grayscale-0'
                    : 'cursor-default opacity-80',
                )}
              >
                <img
                  src={img.imageUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="pointer-events-none absolute inset-0 flex items-end bg-black/80 p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="line-clamp-4 text-[8px] font-bold uppercase leading-tight tracking-widest text-white">
                    {img.keywords || '—'}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="col-span-2 flex aspect-[16/9] items-center justify-center border border-dashed border-black/10 p-4 text-center text-[9px] font-bold uppercase tracking-widest text-black/20">
              Empty Archive
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black">Global</h3>
            <p className="mt-0.5 text-[7px] font-bold uppercase tracking-widest text-black/35">
              公区最新 {GLOBAL_PREVIEW_LIMIT} 张
            </p>
          </div>
          <MoreHorizontal size={14} className="text-black/20" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {publicFiles.length > 0 ? (
            publicFiles.map((f) => (
              <button
                key={f._id || f.cosUrl}
                type="button"
                disabled={!onOpenGlobalGallery}
                onClick={() => onOpenGlobalGallery?.()}
                className={cn(
                  'group relative aspect-square w-full overflow-hidden border border-black/5 bg-black/5 p-0 text-left grayscale transition-all duration-500',
                  onOpenGlobalGallery
                    ? 'cursor-pointer hover:grayscale-0'
                    : 'cursor-default opacity-80',
                )}
              >
                <img
                  src={f.cosUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex h-4 w-4 items-center justify-center bg-white">
                    <div className="h-1 w-1 animate-ping bg-black" />
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="col-span-2 flex flex-col items-center justify-center space-y-3 py-8 text-black/20">
              <div className="relative h-[1px] w-8 overflow-hidden bg-black/10">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  className="absolute inset-0 bg-black"
                />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-[0.3em]">Syncing</span>
            </div>
          )}
        </div>
      </div>

      {publicWatchFallback && (
        <p className="text-[7px] font-bold uppercase tracking-widest text-black/30">
          Global 实时监听不可用，已改为定时刷新
        </p>
      )}

      <div className="mt-auto flex flex-col gap-3 border-t border-black/5 pt-6">
        <label className="flex cursor-pointer items-start gap-2 border border-black/10 bg-black/[0.02] px-2 py-2 transition-colors hover:border-black/20">
          <input
            type="checkbox"
            className="mt-0.5 h-3 w-3 shrink-0 accent-black"
            checked={publishToGlobal}
            disabled={isGuest}
            onChange={(e) => onPublishToGlobalChange(e.target.checked)}
          />
          <span className="min-w-0">
            <span className="block text-[8px] font-bold uppercase tracking-widest text-black">
              导入公区
            </span>
            <span className="mt-0.5 block text-[7px] font-bold uppercase leading-snug tracking-wide text-black/40">
              开启后，生成图会写入公开 MODELFILE，并在上方 Global 展示（仅最新 {GLOBAL_PREVIEW_LIMIT} 张预览）
            </span>
          </span>
        </label>

        <div className="flex items-center gap-4">
          <div
            className={
              isGuest
                ? 'flex h-10 w-10 shrink-0 items-center justify-center border border-dashed border-black/20 text-[9px] font-bold uppercase text-black/35'
                : 'flex h-10 w-10 shrink-0 items-center justify-center bg-black text-[10px] font-bold uppercase text-white'
            }
          >
            {isGuest ? '—' : displayEmail.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-bold uppercase tracking-widest text-black">
              {isGuest ? '未登录' : displayEmail.split('@')[0]}
            </p>
            <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-black/30">
              {isGuest ? '左下角头像或右下角登录' : 'HMRS / MODELFILE'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
