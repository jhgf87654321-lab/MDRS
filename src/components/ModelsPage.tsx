import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Search, Filter } from 'lucide-react';
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
  /** 开屏演示网格 */
  variant?: ModelsPageVariant;
  uid?: string;
  email?: string;
  /** 生成新图后递增，用于个人/公区列表刷新 */
  listRefreshKey?: number;
};

function buildPersonalGalleryRows(urls: string[], files: ModelFileDoc[]): { id: string; img: string; name: string; author: string }[] {
  const kw = new Map<string, string>();
  for (const f of files) {
    if (f.cosUrl) kw.set(f.cosUrl, f.keywords || '');
  }
  return urls.map((imageUrl, i) => {
    const t = (kw.get(imageUrl) || '').trim();
    const title = t ? `${t.slice(0, 48)}${t.length > 48 ? '…' : ''}` : `Model ${i + 1}`;
    return {
      id: `p-${i}-${imageUrl.slice(-24)}`,
      img: imageUrl,
      name: title,
      author: '',
    };
  });
}

function buildGlobalGalleryRows(rows: ModelFileDoc[]): { id: string; img: string; name: string; author: string }[] {
  return rows.map((f, i) => {
    const k = (f.keywords || '').trim();
    const title = k ? `${k.slice(0, 48)}${k.length > 48 ? '…' : ''}` : `Public ${i + 1}`;
    const shortUid = f.uid ? `${f.uid.slice(0, 6)}…` : '—';
    return {
      id: f._id || `g-${f.seq}-${i}`,
      img: f.cosUrl,
      name: title,
      author: `@${shortUid}`,
    };
  });
}

export function ModelsPage({
  onBack,
  variant = 'demo',
  uid,
  email,
  listRefreshKey = 0,
}: ModelsPageProps) {
  const [rows, setRows] = React.useState<{ id: string; img: string; name: string; author: string }[]>([]);
  const [loading, setLoading] = React.useState(variant !== 'demo');
  const [loadError, setLoadError] = React.useState<string | null>(null);

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

  const displayName = email?.trim()?.split('@')[0] || 'Creator';
  const gridItems =
    variant === 'demo'
      ? mockModels.map((m) => ({ id: String(m.id), img: m.img, name: m.name, author: m.author }))
      : rows.map((r) => ({
          ...r,
          author: variant === 'personal' ? `@${displayName}` : r.author,
        }));

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
            {gridItems.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group flex cursor-default flex-col gap-4"
              >
                <div className="relative aspect-[3/4] overflow-hidden border border-black/5 bg-black/5 shadow-sm">
                  <img
                    src={m.img}
                    alt=""
                    className="h-full w-full scale-100 object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/10" />
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="line-clamp-2 text-sm font-bold tracking-wide">{m.name}</span>
                  <span className="shrink-0 pl-2 text-[9px] font-bold uppercase tracking-widest text-black/40">
                    {m.author}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
