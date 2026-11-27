import { brushedMetalMap,tiledSurface } from './surfaces.mjs?v=0.17.0.1';
import { cutaway } from './camera.mjs?v=0.17.0.1';
import * as T from './vendor/three.module.min.js';
import { worldBays } from './config.mjs?v=0.17.0.1';

export function buildWorkshop(scene) {
  const root = new T.Group();
  scene.add(root);
  const boxGeometry = new T.BoxGeometry();
  const cylinder = new T.CylinderGeometry(1,1,1,20);
  const dome=new T.SphereGeometry(1,16,8);
  const shape=new T.Shape().moveTo(-.43,-.43).lineTo(.43,-.43).lineTo(.43,.43).lineTo(-.43,.43).closePath();
  const bevel=new T.ExtrudeGeometry(shape,{depth:.86,bevelSize:.07,bevelThickness:.07,bevelSegments:2,steps:1});
  bevel.translate(0,0,-.43);
  const equipment=(x,y,z,w,h,d,m)=>mesh(bevel,x,y,z,w,h,d,m);
  const material = (color,metalness=0,roughness=.63)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const concrete = material(0x747f82,.03,.86);
  const epoxy = material(0x52666c,.12,.48);
  const tile = material(0xb0a18c,.08,.82);
  const graphite = material(0x26343e,.57,.29);
  const steel = material(0xb5bec5,.85,.28);
  const painted = material(0xbc4928,.28,.47);
  const yellow = material(0xf2b259,.18,.50);
  const oak = material(0x9a7051,.03,.62);
  const black = material(0x181e22,.04,.88);
  const rubber = material(0x282626,0,.91);
  const leather = material(0x46403a,0,.87);
  const glass = new T.MeshPhysicalMaterial({color:0x98b6bd,metalness:.12,roughness:.15,transparent:true,opacity:.32,depthWrite:false,side:T.DoubleSide});
  const lamp = new T.MeshStandardMaterial({color:0xfaf0d2,emissive:0xffda99,emissiveIntensity:2.5});
  const blue = new T.MeshStandardMaterial({color:0x8ae2ed,emissive:0x46a4bc,emissiveIntensity:1.25});
  const signs = [];
  const walls = [];
  function section(name,build,glass=false) {
    const start=root.children.length;
    build();
    const group=new T.Group();
    group.add(...root.children.slice(start));
    root.add(group);
    walls.push({name,group,glass});
  }
  let surface;
  let mapsEnabled=false;
  let metalMap;
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
    item.position.set(x,y,z);item.rotation.y=rotate;root.add(item);signs.push(item);return item;
  }
  function facade(x,z,w,rotation=0) {
    const group = new T.Group();
    group.position.set(x,0,z);group.rotation.y=rotation;root.add(group);
    const add = (xx,yy,sx,sy,m)=>{
      const item = new T.Mesh(boxGeometry,m);item.scale.set(sx,sy,.085);
      item.position.set(xx,yy,0);group.add(item);
    };
    add(0,.22,w,.44,steel);
    const sections=Math.round(w);
    const frame=new T.InstancedMesh(boxGeometry,graphite,sections+2);
    const matrix=new T.Matrix4();
    frame.setMatrixAt(0,matrix.makeScale(w,.13,.085).setPosition(0,2.9,0));
    for (let i=0;i<=sections;i++) {
      frame.setMatrixAt(i+1,matrix.makeScale(.07,2.58,.085).setPosition(-w/2+i*w/sections,1.59,0));
    }
    frame.computeBoundingSphere();
    group.add(frame);
    add(0,1.56,w,2.23,glass);
  }
  function desk(x,z,finish=oak) {
    equipment(x,.74,z,1.55,.11,.72,finish);
    box(x-.67,.37,z,.075,.70,.59,graphite);box(x+.67,.37,z,.075,.70,.59,graphite);
    mesh(cylinder,x,.76,z-.10,.11,.025,.08,steel);
    box(x,.87,z-.12,.045,.20,.036,steel);
    equipment(x,1.04,z-.12,.55,.34,.057,black);
    box(x,1.04,z-.085,.502,.278,.012,blue);
    const chairZ=z+.52;
    equipment(x,.49,chairZ,.42,.08,.40,leather);
    equipment(x,.70,chairZ+.18,.42,.42,.07,leather);
    mesh(cylinder,x,.26,chairZ,.027,.38,.027,steel);
    for(const angle of [0,Math.PI/3,Math.PI*2/3]) {
      box(x,.08,chairZ,.52,.035,.035,black).rotation.y=angle;
    }
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
    equipment(x,.57,z,1.56,1.14,.55,painted);
    box(x,1.16,z,1.64,.09,.62,steel);
    for (let i=0;i<5;i++) {
      box(x,.19+i*.19,z+.286,1.35,.15,.035,graphite);
      equipment(x,.22+i*.19,z+.314,.78,.026,.053,steel);
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
    equipment(x,.415,z,2.26,.09,.76,steel);
    const ram=mesh(cylinder,x,.245,z,.075,.63,.075,steel);
    ram.rotation.z=1.04;
    for(const dx of [-.64,.64]) for(const dz of [-.32,.32]) {
      mesh(cylinder,x+dx,.27,z+dz,.064,.06,.064,graphite).rotation.x=Math.PI/2;
    }
    for(const dz of [-.24,0,.24]) box(x+.6,.466,z+dz,.41,.012,.027,graphite);
    box(x-.99,.49,z,.12,.12,.68,yellow);
    box(x+.9,.50,z,.16,.13,.26,graphite);
  }
  box(0,-.16,0,16,.32,13.6,concrete);
  box(-5.18,-.013,0,5.64,.034,12.95,epoxy);
  box(3,-.013,0,9.5,.034,12.95,tile);
  box(-2.25,.015,0,.065,.026,12.7,yellow);
  // Cutaway service walls, gate and showroom glass.
  section('west',()=>{
    box(-7.95,1.55,0,.16,3.1,13.1,concrete);
    sign('TESLİMAT',-7.83,1.87,3.95,1.47,Math.PI/2);
  });
  section('north',()=>{
    box(-5.85,1.55,-6.62,4.1,3.1,.16,concrete);
    box(2.15,1.55,-6.62,11.8,3.1,.16,concrete);
    shutter(-5.7,-6.46);
    sign('SERVİS',-5.55,2.49,-6.27,1.86);
    sign('DEPO',-.07,2.13,-6.49,1.51);
    sign('MOTOR EMPIRE',5.56,2.15,-6.49,3.35);
  });
  section('east',()=>facade(7.72,.3,12.35,Math.PI/2),true);
  section('south',()=>facade(3.35,5.94,8.25),true);
  facade(-1.76,-4.9,2.98,Math.PI/2);
  facade(1.5,-5.40,2.55);
  box(1.5,.014,-5.99,2.54,.028,1.1,oak);
  desk(1.48,-6);
  desk(5.66,4.85);
  for(const x of [.59,1.2,1.81]) {
    equipment(x,.39,4.88,.58,.19,.64,leather);
    equipment(x,.67,5.15,.57,.56,.16,leather).rotation.x=-.14;
  }
  for(const x of [.25,2.15]) box(x,.49,4.9,.072,.072,.64,steel);
  box(1.2,.35,4.1,1.1,.12,.48,oak);
  shelf(-.15,-6.04); shelf(3.45,-6.04);
  cabinet(-7.02,-2.9);cabinet(-7.02,.3);
  box(-6.55,.93,4.88,2.1,.13,.72,steel);
  box(-7.32,.46,4.88,.19,.94,.62,graphite);
  box(-5.78,.46,4.88,.19,.94,.62,graphite);
  const compressor = mesh(cylinder,-4.95,.37,4.65,.26,1.12,.26,painted);
  compressor.rotation.z=Math.PI/2;
  for(const x of [-5.51,-4.39]) mesh(dome,x,.37,4.65,.17,.26,.26,painted);
  for(const z of [4.37,4.92]) {
    mesh(cylinder,-5.29,.17,z,.16,.07,.16,rubber).rotation.x=Math.PI/2;
    mesh(cylinder,-5.29,.17,z-.04,.08,.035,.08,steel).rotation.x=Math.PI/2;
  }
  equipment(-4.95,.69,4.65,.46,.24,.38,black);
  for(const x of [-5.1,-4.99,-4.88,-4.77]) box(x,.78,4.65,.03,.11,.36,steel);
  mesh(cylinder,-4.55,.76,4.77,.068,.045,.068,lamp).rotation.x=Math.PI/2;
  const airLine=new T.CatmullRomCurve3([[0,0,0],[.2,.12,.07],[.32,-.04,.36],[.08,-.28,.58],[-.2,-.27,.38]]
    .map(point=>new T.Vector3(...point)));
  mesh(new T.TubeGeometry(airLine,20,.026,7),-4.55,.67,4.66,1,1,1,black);
  for (const x of [-7.37,-7.10,-6.81]) {
    equipment(x,1.12,4.98,.15,.28,.13,painted);
    mesh(cylinder,x,1.28,4.98,.04,.055,.04,black);
  }
  box(-6.54,1.45,5.20,2,.75,.04,graphite);
  for (const x of [-7.22,-6.93,-6.63,-6.33,-6.03]) {
    box(x,1.52,5.15,.055,.24,.035,steel).rotation.z=.32;
    mesh(cylinder,x-.036,1.64,5.15,.043,.025,.043,steel).rotation.x=Math.PI/2;
  }
  box(-3.9,.54,4.72,.68,1.08,.72,painted);
  mesh(cylinder,-3.9,1.12,4.72,.35,.085,.35,steel);
  for(const [dx,dz] of [[-.21,0],[.21,0],[0,-.21],[0,.21]]) {
    box(-3.9+dx,1.18,4.72+dz,.105,.055,.105,graphite);
  }
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
  for(const x of [-7.1,-6.1,-5.1]) {
    box(x,2.94,-5.86,.7,.27,.12,steel);
    for (const y of [2.87,2.93,2.99]) box(x,y,-5.78,.54,.02,.028,black);
  }
  box(-6.15,2.17,5.19,2.42,.068,.073,steel);
  for(const x of [-7.13,-5.61]) box(x,1.91,5.17,.16,.22,.074,graphite);
  sign('TESLİM',-6.1,.07,3.6,1.38).rotation.x=-Math.PI/2;
  equipment(5.66,1.61,5.12,1.66,.48,.065,graphite);
  sign('SHOWROOM',5.66,1.61,5.16,1.56);
  for (const x of [-.08,2.42,4.92]) {
    box(x+.8,.36,-4.32,.035,.68,.05,steel);
    equipment(x+.8,.70,-4.32,.34,.23,.04,graphite);
    box(x+.8,.70,-4.295,.282,.174,.014,blue);
  }
  sign('MÜDÜR',1.47,2.55,-5.34,1.41);
  sign('RESEPSİYON',5.66,1.05,5.20,1.15);
  const batches=new Map();
  for (const item of root.children) {
    if (!item.geometry || item.material.transparent || signs.includes(item)) continue;
    const key=[item.geometry.id,item.material.id,item.castShadow,item.receiveShadow].join(':');
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
  function texture(size,detail) {
    if (surface?.color.image.width===size && mapsEnabled===detail) return;
    if(surface) for(const map of Object.values(surface)) map.dispose();
    surface=tiledSurface(size,detail);
    if(detail && !metalMap) metalMap=brushedMetalMap();
    if(!detail && metalMap) {metalMap.dispose();metalMap=undefined;}
    if(mapsEnabled!==detail) {
      steel.roughnessMap=steel.metalnessMap=metalMap??null;
      steel.roughness=detail?.57:.28;
      steel.needsUpdate=true;
    }
    mapsEnabled=detail;
    tile.map=surface.color;
    tile.normalMap=detail?surface.normal:null;
    tile.roughnessMap=detail?surface.roughness:null;
    tile.roughness=detail?1:.64;
    tile.normalScale.setScalar(.42);
    tile.needsUpdate=true;
  }
  return {root,texture,
    cutaway(eye,target){
      let changed=false;
      for (const wall of walls) {
        const visible=!cutaway(wall.name,eye,target,wall.glass);
        if (wall.group.visible!==visible) {wall.group.visible=visible;changed=true;}
      }
      return changed;
    },
    hiddenWalls:()=>walls.filter(wall=>!wall.group.visible).map(wall=>wall.name),
    textureSize:()=>surface?.color.image.width,dispose(){
    if(surface) for(const map of Object.values(surface)) map.dispose();
    metalMap?.dispose();
    const mats=new Set(),geos=new Set();
    root.traverse(node=>{if(node.isInstancedMesh)node.dispose();if(node.material)mats.add(node.material);if(node.geometry)geos.add(node.geometry);});
    for(const item of signs) item.material.map.dispose();
    for(const m of mats)m.dispose();
    for(const g of geos)g.dispose();
    root.removeFromParent();
  }};
}
