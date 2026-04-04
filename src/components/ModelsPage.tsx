import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Search, Filter, X, Download } from 'lucide-react';
import { getHmrsProfile } from '@nftt/lib/hmrsDb';
import { listModelFilesByUid, listPublicModelFiles, type ModelFileDoc } from '@nftt/lib/modelFileDb';

const mockModels = [
  { id: 1, name: 'Aria', author: '@studio_x', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80' },
  { id: 2, name: 'Nova', author: '@digital_dreams', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80' },
  { id: 3, name: 'Kai', author: '@creator_01', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80' },
  { id: 4, name: 'Luna', author: '@synth_art', img: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80' },
  { id: 5, name: 'Orion', author: '@future_faces', img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80' },
  { id: 6, name: 'Stella', author: '@pixel_perfect', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80' },
  { id: 7, name: 'Atlas', author: '@meta_models', img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80' },
  { id: 8, name: 'Lyra', author: '@ai_atelier', img: 'https://images.unsplash.com/photo-1488161628813-04466f872507?auto=format&fit=crop&w=800&q=80' },
];

export type ModelsPageVariant = 'demo' | 'personal' | 'global';

export type ModelsPageProps = {
  onBack: () => void;
  variant?: ModelsPageVariant;
  uid?: string;
  email?: string;
  listRefreshKey?: number;
};

type GalleryRow = {
  id: string;
  img: string;
  /** 仅入库与下载文件名，不在网格展示 */
  keywords: string;
  author: string;
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

export function ModelsPage({
  onBack,
  variant = 'demo',
  uid,
  email,
  listRefreshKey = 0,
}: ModelsPageProps) {
  const [rows, setRows] = React.useState<GalleryRow[]>([]);
  const [loading, setLoading] = React.useState(variant !== 'demo');
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [lightbox, setLightbox] = React.useState<GalleryRow | null>(null);

  const headerTitle =
    variant === 'personal' ? 'Personal Archive' : variant === 'global' ? 'Global Gallery' : 'Public Models';

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
        } else {
          const raw = await listPublicModelFiles(100);
          const next = buildGlobalGalleryRows(
            raw.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
          );
          if (!cancelled) setRows(next);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setRows([]);
          setLoadError(variant === 'personal' ? '个人作品加载失败' : '公区作品加载失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [variant, uid, listRefreshKey]);

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
      ? mockModels.map((m) => ({
          id: String(m.id),
          img: m.img,
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
        <div className="font-display text-2xl font-bold uppercase tracking-tighter">{headerTitle}</div>
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
            <span>{variant === 'personal' ? '暂无个人生成记录' : '暂无公区作品'}</span>
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
                <button
                  type="button"
                  onClick={(e) => handleOpenLightbox(e, m)}
                  className="relative aspect-[3/4] w-full cursor-zoom-in overflow-hidden border border-black/5 bg-black/5 p-0 text-left shadow-sm"
                >
                  <img
                    src={m.img}
                    alt=""
                    className="h-full w-full scale-100 object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/10" />
                </button>
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
