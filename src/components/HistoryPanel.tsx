import React from 'react';
import {
  getHmrsProfile,
  watchHmrsModelImageUrls,
  type HmrsProfileDoc,
} from '@nftt/lib/hmrsDb';
import { listModelFilesByUid, listPublicModelFiles, type ModelFileDoc } from '@nftt/lib/modelFileDb';
import { Search, MoreHorizontal } from 'lucide-react';
import { motion } from 'motion/react';

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
};

export function HistoryPanel({ uid, email, refreshKey }: Props) {
  const [personalCards, setPersonalCards] = React.useState<PersonalCard[]>([]);
  const [publicFiles, setPublicFiles] = React.useState<ModelFileDoc[]>([]);
  const [currentTopIndices, setCurrentTopIndices] = React.useState([0, 1]);
  const [mineError, setMineError] = React.useState<string | null>(null);
  const [publicError, setPublicError] = React.useState<string | null>(null);
  const [watchFallback, setWatchFallback] = React.useState(false);

  React.useEffect(() => {
    setWatchFallback(false);
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
      const rows = await listPublicModelFiles(48);
      setPublicFiles(rows.filter((r) => r.uid !== uid));
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
              <div
                key={`${img.imageUrl}-${i}`}
                className="group relative aspect-[3/4] overflow-hidden border border-black/5 bg-black/5 grayscale transition-all duration-500 hover:grayscale-0"
              >
                <img
                  src={img.imageUrl}
                  alt="User generated"
                  className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-end bg-black/80 p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="line-clamp-4 text-[8px] font-bold uppercase leading-tight tracking-widest text-white">
                    {img.keywords || '—'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 flex aspect-[16/9] items-center justify-center border border-dashed border-black/10 p-4 text-center text-[9px] font-bold uppercase tracking-widest text-black/20">
              Empty Archive
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-black">Global</h3>
          <MoreHorizontal size={14} className="text-black/20" />
        </div>
        <div className="no-scrollbar grid flex-1 grid-cols-2 gap-2 overflow-y-auto">
          {publicFiles.length > 0 ? (
            publicFiles.map((f) => (
              <div
                key={f._id || f.cosUrl}
                className="group relative aspect-square overflow-hidden border border-black/5 bg-black/5 grayscale transition-all duration-500 hover:grayscale-0"
              >
                <img
                  src={f.cosUrl}
                  alt="Public"
                  className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex h-4 w-4 items-center justify-center bg-white">
                    <div className="h-1 w-1 animate-ping bg-black" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 flex flex-col items-center justify-center space-y-4 py-12 text-black/20">
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

      <div className="flex items-center gap-4 border-t border-black/5 pt-8">
        <div
          className={
            isGuest
              ? 'flex h-10 w-10 items-center justify-center border border-dashed border-black/20 text-[9px] font-bold uppercase text-black/35'
              : 'flex h-10 w-10 items-center justify-center bg-black text-[10px] font-bold uppercase text-white'
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
  );
}
