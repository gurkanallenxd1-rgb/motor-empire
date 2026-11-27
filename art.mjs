import { loadSprite, spriteKey } from './sprite.mjs?v=0.16.1';
import { bikeBounds, fitGarage, garageBikeAt } from './garage-layout.mjs?v=0.16.1';
import { paintBay, paintStation, paintWorkshop, workshopArt } from './garage-scene.mjs?v=0.16.1';

const clamp = (value,min,max)=>Math.min(max,Math.max(min,value));
const activeRepair = new Set(['repairing','claiming','internalRepair']);

export function createGarageRenderer(scene,openBike) {
  const canvas = scene.querySelector('canvas');
  const context = canvas.getContext('2d',{alpha:false});
  const zoomIn = document.getElementById('zoom-in');
  const zoomOut = document.getElementById('zoom-out');
  const output = document.querySelector('.zoom-value');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointers = new Map();
  const sprites = new Map();
  const queued = new Map();
  let loads = 0;
  let layout;
  let branch;
  let background;
  let art;
  let raster = 1;
  let zones = new Map();
  let zoneKey = "";
  let parking = [];
  let overview = '';
  let signature = '';
  let motion;
  let visible = true;
  let frame = 0;
  let width = 0;
  let height = 0;
  let zoom = 1;
  let fit = 0;
  let maxZoom = 3;
  let centerX = 0;
  let centerY = 0;
  let gesture = false;

  const scale = ()=>fit*zoom;

  function invalidate() {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(render);
  }

  function updateControls() {
    zoomIn.disabled = zoom>=maxZoom;
    zoomOut.disabled = zoom<=1;
    scene.dataset.zoomed = String(zoom>1);
    output.textContent = `%${Math.round(zoom*100)}`;
  }

  function constrain() {
    const s = scale();
    if (!s) return;
    const halfX = Math.min(layout.width/2,width/(2*s));
    const halfY = Math.min(layout.height/2,height/(2*s));
    centerX = clamp(centerX,halfX,layout.width-halfX);
    centerY = clamp(centerY,halfY,layout.height-halfY);
  }

  function zoomAt(value,x=width/2,y=height/2) {
    const before = scale();
    if (!before) return;
    zoom = clamp(value,1,maxZoom);
    const anchor = 1/before-1/scale();
    centerX += (x-width/2)*anchor;
    centerY += (y-height/2)*anchor;
    constrain();
    updateControls();
    invalidate();
  }

  function shift(x,y) {
    if (zoom<=1) return;
    const s = scale();
    centerX -= x/s;
    centerY -= y/s;
    constrain();
    invalidate();
  }

  function reset() {
    centerX = layout.width/2;
    centerY = layout.height/2;
    zoomAt(1);
  }

  function resize() {
    if (!layout) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height || (width===bounds.width && height===bounds.height)) return;
    width = bounds.width;
    height = bounds.height;
    fit = fitGarage(layout,width,height);
    maxZoom = clamp(156/(layout.bikeWidth*fit),5,16);
    zoom = clamp(zoom,1,maxZoom);
    const dpr = Math.min(devicePixelRatio || 1,3,Math.sqrt(2_000_000/(width*height)));
    canvas.width = Math.round(width*dpr);
    canvas.height = Math.round(height*dpr);
    constrain();
    updateControls();
    invalidate();
  }

  function cacheBackground(next) {
    if (!background) background = document.createElement('canvas');
    art = undefined;
    raster = next.original ? 1 : Math.min(2,Math.sqrt(5_000_000/(next.width*next.height)));
    background.width = Math.ceil(next.width*raster);
    background.height = Math.ceil(next.height*raster);
    workshopArt(next).then(asset=>{
      if (layout!==next || !asset) return;
      art = asset;
      paintBackground();
      invalidate();
    });
  }

  function paintBackground() {
    const ctx = background.getContext('2d',{alpha:false});
    ctx.setTransform(raster,0,0,raster,0,0);
    ctx.imageSmoothingQuality = 'high';
    paintWorkshop(ctx,layout,art);
    if (!layout.original) for (const bay of layout.bays) {
      const zone = zones.get(bay.index) ?? bay.zone;
      if (zone!==bay.zone) paintBay(ctx,layout,bay,zone);
      paintStation(ctx,layout,bay,zone,art?.architecture);
    }
  }

  function loadQueued() {
    while (loads<4 && queued.size) {
      const [key,bike] = queued.entries().next().value;
      queued.delete(key);
      if (!sprites.has(key)) continue;
      loads++;
      loadSprite(bike).then(sprite=>{
        if (!sprites.has(key)) return;
        sprites.set(key,sprite ? sceneSprite(sprite.image) : false);
        invalidate();
      }).finally(()=>{loads--;loadQueued();});
    }
  }

  function sceneSprite(image) {
    const w = image.naturalWidth ?? image.width;
    const h = image.naturalHeight ?? image.height;
    const limit = layout?.bays.length<=5 ? 640 : 480;
    if (w<=limit) return image;
    const imageCanvas = document.createElement('canvas');
    imageCanvas.width = limit;
    imageCanvas.height = Math.round(h*limit/w);
    imageCanvas.getContext('2d').drawImage(image,0,0,imageCanvas.width,imageCanvas.height);
    return imageCanvas;
  }

  function syncSprites() {
    const stock = [...parking,...(motion?.action==='sell' ? [motion.entry] : [])];
    const keys = new Set(stock.map(entry=>entry.key));
    for (const key of sprites.keys()) if (!keys.has(key)) sprites.delete(key);
    for (const key of queued.keys()) if (!keys.has(key)) queued.delete(key);
    for (const {key,bike} of stock) if (key && !sprites.has(key)) {
      sprites.set(key,null);
      queued.set(key,bike);
    }
    loadQueued();
  }

  function render(now) {
    frame = 0;
    if (!width || !height || !layout) return;
    const s = scale();
    const ox = width/2-centerX*s;
    const oy = height/2-centerY*s;
    const rx = canvas.width/width;
    const ry = canvas.height/height;
    context.setTransform(1,0,0,1,0,0);
    context.fillStyle = '#171a1c';
    context.fillRect(0,0,canvas.width,canvas.height);
    context.setTransform(s*rx,0,0,s*ry,ox*rx,oy*ry);
    const left = Math.max(0,-ox/s), top = Math.max(0,-oy/s);
    const right = Math.min(layout.width,(width-ox)/s), bottom = Math.min(layout.height,(height-oy)/s);
    context.imageSmoothingQuality = 'high';
    context.drawImage(background,left*raster,top*raster,(right-left)*raster,(bottom-top)*raster,left,top,right-left,bottom-top);
    const progress = motion ? clamp((now-motion.start)/530,0,1) : 1;
    if (progress===1 && motion) {
      motion = undefined;
      syncSprites();
    }
    const objects = motion?.action==='sell'
      ? [...parking,motion.entry].sort((a,b)=>a.bay.y-b.bay.y) : parking;
    for (const entry of objects) {
      const {bay,bike,key} = entry;
      const bounds = bikeBounds(layout,bay);
      if (!layout.original && (bounds.right<left || bounds.left>right || bounds.bottom<top || bounds.top>bottom)) continue;
      const moving = motion?.entry.bike.id===bike.id;
      const opacity = moving ? (motion.action==='sell' ? 1-progress : progress) : 1;
      const dx = moving ? (1-opacity)*layout.bikeWidth*.12 : 0;
      drawBike(context,sprites.get(key),bay.x-dx,bay.y+dx*.36,layout.bikeWidth,bike.stage,opacity,layout.original);
    }
    if (motion) invalidate();
  }

  function point(event) {
    const box = canvas.getBoundingClientRect();
    return {x:event.clientX-box.left,y:event.clientY-box.top};
  }

  function pair() {
    const [a,b] = pointers.values();
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)};
  }

  function select(point) {
    const s = scale();
    const x = centerX+(point.x-width/2)/s;
    const y = centerY+(point.y-height/2)/s;
    const bike = garageBikeAt(layout,parking,x,y);
    if (bike) openBike(bike);
  }

  canvas.addEventListener('pointerdown',event=>{
    if (event.pointerType==='mouse' && event.button!==0) return;
    pointers.set(event.pointerId,point(event));
    if (pointers.size>1) gesture = true;
    if (event.isTrusted) canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    const last = pointers.get(event.pointerId);
    if (!last) return;
    const next = point(event);
    if (!gesture && Math.hypot(next.x-last.x,next.y-last.y)<5) return;
    const pinch = pointers.size>=2;
    const before = pinch ? pair() : null;
    gesture = true;
    pointers.set(event.pointerId,next);
    if (pinch) {
      const after = pair();
      if (before.distance>3) zoomAt(zoom*after.distance/before.distance,before.x,before.y);
      shift(after.x-before.x,after.y-before.y);
    } else shift(next.x-last.x,next.y-last.y);
  });
  function release(event) {
    if (!pointers.delete(event.pointerId)) return;
    if (event.type==='pointerup' && !gesture) select(point(event));
    if (!pointers.size) gesture = false;
  }
  for (const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name,release);
  canvas.addEventListener('keydown',event=>{
    const shifts = {ArrowLeft:[64,0],ArrowRight:[-64,0],ArrowUp:[0,64],ArrowDown:[0,-64]};
    if (shifts[event.key]) shift(...shifts[event.key]);
    else if (event.key==='+' || event.key==='=') zoomAt(zoom*1.33);
    else if (event.key==='-') zoomAt(zoom/1.33);
    else if (event.key==='Home') reset();
    else return;
    event.preventDefault();
  });

  zoomIn.addEventListener('click',()=>zoomAt(zoom*1.33));
  zoomOut.addEventListener('click',()=>zoomAt(zoom/1.33));
  document.getElementById('zoom-reset').addEventListener('click',reset);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize',resize);
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry])=>{
    visible = entry.isIntersecting;
    syncVisibility();
    if (visible) resize();
  }).observe(scene);
  document.addEventListener('visibilitychange',syncVisibility);

  function syncVisibility() {
    if (!visible || document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    invalidate();
  }

  return (garage,action,animationBike,next,officeId)=>{
    const floorChanged = layout!==next;
    const changed = floorChanged || branch!==officeId;
    const last = animationBike && parking.find(entry=>entry.bike.id===animationBike.id);
    if (changed) {
      if (floorChanged) cacheBackground(next);
      layout = next;
      branch = officeId;
      zoom = 1;
      centerX = next.width/2;
      centerY = next.height/2;
      if (width) {
        fit = fitGarage(next,width,height);
        maxZoom = clamp(156/(next.bikeWidth*fit),5,16);
      }
      motion = undefined;
      updateControls();
    }
    parking = garage.map(entry=>({...entry,key:spriteKey(entry.bike)}));
    zones = new Map(parking.filter(({bay,zone})=>bay.zone!==zone).map(({bay,zone})=>[bay.index,zone]));
    const nextZoneKey = JSON.stringify([...zones]);
    if (floorChanged || nextZoneKey!==zoneKey) {
      zoneKey = nextZoneKey;
      paintBackground();
    }
    const fingerprint = JSON.stringify(parking.map(({bike,bay,key})=>[bike.id,bike.stage,bay.index,key]));
    if (animationBike && !reducedMotion.matches) {
      const animated = action==='sell' && !changed ? last : action==='buy' ? parking.find(entry=>entry.bike.id===animationBike.id) : null;
      if (animated) motion = {entry:animated,start:performance.now(),action};
    }
    if (changed || fingerprint!==signature || motion) {
      signature = fingerprint;
      syncSprites();
      invalidate();
    }
    const label = `${layout.name} · ${layout.area.toLocaleString('tr-TR')} m² · ${parking.length}/${layout.bays.length} parkta`;
    if (overview!==label) {
      overview = label;
      document.querySelector('.garage-overview').textContent = label;
      canvas.setAttribute('aria-label',label+' · Ok tuşlarıyla gezin, artı ve eksiyle yakınlaştır');
    }
    resize();
  };
}

