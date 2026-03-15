import { getCloudbaseDb } from './cloudbase';

export type OutfitPieceInfo = {
  colors: string[];
  style: string;
  material: string;
};

export type ImageInfoDoc = {
  serialNumber: string;
  imageUrl: string;
  source: 'mint' | 'sp' | 'trade';
  createdAt: number;
  updatedAt: number;
  top: OutfitPieceInfo;
  bottom: OutfitPieceInfo;
  shoes: OutfitPieceInfo;
  /** 外搭，如外套、大衣 */
  outer?: OutfitPieceInfo;
  /** 内搭，如外套内的衬衫、T恤 */
  inner?: OutfitPieceInfo;
  notes?: string;
};

const COLLECTION = 'imageinf';

function asPiece(x: any): OutfitPieceInfo {
  const colors = Array.isArray(x?.colors) ? x.colors.filter((c: any) => typeof c === 'string' && c.trim()).map((c: string) => c.trim()) : [];
  const style = typeof x?.style === 'string' ? x.style.trim() : '';
  const material = typeof x?.material === 'string' ? x.material.trim() : '';
  return { colors, style, material };
}

export async function upsertImageInfo(params: {
  serialNumber: string;
  imageUrl: string;
  source: ImageInfoDoc['source'];
  info: any;
}) {
  const serialNumber = (params.serialNumber || '').trim();
  const imageUrl = (params.imageUrl || '').trim();
  if (!serialNumber) throw new Error('MISSING_SERIAL');
  if (!/^https?:\/\//i.test(imageUrl)) throw new Error('INVALID_IMAGE_URL');

  const now = Date.now();
  const top = asPiece(params.info?.top);
  const bottom = asPiece(params.info?.bottom);
  const shoes = asPiece(params.info?.shoes);
  const doc: ImageInfoDoc = {
    serialNumber,
    imageUrl,
    source: params.source,
    createdAt: now,
    updatedAt: now,
    top,
    bottom,
    shoes,
    ...(params.info?.outer && (params.info.outer.colors?.length || params.info.outer.style || params.info.outer.material) ? { outer: asPiece(params.info.outer) } : {}),
    ...(params.info?.inner && (params.info.inner.colors?.length || params.info.inner.style || params.info.inner.material) ? { inner: asPiece(params.info.inner) } : {}),
    ...(typeof params.info?.notes === 'string' && params.info.notes.trim() ? { notes: params.info.notes.trim().slice(0, 400) } : {}),
  };

  const db = getCloudbaseDb();
  // docId 使用 serialNumber，确保一一对应
  await db.collection(COLLECTION).doc(serialNumber).set(doc as any);
  return doc;
}

