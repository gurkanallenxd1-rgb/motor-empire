import * as T from './vendor/three.module.min.js';

// Merge spare opaque prop shapes with the same material after the repeated shapes were instanced.
export function mergeSpareProps(root) {
  const batches=new Map();
  for (const item of root.children) {
    if (!item.isMesh || item.isInstancedMesh || item.material.transparent || !item.castShadow) continue;
    const key=[item.material.id,item.receiveShadow].join(':');
    if(!batches.has(key)) batches.set(key,[]);
    batches.get(key).push(item);
  }
  for (const parts of batches.values()) {
    if(parts.length<2)continue;
    const result=new T.BufferGeometry();
    const sources=parts.map(part=>{
      part.updateMatrix();
      const geometry=part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
      return geometry.applyMatrix4(part.matrix);
    });
    for(const name of ['position','normal','uv']) {
      const fields=sources.map(geometry=>geometry.getAttribute(name));
      const data=new Float32Array(fields.reduce((length,field)=>length+field.array.length,0));
      let offset=0;
      for(const field of fields) {
        data.set(field.array,offset);
        offset+=field.array.length;
      }
      result.setAttribute(name,new T.BufferAttribute(data,fields[0].itemSize));
    }
    for(const geometry of sources)geometry.dispose();
    result.computeBoundingSphere();
    const batch=new T.Mesh(result,parts[0].material);
    batch.castShadow=true;
    batch.receiveShadow=parts[0].receiveShadow;
    root.remove(...parts);
    root.add(batch);
  }
}
