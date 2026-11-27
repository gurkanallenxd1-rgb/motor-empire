import { fitGarage } from './garage-layout.mjs?v=0.15.3';

let original;
let equipment;

function loadArt(file) {
  return new Promise(resolve=>{
    const image = new Image();
    image.onload = ()=>resolve(image);
    image.onerror = ()=>resolve(null);
    image.src = new URL(`./assets/${file}?v=0.15.3`,import.meta.url);
  });
}

export const workshopArt = plan=>plan.original
  ? (original ??= loadArt('workshop.webp'))
  : (equipment ??= Promise.all([loadArt('garage-equipment.webp'),loadArt('garage-surfaces.webp')])
    .then(([props,surfaces])=>({props,surfaces})));

function polygon(ctx,points,fill,stroke,width=1) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  if (fill) { ctx.fillStyle=fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle=stroke; ctx.lineWidth=width; ctx.stroke(); }
}

function face(ctx,plan,points,fill,stroke,width) {
  polygon(ctx,points.map(point=>plan.project(...point)),fill,stroke,width);
}

function line(ctx,[x,y],[tx,ty],color,width=1) {
  ctx.beginPath();
  ctx.moveTo(x,y);
  ctx.lineTo(tx,ty);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

const surfaceTiles = new Map();

function textureTile(atlas,material) {
  if (surfaceTiles.has(material)) return surfaceTiles.get(material);
  const quadrant = ['concrete','hybrid','stone','center'].indexOf(material);
  const w = atlas.width/2;
  const tile = document.createElement('canvas');
  tile.width = tile.height = w;
  tile.getContext('2d').drawImage(atlas,(quadrant%2)*w,Math.floor(quadrant/2)*w,w,w,0,0,w,w);
  surfaceTiles.set(material,tile);
  return tile;
}

function floor(ctx,plan,texture) {
  const {uSize:u,vSize:v,material,project:p} = plan;
  const stone = material==='stone' || material==='center';
  const light = ctx.createLinearGradient(...p(0,0),...p(u,v));
  light.addColorStop(0,stone?'#787570':'#514e49');
  light.addColorStop(.67,stone?'#575b57':'#797774');
  light.addColorStop(1,stone?'#969189':'#535454');
  face(ctx,plan,[[0,v],[u,v],[u,v,-13],[0,v,-13]],'#292927','#4d4a43');
  face(ctx,plan,[[u,0],[u,v],[u,v,-13],[u,0,-13]],'#373a39','#5c5a54');
  ctx.save();
  face(ctx,plan,[[0,0],[u,0],[u,v],[0,v]],light);
  ctx.clip();
  if (texture) {
    const [px,py] = p(0,0);
    ctx.save();
    ctx.transform(.866,.5,-.866,.5,px,py);
    ctx.globalAlpha = stone ? .44 : .60;
    ctx.fillStyle = ctx.createPattern(textureTile(texture,material),'repeat');
    ctx.fillRect(0,0,u,v);
    ctx.restore();
  }
  const grid = stone ? 74 : 110;
  for (let x=0;x<u;x+=grid) for (let y=0;y<v;y+=grid) {
    const shade = (Math.imul(x+113,y+197)>>>4)%12;
    face(ctx,plan,[[x,y],[x+grid,y],[x+grid,y+grid],[x,y+grid]],
      shade>5 ? `rgba(246,225,204,${shade/260})` : `rgba(16,24,28,${shade/90})`,
      stone?'#343b3b88':'#25262a63',stone?1.2:1);
  }
  for (let i=1;i<u*v/330;i++) {
    const x = (Math.imul(i,16807)>>>0)%u;
    const y = (Math.imul(i+13,100003)>>>0)%v;
    const [sx,sy] = p(x,y);
    ctx.fillStyle = i%3 ? '#dadeca18' : '#0003';
    ctx.fillRect(sx,sy,i%4+1,.7);
  }
  const [px,py] = p(0,0);
  ctx.save();
  ctx.transform(.866,.5,-.866,.5,px,py);
  // The walls cast contact shadows. Reflected fixture light follows the floor plane.
  for (const [edge,depth,length] of [['v',65,u],['u',63,v]]) {
    const darkness = edge==='v' ? ctx.createLinearGradient(0,0,0,depth) : ctx.createLinearGradient(0,0,depth,0);
    darkness.addColorStop(0,'#100f13a0');
    darkness.addColorStop(1,'#11131800');
    ctx.fillStyle = darkness;
    if (edge==='v') ctx.fillRect(0,0,length,depth);
    else ctx.fillRect(0,0,depth,length);
  }
  for (let x=120;x<u-40;x+=218) {
    const shine = ctx.createRadialGradient(x,36,4,x,36,118);
    shine.addColorStop(0,stone?'#d7efef27':'#ffd3a033');
    shine.addColorStop(1,'#ffd3a000');
    ctx.fillStyle = shine;
    ctx.fillRect(x-118,0,236,154);
  }
  ctx.restore();
  const cross = 112 + plan.serviceRows*202;
  face(ctx,plan,[[41,cross],[u-47,cross],[u-47,cross+63],[41,cross+63]],'#232a2bb3');
  line(ctx,p(46,cross+7),p(u-52,cross+7),'#ceab6c99',1.9);
  line(ctx,p(46,cross+55),p(u-52,cross+55),'#ceab6c99',1.9);
  if (stone) {
    face(ctx,plan,[[u-141,0],[u-22,0],[u-22,v],[u-141,v]],material==='center'?'#353849d9':'#363334d7','#c3aa7966',2);
  }
  ctx.restore();
}

function wall(ctx,plan,length,axis,glass) {
  const point = (span,z)=>axis==='u'?plan.project(span,0,z):plan.project(0,span,z);
  const h = plan.wallHeight;
  const [x,y] = point(0,0);
  const grad = ctx.createLinearGradient(x,y-h,x,y);
  grad.addColorStop(0,glass?'#39494e':'#646563');
  grad.addColorStop(1,glass?'#191e22':'#2b2c2d');
  polygon(ctx,[point(0,0),point(length,0),point(length,h),point(0,h)],grad,'#151719');
  polygon(ctx,[point(0,h),point(length,h),point(length,h+7),point(0,h+7)],'#83817a');
  polygon(ctx,[point(0,4),point(length,4),point(length,18),point(0,18)],glass?'#80674e':'#8e6950');
  const span = glass ? 170 : 215;
  for (let a=20;a+57<length;a+=span) {
    const b = Math.min(a+span-14,length-10);
    const glassPanel = glass || (axis==='u' && Math.floor(a/span)%2===1);
    const low = glass ? 24 : 53;
    const high = glass ? 121 : 108;
    if (glassPanel) {
      polygon(ctx,[point(a,low),point(b,low),point(b,high),point(a,high)],'#3b5055','#151c20',4);
      polygon(ctx,[point(a+6,low+8),point(b-9,low+8),point(b-9,high-13)],'#9bbec030');
      line(ctx,point((a+b)/2,low),point((a+b)/2,high),'#151e22',3);
      continue;
    }
    for (let z=37;z<95;z+=13) line(ctx,point(a,z),point(b,z),'#1f222482',1);
    line(ctx,point(a,116),point(b,116),'#292c2c',7);
    line(ctx,point(a+7,115),point(b-6,115),'#ffe4b4',3);
    const [cx,cy] = point((a+b)/2,98);
    const glow = ctx.createRadialGradient(cx,cy,4,cx,cy,89);
    glow.addColorStop(0,'#ffd38b38');
    glow.addColorStop(1,'#ffcb8a00');
    ctx.fillStyle = glow;
    ctx.fillRect(cx-89,cy-89,178,178);
  }
}

function propPositions(plan) {
  const {uSize:u,vSize:v,material} = plan;
  if (material==='concrete') return [[0,125,48,158],[1,u*.69,38,143],[4,68,v*.46,110],[3,u-54,v-136,108]];
  if (material==='hybrid') return [[0,146,47,164],[1,u*.45,42,133],[4,u*.65,39,116],[2,u-61,76,128],[3,u-47,v*.72,132]];
  if (material==='stone') return [[0,143,49,145],[1,u*.41,38,108],[2,u-62,141,146],[5,u-67,v*.54,121],[3,u-57,v-100,130],[5,50,v*.54,92]];
  return [[0,146,39,152],[1,u*.26,42,132],[4,u*.45,41,132],[0,u*.62,40,151],
    [2,u-70,125,151],[5,u-69,v*.40,126],[3,u-68,v*.66,130],[5,u-74,v-95,126],[5,58,v*.57,117]];
}

function drawProp(ctx,atlas,cell,x,y,width) {
  const tileWidth = atlas.width/3;
  const tileHeight = atlas.height/2;
  const height = width*tileHeight/tileWidth;
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(width*.44,width*.14);
  const contact = ctx.createRadialGradient(0,0,.11,0,0,1);
  contact.addColorStop(0,'#06060785');
  contact.addColorStop(1,'#04040700');
  ctx.fillStyle = contact;
  ctx.fillRect(-1,-1,2,2);
  ctx.restore();
  ctx.drawImage(atlas,(cell%3)*tileWidth,Math.floor(cell/3)*tileHeight,tileWidth,tileHeight,
    x-width/2,y-height*.93,width,height);
}

export function paintBay(ctx,plan,bay,zone=bay.zone) {
  if (plan.original) return;
  const {u,v,x,y} = bay;
  const color = zone==='service' ? '#f3b476ba' : '#b9cfca8a';
  const corners = [[u-71,v-41],[u+71,v-41],[u+71,v+41],[u-71,v+41]];
  face(ctx,plan,corners,zone==='service'?'#2d3539':'#333c3b',color,1.8);
  if (zone==='service') {
    for (const a of [-60,60]) line(ctx,plan.project(u+a,v-40),plan.project(u+a,v+40),'#c48a57a6',4);
    face(ctx,plan,[[u-54,v+19],[u+42,v+19],[u+42,v+19,6],[u-54,v+19,6]],'#1a2023');
    face(ctx,plan,[[u-54,v-18,6],[u+42,v-18,6],[u+42,v+19,6],[u-54,v+19,6]],'#566068','#94918a',.9);
    face(ctx,plan,[[u-68,v-18],[u-54,v-18,6],[u-54,v+19,6],[u-68,v+19]],'#40464a','#777976',.8);
    line(ctx,plan.project(u-50,v+17,7),plan.project(u+41,v+17,7),'#ce874c',1.7);
  } else {
    line(ctx,plan.project(u-59,v+31),plan.project(u+59,v+31),'#d9e0caa8',1.25);
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.font = '700 13px system-ui';
  ctx.fillText(String(bay.index+1).padStart(2,'0'),x,y+27);
}

export function paintWorkshop(ctx,plan,atlas) {
  const backdrop = ctx.createRadialGradient(plan.width*.49,plan.height*.47,10,plan.width*.5,plan.height*.51,plan.width*.65);
  backdrop.addColorStop(0,'#353936');
  backdrop.addColorStop(1,'#141819');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0,0,plan.width,plan.height);
  if (plan.original && atlas) {
    ctx.drawImage(atlas,0,0,plan.width,plan.height);
    return;
  }
  if (plan.original) return;
  ctx.save();
  ctx.shadowColor = '#000a';
  ctx.shadowBlur = 23;
  ctx.shadowOffsetY = 17;
  face(ctx,plan,[[0,0],[plan.uSize,0],[plan.uSize,plan.vSize],[0,plan.vSize]],'#292f31');
  ctx.restore();
  floor(ctx,plan,atlas?.surfaces);
  wall(ctx,plan,plan.vSize,'v',plan.material==='center');
  wall(ctx,plan,plan.uSize,'u',['stone','center'].includes(plan.material));
  for (const bay of plan.bays) paintBay(ctx,plan,bay);
  if (atlas?.props) for (const [cell,u,v,width] of propPositions(plan)) drawProp(ctx,atlas.props,cell,...plan.project(u,v),width);
  const label = (name,v)=>{
    const [x,y] = plan.project(plan.uSize-75,v);
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(-Math.PI/6);
    ctx.fillStyle = '#e4cfabb5';
    ctx.font = '750 17px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(name,0,0);
    ctx.restore();
  };
  label('SERVİS',plan.serviceRows*113);
  label(plan.material==='concrete'?'PARK':'GALERİ',plan.vSize*.60);
}

const pendingPreviews = new WeakMap();

export async function drawGaragePreview(canvas,plan) {
  const pending = workshopArt(plan);
  const request = Symbol();
  pendingPreviews.set(canvas,request);
  const ctx = canvas.getContext('2d',{alpha:false});
  const draw = art=>{
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = '#171a1c';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    const scale = fitGarage(plan,canvas.width,canvas.height);
    ctx.setTransform(scale,0,0,scale,(canvas.width-plan.width*scale)/2,(canvas.height-plan.height*scale)/2);
    paintWorkshop(ctx,plan,art);
  };
  draw(null);
  const art = await pending;
  if (pendingPreviews.get(canvas)===request && art) draw(art);
}
