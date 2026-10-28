import sharp from 'sharp';
import { HttpError } from '../http';

export async function optimizeReceipt(source: Buffer) {
  try {
    const image = sharp(source, { limitInputPixels: 60_000_000, animated: false, failOn: 'error' });
    if (!['jpeg', 'png', 'webp', 'heif', 'avif'].includes((await image.metadata()).format ?? '')) throw new Error('Unsupported image');
    // Preserve small text, aspect ratio and orientation; never enlarge or crop.
    // Metadata (including GPS) is stripped by sharp's default output policy.
    return await image.rotate().resize({ width: 4096, height: 4096, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88, effort: 6, smartSubsample: true }).toBuffer();
  } catch { throw new HttpError(400, 'Görsel okunamadı. JPEG, PNG veya WebP fotoğraf seçin.'); }
}
