import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateIcons() {
  const svgPath = path.resolve('public/icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  // Generate pwa-192x192.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.resolve('public/pwa-192x192.png'));
  console.log('Generated pwa-192x192.png');

  // Generate pwa-512x512.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/pwa-512x512.png'));
  console.log('Generated pwa-512x512.png');

  // Generate pwa-maskable-512x512.png with safe zone padding (10%)
  await sharp(svgBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#09090b',
    })
    .png()
    .toFile(path.resolve('public/pwa-maskable-512x512.png'));
  console.log('Generated pwa-maskable-512x512.png');

  // Generate apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.resolve('public/apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // Generate favicon.ico (64x64 png as favicon or ico)
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.resolve('public/favicon.ico'));
  console.log('Generated favicon.ico');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
