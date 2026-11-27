import * as T from './vendor/three.module.min.js';
import { GLTFLoader,KTX2Loader } from './vendor/addons.mjs';

export const DISPLAY_PLINTH = new URL('../assets/3d/models/showroom-plinth.glb',import.meta.url).href;

function release(root) {
  const textures=new Set(),geometries=new Set(),materials=new Set();
  root.traverse(node=>{
    if (node.geometry) geometries.add(node.geometry);
    if (node.material) for (const item of [].concat(node.material)) {
      materials.add(item);
      for (const value of Object.values(item)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const item of textures) item.dispose();
  for (const item of geometries) item.dispose();
  for (const item of materials) item.dispose();
}

export function createAssets(renderer) {
  const compressed = new KTX2Loader().setTranscoderPath(new URL('./vendor/basis/',import.meta.url).href)
    .setWorkerLimit(2).detectSupport(renderer);
  const gltf = new GLTFLoader().setKTX2Loader(compressed);
  const assets=new Map();

  return {
    acquire(url) {
      if (!assets.has(url)) {
        const entry = {uses:0,pending:gltf.loadAsync(url).then(item=>item.scene)};
        assets.set(url,entry);
      }
      const entry = assets.get(url);
      entry.uses++;
      let released=false;
      return {model:entry.pending.then(scene=>scene.clone(true)),release(){
        if (released) return;
        released=true;
        if (--entry.uses===0 && assets.get(url)===entry) {
          entry.pending.then(scene=>{
            if (!entry.uses && assets.get(url)===entry) {
              assets.delete(url);
              release(scene);
            }
          },()=>{if (!entry.uses && assets.get(url)===entry) assets.delete(url);});
        }
      }};
    },
    dispose() {
      compressed.dispose();
      for (const entry of assets.values()) entry.pending.then(release,()=>{});
      assets.clear();
    },
  };
}

export function spriteTexture(image) {
  const map = new T.Texture(image);
  map.colorSpace=T.SRGBColorSpace;
  map.needsUpdate=true;
  return map;
}
