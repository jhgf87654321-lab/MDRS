import { CLOUDBASE_ENV_ID, getCloudbaseApp } from './cloudbase';

/** 随构建发布的默认开屏 BGM（`public/landing-bgm.m4a`） */
export const LANDING_BGM_PUBLIC_PATH = '/landing-bgm.m4a';

/**
 * 直连音频（覆盖默认）：不依赖 getTempFileURL。支持 mp3 / m4a 等。
 * 例：VITE_LANDING_MUSIC_URL=https://example.com/bgm.m4a
 */
export function getLandingMusicDirectUrl(): string | null {
  const u = (import.meta.env.VITE_LANDING_MUSIC_URL as string | undefined)?.trim();
  return u || null;
}

/**
 * 开屏 `<audio src>`：环境变量优先，否则用本地 public 文件（不阻塞、不依赖云存储临时链）。
 */
export function getLandingMusicResolvedSrc(): string {
  return getLandingMusicDirectUrl() || LANDING_BGM_PUBLIC_PATH;
}

/** 默认开屏 BGM：lokada 环境 `music/MM.m4a`，失败时再试同目录其它文件名与当前 CLOUDBASE_ENV_ID */
const DEFAULT_LANDING_MUSIC_FILE_IDS = [
  'cloud://lokada-1254090729/music/MM.m4a',
  `cloud://${CLOUDBASE_ENV_ID}/music/MM.m4a`,
  `cloud://${CLOUDBASE_ENV_ID}/music/bgm.mp3`,
  `cloud://${CLOUDBASE_ENV_ID}/music/opening.mp3`,
  `cloud://${CLOUDBASE_ENV_ID}/music/landing.mp3`,
  'cloud://lokada-1254090729/music/bgm.mp3',
  'cloud://lokada-1254090729/music/opening.mp3',
  'cloud://lokada-1254090729/music/landing.mp3',
];

function parseLandingMusicFileIds(): string[] {
  const raw = import.meta.env.VITE_LANDING_MUSIC_FILE_IDS as string | undefined;
  if (raw && raw.trim()) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return DEFAULT_LANDING_MUSIC_FILE_IDS;
}

/**
 * （可选）仅当业务仍需要从云存储拉 BGM 时调用；开屏默认已用 `getLandingMusicResolvedSrc()`，不再走此接口以免拖慢首屏。
 * 需在控制台将 `music/` 读权限设为公开或允许匿名/当前安全来源访问。
 */
export async function resolveLandingMusicTempUrl(): Promise<string | null> {
  const fileIDs = parseLandingMusicFileIds();
  if (fileIDs.length === 0) return null;
  const app = getCloudbaseApp();
  try {
    const res = await app.getTempFileURL({
      fileList: fileIDs.map((fileID) => ({
        fileID,
        maxAge: 86_400_000,
      })),
    });
    const list = res?.fileList ?? [];
    for (const item of list) {
      const row = item as { code?: string; tempFileURL?: string; download_url?: string };
      const url = row.tempFileURL || row.download_url;
      if (url && typeof url === 'string') {
        const c = row.code ? String(row.code).toUpperCase() : '';
        if (!c || c === 'SUCCESS') return url;
      }
    }
  } catch (e) {
    console.warn('[landingMusic] getTempFileURL failed', e);
  }
  return null;
}
