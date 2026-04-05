import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Search, Filter, X, Download, Upload } from 'lucide-react';
import { DEMO_MODEL_DEFAULT_URLS } from '../lib/demoModelSlots';
import { getHmrsProfile } from '@nftt/lib/hmrsDb';
import {
  listModelFilesByUid,
  listPublicModelFiles,
  searchModelFileDocsForUser,
  searchPublicModelFileDocs,
  type ModelFileDoc,
} from '@nftt/lib/modelFileDb';

const MOCK_MODEL_META = [
  { id: 1, name: 'Aria', author: '@studio_x' },
  { id: 2, name: 'Nova', author: '@digital_dreams' },
  { id: 3, name: 'Kai', author: '@creator_01' },
  { id: 4, name: 'Luna', author: '@synth_art' },
  { id: 5, name: 'Orion', author: '@future_faces' },
  { id: 6, name: 'Stella', author: '@pixel_perfect' },
  { id: 7, name: 'Atlas', author: '@meta_models' },
  { id: 8, name: 'Lyra', author: '@ai_atelier' },
] as const;

const mockModels = MOCK_MODEL_META.map((m, i) => ({
  ...m,
  img: DEMO_MODEL_DEFAULT_URLS[i]!,
}));

export type ModelsPageVariant = 'demo' | 'personal' | 'global' | 'search';

export type ModelsPageProps = {
  onBack: () => void;
  variant?: ModelsPageVariant;
  uid?: string;
  email?: string;
  listRefreshKey?: number;
  /** variant=search 时在 MODELFILE 中按 keywords 子串匹配 */
  searchKeyword?: string;
  /** 与 searchKeyword 并行匹配（如中文原文），规则见 modelFileDb */
  searchKeywordAlt?: string;
  /** variant=demo：与开屏滚筒同一套槽位图 */
  demoSlotUrls?: string[];
  /** variant=demo：替换第 index 张（会持久化并由 App 同步到开屏滚筒） */
  onDemoSlotReplace?: (index: number, dataUrl: string) => void;
};

type GalleryRow = {
  id: string;
  img: string;
  /** 仅入库与下载文件名，不在网格展示 */
  keywords: string;
  author: string;
  createdAt?: number;
  /** 搜索合并结果：个人库 / 公区 */
  scope?: 'mine' | 'global';
};

function buildPersonalGalleryRows(urls: string[], files: ModelFileDoc[]): GalleryRow[] {
  const kw = new Map<string, string>();
  for (const f of files) {
    if (f.cosUrl) kw.set(f.cosUrl, f.keywords || '');
  }
  return urls.map((imageUrl, i) => ({
    id: `p-${i}-${imageUrl.slice(-32)}`,
    img: imageUrl,
    keywords: (kw.get(imageUrl) || '').trim(),
    author: '',
  }));
}

function buildGlobalGalleryRows(rows: ModelFileDoc[]): GalleryRow[] {
  return rows.map((f, i) => {
    const shortUid = f.uid ? `${f.uid.slice(0, 6)}…` : '—';
    return {
      id: f._id || `g-${f.seq}-${i}`,
      img: f.cosUrl,
      keywords: (f.keywords || '').trim(),
      author: `@${shortUid}`,
    };
  });
}

