import { loadSprite, spriteKey } from './sprite.mjs?v=0.10';

const WIDTH = 1536;
const HEIGHT = 1024;
const BAYS = [[588, 618], [1016, 740]];
const SPRITE_WIDTH = 402;
const MAX_ZOOM = 2.5;
const MOBILE_FIT = 1.20;
const DESKTOP_FIT = .955;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createGarageRenderer(scene, openBike) {
  const canvas = scene.querySelector('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  const hotspots = [...scene.querySelectorAll('.bike-target')];
  const zoomIn = document.getElementById('zoom-in');
  const zoomOut = document.getElementById('zoom-out');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const sprites = new Map();
  const pointers = new Map();
  let workshop;
  let bikes = [];
  let bayOffset = 0;
  let branchId;
  let transitions = [];
  let frame = 0;
  let lastPaint = 0;
  let visible = true;
  let width = 0;
  let height = 0;
  let zoom = 1;
  let fit = DESKTOP_FIT;
  let minZoom = 1;
  let centerX = WIDTH / 2;
  let centerY = HEIGHT / 2;
  let gesture = false;
  let blockClickUntil = 0;

  function loadImage(url, ready, fail) {
    const image = new Image();
    image.onload = () => { ready(image); invalidate(); };
    image.onerror = fail;
    image.src = url;
  }

  loadImage(new URL('./assets/workshop.webp?v=0.10', import.meta.url).href, image => {
    workshop = image;
    scene.dataset.ready = 'true';
  }, () => { scene.querySelector('.scene-status').textContent = 'Atölye görseli yüklenemedi.'; });

  function scale() {
    return Math.min(width / WIDTH, height / HEIGHT) * fit * zoom;
  }

  function updateControls() {
    zoomIn.disabled = zoom >= MAX_ZOOM;
    zoomOut.disabled = zoom <= minZoom;
    scene.dataset.zoomed = String(fit * zoom > 1);
    document.querySelector('.zoom-value').textContent = `%${Math.round(zoom * 100)}`;
  }

  function constrain() {
    const s = scale();
    if (!s) return;
    const halfW = Math.min(WIDTH / 2, width / (2 * s));
    const halfH = Math.min(HEIGHT / 2, height / (2 * s));
    centerX = clamp(centerX, halfW, WIDTH - halfW);
    centerY = clamp(centerY, halfH, HEIGHT - halfH);
  }

  function setZoom(value, anchorX = width / 2, anchorY = height / 2) {
    const before = scale();
    if (!before) return;
    zoom = clamp(value, minZoom, MAX_ZOOM);
    const after = scale();
    centerX += (anchorX - width / 2) * (1 / before - 1 / after);
    centerY += (anchorY - height / 2) * (1 / before - 1 / after);
    constrain();
    updateControls();
    invalidate();
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    if (!width || !height) return;
    fit = matchMedia('(max-width: 520px)').matches ? MOBILE_FIT : DESKTOP_FIT;
    minZoom = DESKTOP_FIT / fit;
    zoom = clamp(zoom, minZoom, MAX_ZOOM);
    updateControls();
    const pixelRatio = Math.min(devicePixelRatio || 1, 3, Math.sqrt(2_400_000 / (width * height)));
    const pixelsWide = Math.round(width * pixelRatio);
    const pixelsHigh = Math.round(height * pixelRatio);
    if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
      canvas.width = pixelsWide;
      canvas.height = pixelsHigh;
    }
    constrain();
    invalidate();
  }

  function invalidate() {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(render);
  }

  function render(now) {
    frame = 0;
    if (!width || !height) return;
    const s = scale();
    const ox = width / 2 - centerX * s;
    const oy = height / 2 - centerY * s;
    const ratioX = canvas.width / width;
    const ratioY = canvas.height / height;
    context.setTransform(1,0,0,1,0,0);
    context.fillStyle = '#171a1c';
    context.fillRect(0,0,canvas.width,canvas.height);
    context.setTransform(s * ratioX,0,0,s * ratioY,ox * ratioX,oy * ratioY);
    if (workshop) context.drawImage(workshop,0,0,WIDTH,HEIGHT);

    transitions = transitions.filter(item => now - item.start < 740 && !reducedMotion.matches);
    const moving = new Set(transitions.map(item => item.bike.id));
    const objects = [
      ...bikes.filter(bike => !moving.has(bike.id)).map(bike => ({bike})),
      ...transitions,
    ].sort((a,b) => a.bike.slot - b.bike.slot);
    for (const {bike,action,start} of objects) {
      const [px,py] = BAYS[bike.slot - bayOffset];
      const progress = clamp((now - start) / 740, 0, 1);
      const distance = action === 'buy' ? (1 - progress) ** 2 : action === 'sell' ? progress ** 2 : 0;
      const x = px - distance * 310;
      const y = py + distance * 136;
      const url = spriteKey(bike);
      const sprite = sprites.get(url);
      if (workshop) {
        context.save();
        context.globalAlpha = 1 - distance;
        if (sprite) drawBike(context,sprite.image,x,y);
        else if (!url || sprite === false) {
          context.fillStyle = '#1b1e21';
          context.fillRect(x - 139,y - 150,278,59);
          context.fillStyle = '#f1c99f';
          context.textAlign = 'center';
          context.font = '30px system-ui';
          context.fillText('Görsel yüklenemedi',x,y - 111);
        }
        if (bike.stage === 'repairing') drawRepair(context,x,y,lastPaint,!reducedMotion.matches);
        context.restore();
      }
      const hotspot = hotspots[bike.slot - bayOffset];
      if (action !== 'sell') {
        hotspot.style.setProperty('--target-x', `${ox + x * s}px`);
        hotspot.style.setProperty('--target-y', `${oy + (y - 160) * s}px`);
        hotspot.style.setProperty('--target-width', `${Math.max(44, SPRITE_WIDTH * s)}px`);
        hotspot.style.setProperty('--target-height', `${Math.max(44, 340 * s)}px`);
      }
    }

    if (!reducedMotion.matches && (transitions.length || bikes.some(bike => bike.stage === 'repairing'))) {
      frame = requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    if (now - lastPaint < 32) {
      frame = requestAnimationFrame(tick);
      return;
    }
    lastPaint = now;
    render(now);
  }

  function track(event) {
    const box = canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  function pair() {
    const [a,b] = pointers.values();
    return { x: (a.x+b.x)/2, y: (a.y+b.y)/2, distance: Math.hypot(a.x-b.x,a.y-b.y) };
  }

  scene.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointers.set(event.pointerId, track(event));
    if (pointers.size > 1) gesture = true;
  });
  scene.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const next = track(event);
    const pinch = pointers.size === 2;
    const before = pinch ? pair() : null;
    if (!gesture && Math.hypot(next.x-previous.x,next.y-previous.y) < 5) return;
    pointers.set(event.pointerId,next);
    gesture = true;
    if (pinch) {
      const after = pair();
      if (before.distance > 4) setZoom(zoom * after.distance / before.distance, before.x, before.y);
      shift(after.x-before.x, after.y-before.y);
    } else if (pointers.size === 1) {
      shift(next.x-previous.x,next.y-previous.y);
    }
    if (!scene.hasPointerCapture(event.pointerId)) scene.setPointerCapture(event.pointerId);
  });

  function shift(dx,dy) {
    const s = scale();
    if (!s || fit * zoom <= 1) return;
    centerX -= dx / s;
    centerY -= dy / s;
    constrain();
    invalidate();
  }

  function finishPointer(event) {
    if (event.type === 'lostpointercapture' && event.target !== scene) return;
    if (!pointers.delete(event.pointerId)) return;
    if (gesture) blockClickUntil = performance.now() + 350;
    if (!pointers.size) gesture = false;
  }
  for (const type of ['pointerup','pointercancel','lostpointercapture','pointerleave']) {
    scene.addEventListener(type, finishPointer);
  }
  hotspots.forEach((button, slot) => button.addEventListener('click', event => {
    if (event.detail && performance.now() < blockClickUntil) return;
    const bike = bikes.find(item => item.slot - bayOffset === slot);
    if (bike) openBike(bike);
  }));
  zoomIn.addEventListener('click', () => setZoom(zoom * 1.25));
  zoomOut.addEventListener('click', () => setZoom(zoom / 1.25));
  document.getElementById('zoom-reset').addEventListener('click', () => {
    centerX = WIDTH / 2;
    centerY = HEIGHT / 2;
    setZoom(1);
  });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncVisibility();
      if (visible) resize();
    }).observe(scene);
  }
  document.addEventListener('visibilitychange', syncVisibility);
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', invalidate);
  else reducedMotion.addListener(invalidate);

  function syncVisibility() {
    if (!visible || document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    invalidate();
  }

  resize();
  updateControls();
  return (garage, action, animationBike, offset, officeId) => {
    if (branchId !== officeId || bayOffset !== offset) {
      branchId = officeId;
      bayOffset = offset;
      transitions = [];
    }
    bikes = garage;
    document.querySelector('.camera-hint').textContent = bikes.length ? 'Motosiklete dokun' : 'İki parmakla yakınlaştır';
    transitions = transitions.filter(item => item.action === 'sell'
      || garage.some(bike => bike.id === item.bike.id && bike.stage === item.bike.stage));
    if (animationBike && !reducedMotion.matches) {
      transitions = [...transitions.filter(item => item.bike.id !== animationBike.id),
        {bike:animationBike,action,start:performance.now()}];
    }
    const visibleKeys = new Set([...garage,...transitions.map(item => item.bike)].map(spriteKey));
    for (const key of sprites.keys()) {
      if (!visibleKeys.has(key)) sprites.delete(key);
    }
    for (const bike of garage) {
      const url = spriteKey(bike);
      if (url && !sprites.has(url)) {
        sprites.set(url,null);
        loadSprite(bike).then(image => {
          if (!sprites.has(url)) return;
          sprites.set(url,image ?? false);
          invalidate();
        });
      }
    }
    hotspots.forEach((button, slot) => {
      const bike = bikes.find(item => item.slot - bayOffset === slot);
      button.hidden = !bike;
      if (bike) button.setAttribute('aria-label', `${bike.name} yakın plan`);
    });
    resize();
  };
}

