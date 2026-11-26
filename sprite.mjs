import { modelOf } from './bikes.mjs?v=0.5.1';
import { approvedSprites } from './sprite-catalog.mjs?v=0.5.1';

export function spriteFor(bike, entries = approvedSprites) {
  const model = modelOf(bike);
  if (!model || !Number.isInteger(bike.year)) return null;
  const matches = entries.filter(entry => entry.modelId === model.id
    && Number.isInteger(entry.firstYear) && Number.isInteger(entry.lastYear)
    && bike.year >= entry.firstYear && bike.year <= entry.lastYear);
  if (matches.length !== 1) return null;
  const [entry] = matches;
  const validFile = file => typeof file === 'string' && /^[a-z0-9-]+\.webp$/.test(file);
  return validFile(entry.base) && validFile(entry.mask) && entry.base !== entry.mask
    && entry.author && entry.license && validLink(entry.source) && validLink(entry.licenseUrl) ? entry : null;
}

function validLink(value) {
  return typeof value === 'string' && /^https:\/\/[^\s]+$/.test(value);
}

function paintColor(bike) {
  return /^#[0-9a-f]{6}$/i.test(bike.color) ? bike.color.toLowerCase() : null;
}

export function spriteKey(bike) {
  const entry = spriteFor(bike);
  return entry && JSON.stringify([entry.base,entry.mask,paintColor(bike)]);
}

// The mask's alpha represents paint coverage. Outside it all bytes are preserved.
export function applyPaint(pixels, mask, color) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return;
  const target = [1,3,5].map(offset => parseInt(color.slice(offset,offset + 2),16));
  for (let i=0;i<pixels.length;i+=4) {
    const coverage = mask[i + 3] / 255;
    if (!coverage || !pixels[i + 3]) continue;
    const luminance = (.2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2]) / 255;
    for (let channel=0;channel<3;channel+=1) {
      // Keep shadows and specular highlights from the validated neutral base.
      const shade = luminance < .5
        ? target[channel] * luminance * 2
        : target[channel] + (255 - target[channel]) * (luminance - .5) * 2;
      pixels[i + channel] += (shade - pixels[i + channel]) * coverage;
    }
  }
}

const cache = new Map();

function loadWebP(file) {
  return new Promise((resolve,reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = new URL(`./assets/verified/${file}?v=0.5.1`,import.meta.url).href;
  });
}

async function compose(entry, color) {
  const [base,mask] = await Promise.all([loadWebP(entry.base),loadWebP(entry.mask)]);
  if (base.naturalWidth < 960 || !base.naturalHeight) throw new Error('Model görseli çözünürlüğü yetersiz.');
  if (base.naturalWidth !== mask.naturalWidth || base.naturalHeight !== mask.naturalHeight) {
    throw new Error('Boya maskesi ile model görselinin ölçüleri farklı.');
  }
  if (!color) return base;
  const canvas = document.createElement('canvas');
  canvas.width = base.naturalWidth;
  canvas.height = base.naturalHeight;
  const context = canvas.getContext('2d',{willReadFrequently:true});
  context.drawImage(mask,0,0);
  const coverage = context.getImageData(0,0,canvas.width,canvas.height);
  context.clearRect(0,0,canvas.width,canvas.height);
  context.drawImage(base,0,0);
  const pixels = context.getImageData(0,0,canvas.width,canvas.height);
  applyPaint(pixels.data,coverage.data,color);
  context.putImageData(pixels,0,0);
  return canvas;
}

export function loadSprite(bike) {
  const entry = spriteFor(bike);
  if (!entry) return Promise.resolve(null);
  const key = spriteKey(bike);
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = compose(entry,paintColor(bike)).catch(() => null);
  if (cache.size >= 16) cache.delete(cache.keys().next().value);
  cache.set(key,pending);
  return pending;
}

const pendingPreviews = new WeakMap();
export async function renderSprite(canvas, fallback, bike) {
  const pending = loadSprite(bike);
  pendingPreviews.set(canvas,pending);
  canvas.hidden = true;
  fallback.hidden = Boolean(spriteFor(bike));
  const sprite = await pending;
  if (pendingPreviews.get(canvas) !== pending) return;
  fallback.hidden = Boolean(sprite);
  if (!sprite) return;
  canvas.width = sprite.naturalWidth ?? sprite.width;
  canvas.height = sprite.naturalHeight ?? sprite.height;
  canvas.getContext('2d').drawImage(sprite,0,0);
  canvas.hidden = false;
}
