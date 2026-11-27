import * as T from './vendor/three.module.min.js';

// Tile channels are authored locally. The green channels store scalar roughness.
export function tiledSurface(size,detail) {
  const color=new Uint8Array(size*size*4);
  const normal=detail?new Uint8Array(color.length):null;
  const rough=detail?new Uint8Array(color.length):null;
  const tile=size/4, grout=Math.max(1,size/256);
  let seed=539;
  for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const i=(y*size+x)*4;
    const u=x%tile,v=y%tile;
    const joint=u<grout||v<grout;
    const shade=joint?82:166+((seed>>>28)*2)+((Math.floor(x/tile)*17+Math.floor(y/tile)*31)%27);
    color.set([shade,shade*.97,shade*.92,255],i);
    if (detail) {
      normal[i]=u===grout?101:u===tile-1?155:128;
      normal[i+1]=v===grout?101:v===tile-1?155:128;
      normal[i+2]=250;normal[i+3]=255;
      rough[i+1]=joint?224:122+(seed>>>27);rough[i+3]=255;
    }
  }
  function texture(data,isColor=false) {
    const result=new T.DataTexture(data,size,size);
    if(isColor)result.colorSpace=T.SRGBColorSpace;
    result.generateMipmaps=true;
    result.minFilter=T.LinearMipmapLinearFilter;
    result.magFilter=T.LinearFilter;
    result.wrapS=result.wrapT=T.RepeatWrapping;
    result.repeat.set(3,4);
    result.needsUpdate=true;
    return result;
  }
  return detail ? {color:texture(color,true),normal:texture(normal),roughness:texture(rough)}
    : {color:texture(color,true)};
}

export function contactMap() {
  const size=32;
  const data=new Uint8Array(size*size*4);
  for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
    const r=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1);
    const i=(y*size+x)*4;
    data[i]=data[i+1]=data[i+2]=255;
    data[i+3]=Math.round(255*Math.max(0,1-r*r)**2);
  }
  const map=new T.DataTexture(data,size,size);
  map.magFilter=T.LinearFilter;
  map.minFilter=T.LinearFilter;
  map.needsUpdate=true;
  return map;

}
