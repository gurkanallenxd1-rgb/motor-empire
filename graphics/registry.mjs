// Independent of the existing 2D catalog and assets. A file is enabled only after license review.
export const MOTORCYCLE_3D = Object.freeze([
  Object.freeze({id:'yamaha-mt25',year:2024,colors:Object.freeze(['#292b2e']),path:null}),
  Object.freeze({id:'kawasaki-z900',year:2025,colors:Object.freeze(['#639d34']),path:null}),
  Object.freeze({id:'ktm-super-duke1390',year:2024,colors:Object.freeze(['#e86920']),accent:'#292b2e',path:null}),
]);
export const motorcycleAsset = (id,year,color,accent)=>MOTORCYCLE_3D.find(row=>row.id===id && row.year===year
  && row.colors.includes(color) && (!row.accent || row.accent===accent))?.path ?? null;
