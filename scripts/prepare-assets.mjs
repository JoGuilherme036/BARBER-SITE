// Generates optimized media for the site.
// Usage: node scripts/prepare-assets.mjs <images-dir> <video-landscape.mp4> <video-portrait.mp4>
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const [imagesDir, videoLandscape, videoPortrait] = process.argv.slice(2);
if (!imagesDir || !videoLandscape || !videoPortrait) {
  console.error('Usage: node scripts/prepare-assets.mjs <images-dir> <landscape.mp4> <portrait.mp4>');
  process.exit(1);
}

const out = resolve('public/media');

// Source file prefix -> media id. Source names come from the owner's export.
const IMAGE_MAP = {
  'Fade natural': 'servico-corte',
  'Aparar barba': 'servico-barba',
  'Retrato masculino': 'estilo-barba',
  'Cachos naturais': 'estilo-cachos',
  'Corte cl': 'estilo-classico',
  'Corte ondulado': 'estilo-ondulado',
  'Barbearia contempor': 'ambiente-principal',
  'Poltrona de barbeiro no': 'poltrona-horizontal',
  'Poltrona de barbeiro em': 'poltrona-vertical',
  'Pomada capilar': 'produto-pomada',
  'Ritual de toalha': 'ritual-toalha',
  'Ritual refinado': 'ritual-bancada',
};
const WIDTHS = [480, 800, 1200];

async function images() {
  const dir = join(out, 'img');
  mkdirSync(dir, { recursive: true });
  const manifest = {};
  for (const file of readdirSync(imagesDir).filter((f) => f.endsWith('.png'))) {
    const key = Object.keys(IMAGE_MAP).find((k) => file.startsWith(k));
    if (!key) continue;
    const id = IMAGE_MAP[key];
    const src = sharp(join(imagesDir, file));
    const { width, height } = await src.metadata();
    const { dominant } = await src.stats();
    const widths = [...WIDTHS.filter((w) => w < width), ...(width < 1200 ? [width] : [])];
    for (const w of widths) {
      await sharp(join(imagesDir, file)).resize(w).webp({ quality: 72 }).toFile(join(dir, `${id}-${w}.webp`));
    }
    manifest[id] = {
      width,
      height,
      widths,
      color: `rgb(${dominant.r},${dominant.g},${dominant.b})`,
    };
    console.log('image', id, widths.join(','));
  }
  writeFileSync(resolve('src/data/media.json'), JSON.stringify(manifest, null, 2) + '\n');
}

// Scroll-scrubbed film: every frame is a keyframe (-g 1) so seeking to any time is instant,
// and the browser keeps only the current frame in memory (an image sequence keeps them all).
async function film(video, name, size, crf) {
  const dir = join(out, 'film');
  mkdirSync(dir, { recursive: true });
  const [w, h] = size.split(':').map(Number);
  const common = ['-v', 'error', '-y', '-i', video, '-an', '-vf', `scale=${w}:${h},fps=24`];
  execFileSync('ffmpeg', [...common, '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', String(crf), '-g', '1', '-keyint_min', '1', '-sc_threshold', '0', '-movflags', '+faststart', join(dir, `${name}.mp4`)]);
  // Fallback for browsers without H.264.
  execFileSync('ffmpeg', [...common, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '57', '-g', '1', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', join(dir, `${name}.webm`)]);

  // First frame: instant paint (LCP) and reduced-motion still. Last frame: the epilogue background.
  const tmp = join(out, `.tmp-${name}`);
  mkdirSync(tmp, { recursive: true });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-vf', `scale=${w}:${h}`, '-frames:v', '1', join(tmp, 'first.png')]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-sseof', '-0.1', '-i', video, '-vf', `scale=${w * 4 / 3}:${h * 4 / 3}`, '-frames:v', '1', '-update', '1', join(tmp, 'last.png')]);
  await sharp(join(tmp, 'first.png')).webp({ quality: 70 }).toFile(join(out, `poster-${name}.webp`));
  await sharp(join(tmp, 'last.png')).webp({ quality: 66 }).toFile(join(out, `end-${name}.webp`));
  rmSync(tmp, { recursive: true, force: true });

  const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', join(dir, `${name}.mp4`)]).toString().trim());
  console.log('film', name, duration);
  return { width: w, height: h, duration };
}

await images();
const landscape = await film(videoLandscape, 'landscape', '1280:720', 32);
const portrait = await film(videoPortrait, 'portrait', '540:960', 30);
writeFileSync(resolve('src/data/film.json'), JSON.stringify({ landscape, portrait }, null, 2) + '\n');
