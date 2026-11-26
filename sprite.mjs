import { modelOf, paintOptions } from './bikes.mjs?v=0.7';
import { approvedSprites } from './sprite-catalog.mjs?v=0.7';
import { atlasFor, legacySprite } from './model-atlas.mjs?v=0.7';

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
  const choices = paintOptions(modelOf(bike),bike.year);
  const stored = /^#[0-9a-f]{6}$/i.test(bike.color) ? bike.color.toLowerCase() : null;
  return (choices.find(color=>color.hex === stored) ?? choices[0])?.hex ?? stored;
}

export function spriteKey(bike) {
  const model = modelOf(bike);
  const entry = spriteFor(bike);
  return model && JSON.stringify([model.id,entry?.base,entry?.mask,paintColor(bike)]);
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

const sources = new Map();

function loadWebP(path) {
  if (sources.has(path)) return sources.get(path);
  const pending = new Promise((resolve,reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = new URL(`./assets/${path}?v=0.7`,import.meta.url).href;
  });
  if (sources.size >= 12) sources.delete(sources.keys().next().value);
  sources.set(path,pending);
  return pending;
}

async function compose(basePath, maskPath, color, minWidth, rect) {
  const [base,mask] = await Promise.all([loadWebP(basePath),loadWebP(maskPath)]);
  if (base.naturalWidth < minWidth || !base.naturalHeight) throw new Error('Model görseli çözünürlüğü yetersiz.');
  if (base.naturalWidth !== mask.naturalWidth || base.naturalHeight !== mask.naturalHeight) {
    throw new Error('Boya maskesi ile model görselinin ölçüleri farklı.');
  }
  if (!color && !rect) return base;
  const canvas = document.createElement('canvas');
  canvas.width = rect?.[2] ?? base.naturalWidth;
  canvas.height = rect?.[3] ?? base.naturalHeight;
  const context = canvas.getContext('2d',{willReadFrequently:true});
  const draw = image => {
    if (rect) context.drawImage(image,...rect,0,0,canvas.width,canvas.height);
    else context.drawImage(image,0,0);
  };
  draw(mask);
  const coverage = context.getImageData(0,0,canvas.width,canvas.height);
  context.clearRect(0,0,canvas.width,canvas.height);
  draw(base);
  const pixels = context.getImageData(0,0,canvas.width,canvas.height);
  applyPaint(pixels.data,coverage.data,color);
  context.putImageData(pixels,0,0);
  return canvas;
}

export function loadSprite(bike) {
  const model = modelOf(bike);
  if (!model) return Promise.resolve(null);
  const entry = spriteFor(bike);
  const key = spriteKey(bike);
  const cached = cache.get(key);
  if (cached) return cached;
  const color = paintColor(bike);
  const pending = (async () => {
    if (entry) {
      try {
        const image = await compose(`verified/${entry.base}`,`verified/${entry.mask}`,color,960);
        return { image, representative:false };
      } catch {
        // A missing approved file may still be represented by its own model.
      }
    }
    const cell = atlasFor(model.id);
    if (cell) {
      try {
        const image = await compose(cell.base,cell.mask,color,960,cell.rect);
        return {image,representative:true};
      } catch {
        // Fall back to a clearly marked class image when a pack is unavailable.
      }
    }
    const classImage = {commuter:'honda-cb125f',naked:'yamaha-mt07',sport:'yamaha-r25',scooter:'honda-forza250',
      adventure:'kawasaki-z900',touring:'bajaj-dominar400',cruiser:'suzuki-gn125'};
    const generic = !legacySprite(model.id);
    const id = generic ? classImage[model.category] : model.id;
    const base = `models/${id}.webp`;
    const image = await compose(base,`model-masks/${id}.webp`,color,480)
      .catch(() => loadWebP(base));
    return {image,representative:true,generic};
  })().catch(() => null);
  if (cache.size >= 18) cache.delete(cache.keys().next().value);
  cache.set(key,pending);
  return pending;
}

const pendingPreviews = new WeakMap();
export async function renderSprite(canvas, fallback, bike, label) {
  if (label) label.hidden = true;
  const pending = loadSprite(bike);
  pendingPreviews.set(canvas,pending);
  canvas.hidden = true;
  fallback.hidden = Boolean(modelOf(bike));
  const sprite = await pending;
  if (pendingPreviews.get(canvas) !== pending) return;
  fallback.hidden = Boolean(sprite);
  if (!sprite) return;
  const { image,representative } = sprite;
  canvas.width = image.naturalWidth ?? image.width;
  canvas.height = image.naturalHeight ?? image.height;
  canvas.getContext('2d').drawImage(image,0,0);
  canvas.hidden = false;
  if (label) {
    label.textContent = sprite.generic ? 'Sınıf temsili' : 'Temsili görsel';
    label.hidden = !representative;
  }
}