async function downloadImageUrl(url: string, filenameBase: string) {
  const safe = filenameBase.replace(/[^\w\-]+/g, '_').slice(0, 80) || 'model';
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const ext = blob.type.includes('jpeg') ? 'jpg' : blob.type.includes('webp') ? 'webp' : 'png';
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `${safe}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } catch {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safe}.png`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function modelDocsToSearchRows(docs: ModelFileDoc[], scope: 'mine' | 'global', uidSelf: string): GalleryRow[] {
  return docs.map((f, i) => {
    const shortUid = f.uid ? `${f.uid.slice(0, 6)}…` : '—';
    return {
      id: `${scope}-${f._id || `${f.seq}-${i}`}-${f.cosUrl.slice(-16)}`,
      img: f.cosUrl,
      keywords: (f.keywords || '').trim(),
      author: scope === 'mine' ? '个人' : f.uid === uidSelf ? '公区 · 本人' : `@${shortUid}`,
      createdAt: f.createdAt,
      scope,
    };
  });
}

export function ModelsPage({
  onBack,
  variant = 'demo',
  uid,
  email,
  listRefreshKey = 0,
  searchKeyword = '',
  searchKeywordAlt,
  demoSlotUrls,
  onDemoSlotReplace,
}: ModelsPageProps) {
  const [rows, setRows] = React.useState<GalleryRow[]>([]);
  const [loading, setLoading] = React.useState(variant !== 'demo');
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [lightbox, setLightbox] = React.useState<GalleryRow | null>(null);

  const headerTitle =
    variant === 'personal'
      ? 'Personal Archive'
      : variant === 'global'
        ? 'Global Gallery'
        : variant === 'search'
          ? 'Keyword Search'
          : 'Public Models';

  React.useEffect(() => {
    if (variant === 'demo') {
      setRows([]);
      setLoading(false);
      setLoadError(null);
      return;
    }

    if (!uid) {
      setRows([]);
      setLoading(false);
      setLoadError('请先登录');
      return;
    }

    if (variant === 'search' && !searchKeyword.trim()) {
      setRows([]);
      setLoading(false);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        if (variant === 'personal') {
          const hmrs = await getHmrsProfile(uid);
          const urls = Array.isArray(hmrs?.modelImageUrls) ? hmrs.modelImageUrls : [];
          const files = await listModelFilesByUid(uid, 120);
          const next = buildPersonalGalleryRows(urls, files);
          if (!cancelled) setRows(next);
        } else if (variant === 'global') {
          const raw = await listPublicModelFiles(100);
          const next = buildGlobalGalleryRows(
            raw.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
          );
          if (!cancelled) setRows(next);
        } else if (variant === 'search') {
          const q = searchKeyword.trim();
          const alt = searchKeywordAlt?.trim();
          const [mineDocs, pubDocs] = await Promise.all([
            searchModelFileDocsForUser(uid, q, 100, alt),
            searchPublicModelFileDocs(q, 100, alt),
          ]);
          const mineRows = modelDocsToSearchRows(mineDocs, 'mine', uid);
          const pubRows = modelDocsToSearchRows(pubDocs, 'global', uid);
          const seen = new Set<string>();
          const merged: GalleryRow[] = [];
          for (const r of mineRows) {
            if (seen.has(r.img)) continue;
            seen.add(r.img);
            merged.push(r);
          }
          for (const r of pubRows) {
            if (seen.has(r.img)) continue;
            seen.add(r.img);
            merged.push(r);
          }
          merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          if (!cancelled) setRows(merged);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setRows([]);
          setLoadError(
            variant === 'personal'
              ? '个人作品加载失败'
              : variant === 'search'
                ? '关键词搜索失败'
                : '公区作品加载失败',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [variant, uid, listRefreshKey, searchKeyword, searchKeywordAlt]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const displayName = email?.trim()?.split('@')[0] || 'Creator';

  const gridItems: GalleryRow[] =
    variant === 'demo'
      ? mockModels.map((m, i) => ({
          id: String(m.id),
          img: demoSlotUrls?.[i] ?? m.img,
          keywords: '',
          author: m.author,
        }))
      : rows.map((r) => ({
          ...r,
          author: variant === 'personal' ? `@${displayName}` : r.author,
        }));

  const handleOpenLightbox = (e: React.MouseEvent, m: GalleryRow) => {
    e.stopPropagation();
    setLightbox(m);
  };

  const handleLightboxDownload = () => {
    if (!lightbox) return;
    const base = lightbox.keywords ? lightbox.keywords.slice(0, 40) : lightbox.id;
    void downloadImageUrl(lightbox.img, base);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[130] flex flex-col overflow-hidden bg-white font-sans text-black"
    >
      <div className="z-10 flex items-center justify-between border-b border-black/5 bg-white p-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-50"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex flex-col items-center text-center">
          <div className="font-display text-2xl font-bold uppercase tracking-tighter">{headerTitle}</div>
          {variant === 'search' && searchKeyword.trim() ? (
            <p className="mt-1 max-w-[min(90vw,28rem)] truncate text-[10px] font-bold tracking-widest text-black/45 normal-case">
              {searchKeywordAlt?.trim() && searchKeywordAlt.trim() !== searchKeyword.trim() ? (
                <>
                  「{searchKeywordAlt.trim()}」 → 「{searchKeyword.trim()}」
                </>
              ) : (
                <>「{searchKeyword.trim()}」</>
              )}
            </p>
          ) : null}
        </div>
        <div className="flex gap-6 text-black/40">
          <button type="button" className="transition-colors hover:text-black">
            <Search size={20} />
          </button>
          <button type="button" className="transition-colors hover:text-black">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto bg-[#f8f8f8] p-8">
        {loadError && (
          <p className="mb-6 text-center text-xs font-bold uppercase tracking-widest text-red-600">{loadError}</p>
        )}
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center text-[10px] font-bold uppercase tracking-[0.3em] text-black/30">
            Loading…
          </div>
        ) : variant !== 'demo' && gridItems.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center text-[10px] font-bold uppercase tracking-widest text-black/25">
            <span>
              {variant === 'personal'
                ? '暂无个人生成记录'
                : variant === 'search'
                  ? searchKeyword.trim()
                    ? '未找到含该关键词的图片（MODELFILE.keywords）'
                    : '请先在侧栏 Archive 搜索框输入关键词并回车'
                  : '暂无公区作品'}
            </span>
          </div>
        ) : (
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {gridItems.map((m, idx) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group flex flex-col gap-2"
              >
                <div className="relative aspect-[3/4] w-full">
                  <button
                    type="button"
                    onClick={(e) => handleOpenLightbox(e, m)}
                    className="relative h-full w-full cursor-zoom-in overflow-hidden border border-black/5 bg-black/5 p-0 text-left shadow-sm"
                  >
                    <img
                      src={m.img}
                      alt=""
                      className="h-full w-full scale-100 object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/10" />
                  </button>
                  {variant === 'demo' && onDemoSlotReplace ? (
                    <label
                      className="absolute bottom-2 right-2 z-10 flex cursor-pointer items-center justify-center rounded-sm border border-black/15 bg-white/95 p-1.5 text-black/50 shadow-sm transition-colors hover:border-black/30 hover:text-black"
                      title="上传替换此图（与开屏滚筒同一槽位）"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Upload size={14} strokeWidth={2} />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            onDemoSlotReplace(idx, reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  ) : null}
                </div>
                {variant === 'demo' ? (
                  <div className="flex items-center justify-between px-1">
                    <span className="line-clamp-2 text-sm font-bold tracking-wide">
                      {mockModels.find((x) => String(x.id) === m.id)?.name ?? '—'}
                    </span>
                    <span className="shrink-0 pl-2 text-[9px] font-bold uppercase tracking-widest text-black/40">
                      {m.author}
                    </span>
                  </div>
                ) : variant === 'global' ? (
                  <p className="px-1 text-center text-[9px] font-bold uppercase tracking-widest text-black/40">
                    {m.author}
                  </p>
                ) : variant === 'search' ? (
                  <p className="px-1 text-center text-[9px] font-bold uppercase tracking-widest text-black/40">
                    {m.scope === 'mine' ? '个人' : m.author}
                  </p>
                ) : null}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            role="presentation"
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative flex max-h-[92vh] max-w-[min(96vw,1200px)] flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex max-h-[min(78vh,900px)] items-center justify-center overflow-hidden rounded-sm border border-white/10 bg-black/40">
                <img
                  src={lightbox.img}
                  alt=""
                  className="max-h-[min(78vh,900px)] max-w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleLightboxDownload()}
                  className="flex items-center gap-2 border border-white/30 bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-white/90"
                >
                  <Download size={16} />
                  下载图片
                </button>
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  className="flex items-center gap-2 border border-white/20 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
                >
                  <X size={16} />
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