function drawBike(ctx,image,x,y,width,stage,opacity,original) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x,y);
  ctx.rotate(original ? -.36 : -.13);
  ctx.save();
  if (!original) ctx.rotate(.10);
  function shadow(x,y,w,h,opacity) {
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(w,h);
    const gradient = ctx.createRadialGradient(0,0,.12,0,0,1);
    gradient.addColorStop(0,`rgba(5,8,10,${opacity})`);
    gradient.addColorStop(.52,`rgba(5,8,10,${opacity*.46})`);
    gradient.addColorStop(1,'#05080a00');
    ctx.fillStyle = gradient;
    ctx.fillRect(-1,-1,2,2);
    ctx.restore();
  }
  shadow(width*.065,width*.037,width*.51,width*.137,.58);
  shadow(-width*.27,width*.02,width*.16,width*.070,.84);
  shadow(width*.28,width*.035,width*.16,width*.066,.87);
  ctx.restore();
  if (image) {
    const h = Math.min(width*.85,width*(image.naturalHeight ?? image.height)/(image.naturalWidth ?? image.width));
    ctx.drawImage(image,-width/2,-h*.90,width,h);
  } else {
    ctx.fillStyle = '#e2b88e';
    ctx.textAlign = 'center';
    ctx.font = `700 ${width*.115}px system-ui`;
    ctx.fillText(image===false ? 'Görsel yok' : '⋯',0,-width*.19);
  }
  if (activeRepair.has(stage) || stage==='listed') {
    ctx.beginPath();
    ctx.arc(-width*.38,-width*.13,width*.036,0,2*Math.PI);
    ctx.fillStyle = activeRepair.has(stage)?'#ffb569':'#9ee4b8';
    ctx.fill();
  }
  ctx.restore();
}