function drawBike(ctx,image,x,y) {
  const h = SPRITE_WIDTH * (image.naturalHeight ?? image.height) / (image.naturalWidth ?? image.width);
  ctx.translate(x,y);
  ctx.rotate(-.36);
  // Compress the radial gradient to a soft contact shadow along the lift.
  ctx.save();
  ctx.scale(173,23);
  const contact = ctx.createRadialGradient(0,0,0,0,0,1);
  contact.addColorStop(0,'#06080bcf');
  contact.addColorStop(.55,'#06080b88');
  contact.addColorStop(1,'#06080b00');
  ctx.fillStyle = contact;
  ctx.fillRect(-1,-1,2,2);
  ctx.restore();
  ctx.drawImage(image,-SPRITE_WIDTH/2,-h*.91,SPRITE_WIDTH,h);
  ctx.rotate(.36);
  ctx.translate(-x,-y);
}

function drawRepair(ctx,x,y,now,animate) {
  const phase = animate ? Math.sin(now / 104) : 0;
  const px = x + 46;
  const py = y - 46;
  if (phase > .3) {
    const light = ctx.createRadialGradient(px,py,2,px,py,45);
    light.addColorStop(0,'#fff2d9');
    light.addColorStop(.2,'#ffba66dd');
    light.addColorStop(1,'#f9823200');
    ctx.fillStyle = light;
    ctx.fillRect(px-45,py-45,90,90);
    ctx.strokeStyle = '#ffe09d';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i=0;i<6;i+=1) {
      const angle = i*.63 + phase*.4;
      ctx.moveTo(px + Math.cos(angle)*10,py + Math.sin(angle)*10);
      ctx.lineTo(px + Math.cos(angle)*(28+i*3),py + Math.sin(angle)*(28+i*3));
    }
    ctx.stroke();
  }
  ctx.fillStyle = '#ffc387';
  ctx.fillRect(px-3,py+22,6,7);
}
