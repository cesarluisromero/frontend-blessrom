import type { HomeCoverRole, MediaVariant, ProductMedia } from './commerce';

type CoverSize = { width: number; height: number };
type VariantSize = CoverSize & { variant: MediaVariant; quality: number };

export const HOME_COVER_SIZES: Record<HomeCoverRole, readonly VariantSize[]> = {
  DESKTOP: [
    { variant: 'original', width: 2160, height: 720, quality: .90 },
    { variant: 'large', width: 1200, height: 400, quality: .86 },
    { variant: 'medium', width: 720, height: 240, quality: .82 },
    { variant: 'thumbnail', width: 320, height: 107, quality: .78 },
  ],
  MOBILE: [
    { variant: 'original', width: 1024, height: 1280, quality: .90 },
    { variant: 'large', width: 960, height: 1200, quality: .86 },
    { variant: 'medium', width: 720, height: 900, quality: .82 },
    { variant: 'thumbnail', width: 320, height: 400, quality: .78 },
  ],
};

export function isFixedHomeCover(media: ProductMedia | null | undefined, role: HomeCoverRole): boolean {
  const original = media?.objects?.find(object => object.variant === 'original');
  const { width, height } = HOME_COVER_SIZES[role][0];
  return original?.width === width && original.height === height;
}

export function homeCoverCrop(source: CoverSize, target: CoverSize, frameX: number, frameY: number) {
  const scale = Math.max(target.width / source.width, target.height / source.height);
  const width = target.width / scale;
  const height = target.height / scale;
  return {
    x: (source.width - width) * frameX / 100,
    y: (source.height - height) * frameY / 100,
    width,
    height,
  };
}
