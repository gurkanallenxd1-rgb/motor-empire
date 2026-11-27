import { additions } from './catalog-data.mjs?v=0.12.6';

// Packed six at a time in catalog order, read left to right, top to bottom.
export const availablePacks = new Set([0,1,2,3,4,5,6,7,8,9,10,11,12]);
const placement = new Map(additions.map(([id],index)=>[id,index]));

export function atlasFor(id) {
  const index = placement.get(id);
  if (index === undefined || !availablePacks.has(Math.floor(index/6))) return null;
  const cell = index % 6;
  const pack = String(Math.floor(index/6)).padStart(2,'0');
  return { base:`expanded/pack-${pack}.webp`, mask:`expanded/pack-${pack}-mask.webp`,
    rect:[cell%3*320,Math.floor(cell/3)*248,320,248] };
}

export const legacySprite = id => !placement.has(id);
