import { getCloudbaseApp } from './cloudbase';

/** 云存储 `music/` 下候选 fileID，按顺序尝试直至成功（见 VITE_LANDING_MUSIC_FILE_IDS） */
const DEFAULT_LANDING_MUSIC_FILE_IDS = [
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
 * 解析开屏页 BGM 的临时 HTTPS 地址（CloudBase getTempFileURL）。
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
      if (item.code === 'SUCCESS' && item.tempFileURL) return item.tempFileURL;
    }
  } catch (e) {
    console.warn('[landingMusic] getTempFileURL failed', e);
  }
  return null;
}
