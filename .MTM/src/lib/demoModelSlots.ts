/** 开屏滚筒与 Models（demo）网格共用 8 槽位，持久化到 localStorage */

export const DEMO_MODEL_DEFAULT_URLS: readonly string[] = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1488161628813-04466f872507?auto=format&fit=crop&w=800&q=80',
];

export const DEMO_MODEL_SLOT_COUNT = DEMO_MODEL_DEFAULT_URLS.length;

const STORAGE_KEY = 'mtm_demo_models_slots_v1';
/** 旧键：迁移一次后删除，避免与开屏重复配置 */
const LEGACY_STORAGE_KEY = 'mtm_landing_cylinder_v1';

export function loadDemoModelSlotUrls(): string[] {
  const base = [...DEMO_MODEL_DEFAULT_URLS];
  if (typeof window === 'undefined') return base;
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        window.localStorage.setItem(STORAGE_KEY, raw);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
    if (!raw) return base;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return base;
    for (let i = 0; i < DEMO_MODEL_SLOT_COUNT; i++) {
      const v = parsed[i];
      if (typeof v === 'string' && v.trim().length > 0) base[i] = v;
    }
    return base;
  } catch {
    return base;
  }
}

export function persistDemoModelSlotUrls(urls: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(urls.slice(0, DEMO_MODEL_SLOT_COUNT)));
  } catch {
    /* ignore */
  }
}
