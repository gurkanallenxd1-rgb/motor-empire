export const GRAPHICS_KEY = 'motor-empire.graphics.v1';
export const QUALITY = Object.freeze({
  low:{dpr:.85,texture:128,shadow:0,reflection:.22,lod:5},
  medium:{dpr:1.25,texture:256,shadow:512,reflection:.50,lod:9},
  high:{dpr:1.65,texture:512,shadow:1024,reflection:.78,lod:14},
  ultra:{dpr:2,texture:1024,shadow:2048,reflection:1,lod:21},
});
export const DEFAULT_GRAPHICS = Object.freeze({
  mode:'2d',quality:'auto',fps:60,resolution:'auto',shadows:'auto',reflections:'auto',aa:true,meter:false,
});
const choices = {
  mode:['2d','3d'],quality:['auto',...Object.keys(QUALITY)],fps:[30,60],
  resolution:['auto','low','high'],shadows:['auto','low','off'],reflections:['auto','low','off'],
};
export function graphicsOptions(raw) {
  const result = {...DEFAULT_GRAPHICS};
  for (const [key,list] of Object.entries(choices)) if (list.includes(raw?.[key])) result[key] = raw[key];
  for (const key of ['aa','meter']) if (typeof raw?.[key]==='boolean') result[key] = raw[key];
  return result;
}
export function readGraphics(storage) {
  try { return graphicsOptions(JSON.parse(storage.getItem(GRAPHICS_KEY))); }
  catch { return graphicsOptions(); }
}
export function writeGraphics(storage,value) {
  try { storage.setItem(GRAPHICS_KEY,JSON.stringify(graphicsOptions(value))); }
  catch { /* Graphics settings can still apply for the current page. */ }
}
export const initialQuality = ({memory,cores}) => (memory && memory<4) || (cores && cores<5) ? 'low' : 'medium';

export function qualityProfile(settings,automatic='medium') {
  const name = settings.quality==='auto' ? automatic : settings.quality;
  const quality = QUALITY[name];
  return {...quality,name,
    dpr:settings.resolution==='low' ? .75 : settings.resolution==='high' ? 2 : quality.dpr,
    shadow:settings.shadows==='off' ? 0 : settings.shadows==='low' ? 512 : quality.shadow,
    reflection:settings.reflections==='off' ? 0 : settings.reflections==='low' ? .25 : quality.reflection,
  };
}

export const prototypeAllowed = (settings,capacity)=>settings.mode==='3d' && capacity===10;
export const worldBays = Object.freeze([
  [-5.7,-4.3],[-5.7,-1.6],[-5.7,1.1],
  [0,-3.8],[2.5,-3.8],[5,-3.8],[0,-.6],[2.5,-.6],[5,-.6],[2.5,2.7],
]);
