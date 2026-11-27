// The files encode this exact order, six cells per sheet. Catalog order can change.
const packedIds = [
  'yamaha-mt125','yamaha-mt03','yamaha-mt10','yamaha-r125','yamaha-r3','yamaha-r6',
  'yamaha-r7','yamaha-r1','yamaha-xmax250','yamaha-tmax560','yamaha-tracer9','yamaha-tenere700',
  'honda-cb125r','honda-cb650r','honda-cbr650r','honda-cbr600rr','honda-cbr1000rr-r','honda-adv350',
  'honda-africa-twin','honda-nc750x','kawasaki-z125','kawasaki-z400','kawasaki-z650','kawasaki-z1000',
  'kawasaki-ninja250','kawasaki-ninja650','kawasaki-zx6r','kawasaki-zx10r','kawasaki-ninja-h2','bmw-g310r',
  'bmw-g310gs','bmw-f900r','bmw-s1000r','bmw-s1000rr','bmw-m1000rr','bmw-r1300gs',
  'ducati-monster','ducati-panigale-v2','ducati-panigale-v4','ducati-streetfighter-v4','ducati-diavel','ducati-multistrada',
  'ktm-duke125','ktm-duke200','ktm-duke790','ktm-duke890','ktm-duke990','ktm-super-duke1290',
  'ktm-rc125','ktm-rc390','suzuki-gsxr125','suzuki-gsxr600','suzuki-gsxr750','suzuki-gsxr1000',
  'suzuki-gsxs750','suzuki-hayabusa','suzuki-vstrom650','cfmoto-250nk','cfmoto-250sr','cfmoto-450nk',
  'cfmoto-450sr','cfmoto-650nk','cfmoto-675srr','cfmoto-800nk','aprilia-rs125','aprilia-rs660',
  'aprilia-tuono660','triumph-trident660','triumph-street-triple765','harley-iron883','harley-sportster-s','rks-freccia150',
  'mondial-uag125','kuba-bluebird125','benelli-tnt125','royal-enfield-classic350','royal-enfield-himalayan450','vespa-primavera125',
];
const placement = new Map(packedIds.map((id,index)=>[id,index]));

export function atlasFor(id) {
  const index = placement.get(id);
  if (index === undefined) return null;
  const cell = index % 6;
  const pack = String(Math.floor(index/6)).padStart(2,'0');
  return { base:`expanded/pack-${pack}.webp`, mask:`expanded/pack-${pack}-mask.webp`,
    rect:[cell%3*320,Math.floor(cell/3)*248,320,248] };
}

export const legacySprite = id => !placement.has(id) && id!=='ktm-super-duke1390';
