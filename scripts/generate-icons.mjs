#!/usr/bin/env node
// Rasterize docs/logo.svg into the extension's required PNG sizes.
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = join(root, 'docs', 'logo.svg');
const outDir = join(root, 'public', 'icons');
const sizes = [16, 32, 48, 128];

mkdirSync(outDir, { recursive: true });
const svg = readFileSync(svgPath);

await Promise.all(
  sizes.map(async (size) => {
    const out = join(outDir, `icon-${size}.png`);
    await sharp(svg, { density: Math.max(72, size * 4) })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`wrote ${out}`);
  }),
);
