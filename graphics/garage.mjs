import * as T from './vendor/three.module.min.js';
import { worldBays } from './config.mjs?v=0.17';

export function buildWorkshop(scene) {
  const root = new T.Group();
  scene.add(root);
  const boxGeometry = new T.BoxGeometry();
  const cylinder = new T.CylinderGeometry(1,1,1,20);
  const material = (color,metalness=0,roughness=.63)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const concrete = material(0x9b9d9b,.03,.86);
  const epoxy = material(0x718085,.16,.47);
  const tile = material(0x95887b,.14,.40);
  const graphite = material(0x252e34,.21,.55);
  const steel = material(0xa4b0b7,.70,.31);
  const painted = material(0xbc4928,.28,.47);
  const yellow = material(0xf2b259,.18,.50);
  const oak = material(0x92654a,.03,.73);
  const black = material(0x181e22,.04,.88);
  const rubber = material(0x282626,0,.91);
  const leather = material(0x46403a,0,.87);
  const glass = new T.MeshPhysicalMaterial({color:0x98b6bd,metalness:.12,roughness:.15,transparent:true,opacity:.32,depthWrite:false,side:T.DoubleSide});
  const lamp = new T.MeshStandardMaterial({color:0xfaf0d2,emissive:0xffda99,emissiveIntensity:2.5});
  const blue = new T.MeshStandardMaterial({color:0x8ae2ed,emissive:0x46a4bc,emissiveIntensity:1.25});
  const signs = [];
  let surface;
  const box = (x,y,z,w,h,d,m=graphite)=>mesh(boxGeometry,x,y,z,w,h,d,m);
  function mesh(geometry,x,y,z,w,h,d,m) {
    const item = new T.Mesh(geometry,m);
    item.position.set(x,y,z);
    item.scale.set(w,h,d);
    item.castShadow = !m.transparent;
    item.receiveShadow = !m.transparent;
    root.add(item);
    return item;
  }
  function bar(a,b,width,m) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b);
    const mid = start.clone().lerp(end,.5);
    const item = box(...mid,width,start.distanceTo(end),width,m);
    item.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());
  }
  function sign(text,x,y,z,width,rotate=0) {
    const c = document.createElement('canvas');
    c.width=512;c.height=128;
    const ctx = c.getContext('2d');
    ctx.fillStyle='#1b242b';ctx.fillRect(0,0,512,128);
    ctx.fillStyle='#ffac75';ctx.font='700 45px system-ui';ctx.textAlign='center';
    ctx.fillText(text,256,80,460);
    const map = new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
    const item = new T.Mesh(new T.PlaneGeometry(width,width/4),new T.MeshBasicMaterial({map,side:T.DoubleSide}));
    item.position.set(x,y,z);item.rotation.y=rotate;root.add(item);signs.push(item);
  }
  function facade(x,z,w,rotation=0) {
    const group = new T.Group();
    group.position.set(x,0,z);group.rotation.y=rotation;root.add(group);
    const add = (xx,yy,sx,sy,m)=>{
      const item = new T.Mesh(boxGeometry,m);item.scale.set(sx,sy,.085);
      item.position.set(xx,yy,0);group.add(item);
    };
    add(0,.22,w,.44,steel); add(0,2.9,w,.13,graphite);
    for (let i=0;i<=Math.round(w);i++) add(-w/2+i*w/Math.round(w),1.59,.07,2.58,graphite);
    add(0,1.56,w,2.23,glass);
  }
  function desk(x,z,finish=oak) {
    box(x,.74,z,1.55,.11,.64,finish);
    box(x-.67,.37,z,.075,.70,.59,graphite);box(x+.67,.37,z,.075,.70,.59,graphite);
    box(x,.99,z-.1,.47,.33,.07,black);box(x,1,z-.06,.424,.27,.018,blue);
    box(x,.825,z+.2,.33,.026,.115,black);
  }
  function shelf(x,z) {
    for (const dx of [-.63,.63]) for (const dz of [-.22,.22]) box(x+dx,1.05,z+dz,.07,2.1,.07,graphite);
    for (const y of [.20,.72,1.24,1.76]) {
      box(x,y,z,1.32,.055,.53,steel);
      for (let i=0;i<4;i++) box(x-.47+i*.30,y+.145,z,.21,.24+(i%2)*.11,.34,i%3===0?painted:oak);
    }
  }
  function cabinet(x,z) {
    box(x,.57,z,1.56,1.14,.55,painted);
    box(x,1.16,z,1.64,.09,.62,steel);
    for (let i=0;i<5;i++) {
      box(x,.19+i*.19,z+.286,1.35,.15,.035,graphite);
      box(x,.22+i*.19,z+.314,.78,.024,.045,steel);
    }
  }
  function shutter(x,z) {
    box(x,1.63,z,2.66,3.18,.11,steel);
    for (let i=0;i<13;i++) box(x,.22+i*.226,z+.065,2.50,.032,.035,graphite);
    for (const a of [-1.43,1.43]) box(x+a,1.63,z,.12,3.22,.19,graphite);
  }
  function lift(x,z) {
    box(x,.055,z,2.18,.11,.72,graphite);
    for (const s of [-.26,.26]) {
      bar([x-.75,.11,z+s],[x+.72,.38,z+s],.10,painted);
      bar([x+.72,.11,z+s],[x-.75,.38,z+s],.10,painted);
    }
    box(x,.415,z,2.26,.09,.76,steel);
    box(x-.99,.49,z,.12,.12,.68,yellow);
    box(x+.9,.50,z,.16,.13,.26,graphite);
  }
  box(0,-.16,0,16,.32,13.6,concrete);
  box(-5.18,-.013,0,5.64,.034,12.95,epoxy);
  box(3,-.013,0,9.5,.034,12.95,tile);
  box(-2.25,.015,0,.065,.026,12.7,yellow);
  // Cutaway service walls, gate and showroom glass.
  box(-7.95,1.55,0,.16,3.1,13.1,concrete);
  box(-5.85,1.55,-6.62,4.1,3.1,.16,concrete);
  box(2.15,1.55,-6.62,11.8,3.1,.16,concrete);
  shutter(-5.7,-6.46);
  facade(7.72,.3,12.35,Math.PI/2);
  facade(3.35,5.94,8.25);
  facade(-1.76,-4.9,2.98,Math.PI/2);
  facade(1.5,-5.40,2.55);
  box(1.5,.014,-5.99,2.54,.028,1.1,oak);
  desk(1.48,-6);
  desk(5.66,4.85);
  box(1.2,.35,4.88,1.9,.42,.64,leather);
  box(1.2,.68,5.15,1.9,.55,.21,leather);
  box(1.2,.35,4.1,1.1,.12,.48,oak);
  shelf(-.15,-6.04); shelf(3.45,-6.04);
  cabinet(-7.02,-2.9);cabinet(-7.02,.3);
  box(-6.55,.93,4.88,2.1,.13,.72,steel);
  box(-7.32,.46,4.88,.19,.94,.62,graphite);
  box(-5.78,.46,4.88,.19,.94,.62,graphite);
  const compressor = mesh(cylinder,-4.95,.37,4.65,.26,1.12,.26,painted);
  compressor.rotation.z=Math.PI/2;
  box(-4.95,.66,4.65,.45,.24,.38,black);
  box(-3.9,.54,4.72,.68,1.08,.72,painted);
  box(-3.9,1.12,4.72,.64,.09,.62,steel);
  bar([-4.12,1.13,4.48],[-4.12,1.79,4.48],.10,steel);
  bar([-4.12,1.76,4.48],[-3.60,1.76,4.48],.08,steel);
  const tire = new T.TorusGeometry(.34,.095,12,36);
  for (let i=0;i<4;i++) {
    const ring=mesh(tire,-6.8,.125+i*.17,3.13,1,1,1,rubber);ring.rotation.x=-Math.PI/2;
  }
  for (const [i,[x,z]] of worldBays.entries()) {
    if (i<3) lift(x,z);
    else {
      box(x,.038,z,2.20,.075,1.18,graphite);
      box(x,.044,z+.56,2.12,.029,.043,blue);
    }
    const marker=mesh(cylinder,x,.043,z+.90,.12,.04,.12,yellow);
    marker.castShadow=false;
  }
  for (let i=0;i<9;i++) box(-7.25+i*.32,.018,2.9,.18,.022,1.0,yellow).rotation.y=-.45;
  for (const x of [-6,-2,2,6]) {
    box(x,2.95,-6.49,2.8,.055,.13,lamp);
    box(x,2.86,5.91,2.65,.065,.12,lamp);
  }
  sign('SERVİS',-5.55,2.49,-6.27,1.86);
  sign('DEPO',-.07,2.13,-6.49,1.51);
  sign('MÜDÜR',1.47,2.55,-5.34,1.41);
  sign('MOTOR EMPIRE',5.56,2.15,-6.49,3.35);
  sign('TESLİMAT',-7.83,1.87,3.95,1.47,Math.PI/2);
  sign('RESEPSİYON',5.66,1.05,5.20,1.15);
  const batches=new Map();
  for (const item of root.children) {
    if (item.material?.transparent || (item.geometry!==boxGeometry && item.geometry!==cylinder)) continue;
    const key=item.geometry.id+':'+item.material.id;
    if (!batches.has(key)) batches.set(key,[]);
    batches.get(key).push(item);
  }
  for (const items of batches.values()) {
    if (items.length<3) continue;
    const {geometry,material,castShadow,receiveShadow}=items[0];
    const batch=new T.InstancedMesh(geometry,material,items.length);
    batch.castShadow=castShadow;batch.receiveShadow=receiveShadow;
    items.forEach((item,index)=>{
      item.updateMatrix();
      batch.setMatrixAt(index,item.matrix);
      item.removeFromParent();
    });
    batch.computeBoundingSphere();
    root.add(batch);
  }
  function texture(size) {
    if (surface?.image.width===size) return;
    surface?.dispose();
    const c = document.createElement('canvas');c.width=c.height=size;
    const ctx=c.getContext('2d');
    const pixels=ctx.createImageData(size,size);
    const tileSize=size/4;
    const grout=Math.max(1,size/256);
    let seed=539;
    for (let i=0;i<pixels.data.length;i+=4) {
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const p=i/4, x=p%size, y=Math.floor(p/size);
      const seam = x%tileSize<grout||y%tileSize<grout;
      const shade=seam?143:178+(seed>>>27)+Math.round(12*Math.sin(y/size*17)*Math.cos(x/size*12));
      pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=shade;
      pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    surface=new T.CanvasTexture(c);
    surface.colorSpace=T.SRGBColorSpace;
    surface.wrapS=surface.wrapT=T.RepeatWrapping;
    surface.repeat.set(3,4);
    tile.map=surface;concrete.map=surface;tile.needsUpdate=concrete.needsUpdate=true;
  }
  return {root,texture,textureSize:()=>surface?.image.width,dispose(){
    surface?.dispose();
    const mats=new Set(),geos=new Set();
    root.traverse(node=>{if(node.isInstancedMesh)node.dispose();if(node.material)mats.add(node.material);if(node.geometry)geos.add(node.geometry);});
    for(const item of signs) item.material.map.dispose();
    for(const m of mats)m.dispose();
    for(const g of geos)g.dispose();
    root.removeFromParent();
  }};
}
