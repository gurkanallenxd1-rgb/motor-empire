import { GARAGE_CAMERA,tapGesture } from './camera.mjs?v=0.17.0.1';
import * as T from './vendor/three.module.min.js';
import { OrbitControls,RoomEnvironment } from './vendor/addons.mjs';
import { createAssets,DISPLAY_PLINTH,spriteTexture } from './assets.mjs?v=0.17-r2';
import { initialQuality,qualityProfile,worldBays } from './config.mjs?v=0.17-r2';
import { buildWorkshop } from './garage.mjs?v=0.17-r2';
import { motorcycleAsset } from './registry.mjs?v=0.17-r2';
import { modelOf } from '../bikes.mjs?v=0.16.1';
import { loadSprite,spriteKey } from '../sprite.mjs?v=0.16.1';

const offset = new T.Vector3(15,17,21);
const inspectOffset = new T.Vector3(2.6,1.5,3.4);

export function createRenderer(canvas,settings,callbacks,{inspection=false}={}) {
  const context = canvas.getContext('webgl2',{alpha:false,antialias:settings.aa,powerPreference:'low-power'});
  if (!context || context.isContextLost()) throw new Error('WebGL 2 kullanılamıyor.');
  const renderer = new T.WebGLRenderer({canvas,context});
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.24;
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.type=T.PCFShadowMap;
  const scene = new T.Scene();
  scene.background=new T.Color(0x191c20);
  const ambient = new T.HemisphereLight(0xfff4e3,0x655e56,1.42);
  scene.add(ambient);
  const sun=new T.DirectionalLight(0xffe5c6,2.6);
  sun.position.set(-6,11,7);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-12,right:12,top:10,bottom:-11,near:1,far:40});
  sun.shadow.normalBias=.034;
  scene.add(sun);
  const cool=new T.DirectionalLight(0xafdcff,.9);
  cool.position.set(7,6,-6);scene.add(cool);
  const camera = new T.PerspectiveCamera(39,1,.07,110);
  const controls = new OrbitControls(camera,canvas);
  controls.enableDamping=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.minPolarAngle=inspection?.21:GARAGE_CAMERA.minPolar;
  controls.maxPolarAngle=inspection?1.5:GARAGE_CAMERA.maxPolar;
  controls.minDistance=inspection?1.35:GARAGE_CAMERA.near;
  controls.maxDistance=inspection?8:GARAGE_CAMERA.far;
  controls.dampingFactor=.14;
  controls.zoomToCursor=false;
  controls.rotateSpeed=.65;
  controls.panSpeed=.6;
  controls.zoomSpeed=.9;
  controls.enablePan=!inspection;
  const assets=createAssets(renderer);
  const workshop=inspection?null:buildWorkshop(scene);
  const stock=new T.Group();
  const rows=new Map();
  scene.add(stock);
  let envTarget;
  const garageBatches=[];
  const targetMin=new T.Vector3(inspection?-.4:-GARAGE_CAMERA.targetX,inspection?0:.2,inspection?-.4:-GARAGE_CAMERA.targetZ);
  const targetMax=new T.Vector3(inspection?.4:GARAGE_CAMERA.targetX,inspection?1.4:1.2,inspection?.4:GARAGE_CAMERA.targetZ);
  const clamped=new T.Vector3();
  const correction=new T.Vector3();
  let frame=0,lastFrame=-Infinity,alive=true,lost=false,active=true,intersecting=true;
  let automatic=initialQuality({memory:navigator.deviceMemory,cores:navigator.hardwareConcurrency});
  let profile;
  let missed=0;
  let measuring=false;
  let targetAnimation;
  let lastMeasure=0;
  const gesture=tapGesture();
  const shadowGeometry=new T.CircleGeometry(.65,20);
  const shadowMaterial=new T.MeshBasicMaterial({color:0x292321,transparent:true,opacity:.27,depthWrite:false});

  function reflections(enabled) {
    if (!enabled) {
      scene.environment=null;
      envTarget?.dispose();
      envTarget=undefined;
      return;
    }
    if (envTarget || lost) return;
    const room = new RoomEnvironment();
    const generator = new T.PMREMGenerator(renderer);
    envTarget = generator.fromScene(room,.06);
    scene.environment=envTarget.texture;
    generator.dispose();
    room.dispose();
  }

  function resize() {
    if (!alive || lost) return;
    const {clientWidth:w,clientHeight:h}=canvas;
    if (!w || !h) return;
    const ratio=Math.min(devicePixelRatio || 1,profile.dpr,Math.sqrt(1_750_000/(w*h)));
    renderer.setPixelRatio(ratio);
    renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();
    invalidate();
  }

  function updateOptions(value) {
    settings=value;
    const before=profile;
    profile=qualityProfile(settings,automatic);
    reflections(profile.reflection>0);
    scene.environmentIntensity=profile.reflection;
    renderer.shadowMap.enabled=Boolean(profile.shadow);
    sun.castShadow=Boolean(profile.shadow);
    if (before?.shadow!==profile.shadow) {
      sun.shadow.map?.dispose();
      sun.shadow.map=null;
      if (profile.shadow) sun.shadow.mapSize.set(profile.shadow,profile.shadow);
    }
    workshop?.texture(profile.texture);
    for (const root of rows.values()) {
      const lod=root.userData.lod;
      if (lod) lod.levels[1].distance=profile.lod;
    }
    renderer.shadowMap.needsUpdate=true;
    canvas.dataset.quality=profile.name;
    if (!settings.meter) callbacks.measure?.(null);
    resize();
  }

  function invalidate() {
    if (alive && active && intersecting && !lost && !document.hidden && !frame) frame=requestAnimationFrame(draw);
  }

  function reset(animated=false) {
    moveTo(new T.Vector3(0,inspection?.7:.2,0),inspection?inspectOffset:offset,animated);
  }

  function moveTo(point,delta,animated) {
    if (!animated || !controls.enableDamping) {
      controls.target.copy(point);
      camera.position.copy(point).add(delta);
      controls.update();
    } else targetAnimation={start:performance.now(),target:point,position:point.clone().add(delta),
      oldTarget:controls.target.clone(),oldPosition:camera.position.clone()};
    invalidate();
  }

  function focus(point) {
    moveTo(point.clone().add(new T.Vector3(0,.54,0)),new T.Vector3(5.7,6,8.2),true);
  }

  function draw(now) {
    frame=0;
    if (document.hidden || lost || !active || !intersecting || !alive) return;
    if (now-lastFrame<1000/settings.fps-2) {invalidate();return;}
    if (targetAnimation) {
      const a=targetAnimation,p=Math.min(1,(now-a.start)/340);
      const smooth=p*p*(3-2*p);
      controls.target.lerpVectors(a.oldTarget,a.target,smooth);
      camera.position.lerpVectors(a.oldPosition,a.position,smooth);
      if (p===1) targetAnimation=undefined;else invalidate();
    }
    controls.update();
    clamped.copy(controls.target).clamp(targetMin,targetMax);
    camera.position.add(correction.subVectors(clamped,controls.target));
    controls.target.copy(clamped);
    if (!inspection) camera.position.y=Math.max(GARAGE_CAMERA.eyeY,camera.position.y);
    if (workshop?.cutaway(camera.position,controls.target)) renderer.shadowMap.needsUpdate=true;
    renderer.render(scene,camera);
    const elapsed=now-lastFrame;
    if (elapsed>0 && Number.isFinite(elapsed) && (measuring || targetAnimation)) {
      if (settings.meter && now-lastMeasure>245) {
        lastMeasure=now;
        callbacks.measure?.({fps:Math.round(1000/elapsed),triangles:renderer.info.render.triangles,
          textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries});
      }
      missed=elapsed>1000/settings.fps*1.42 ? missed+1 : Math.max(0,missed-1);
      if (settings.quality==='auto' && automatic!=='low' && missed>=18) {
        missed=0;automatic='low';updateOptions(settings);
      }
    }
    lastFrame=now;
  }

  const spriteMaps=new Map();
  function fallback(bike,root) {
    root.userData.fallback=true;
    const key=spriteKey(bike);
    if (!key) return;
    let entry=spriteMaps.get(key);
    if (!entry) {
      entry={refs:0,pending:loadSprite(bike).then(asset=>asset ? spriteTexture(asset.image) : null)};
      spriteMaps.set(key,entry);
    }
    entry.refs++;
    const previous=root.userData.release;
    root.userData.release=()=>{
      previous?.();
      if (--entry.refs===0) {
        spriteMaps.delete(key);
        entry.pending.then(map=>map?.dispose(),()=>{});
      }
    };
    entry.pending.then(map=>{
      if (!map || !alive || !root.parent) return;
      const sprite=new T.Sprite(new T.SpriteMaterial({map,transparent:true,alphaTest:.17,depthWrite:false,toneMapped:false}));
      const height=2.35*(map.image.naturalHeight ?? map.image.height)/(map.image.naturalWidth ?? map.image.width);
      sprite.scale.set(2.35,height,1);sprite.position.y=height*.47;
      root.add(sprite);
      countFallbacks();
      invalidate();
    },()=>{});
  }
  function countFallbacks() {
    const count=[...rows.values()].filter(row=>row.userData.fallback).length;
    canvas.dataset.fallbacks=String(count);
    callbacks.fallbacks?.(count);
  }

  function mountBike(bike,root) {
    const url=motorcycleAsset(modelOf(bike)?.id,bike.year,bike.color,bike.paintAccent);
    if (!url) {fallback(bike,root);return;}
    const handle=assets.acquire(new URL(url,import.meta.url).href);
    root.userData.release=handle.release;
    handle.model.then(model=>{
      if (!alive || !root.parent) return;
      model.traverse(node=>{if(node.isMesh) node.castShadow=node.receiveShadow=true;});
      const lod=new T.LOD();
      lod.addLevel(model,0);
      const distant=new T.Group();
      fallback(bike,distant);
      lod.addLevel(distant,profile.lod);
      root.userData.lod=lod;
      root.add(lod);
      if (inspection) callbacks.model?.();
      root.userData.release=()=>{handle.release();distant.userData.release?.();};
      renderer.shadowMap.needsUpdate=true;invalidate();
    },()=>{
      if (!alive || !root.parent) return;
      fallback(bike,root);countFallbacks();
      if (inspection) callbacks.modelFallback?.();
    });
  }

  function remove(root) {
    root.removeFromParent();
    root.userData.release?.();
    root.traverse(node=>{if(node.isSprite)node.material.dispose();});
  }

  function update(entries) {
    const incoming = new Set(entries.map(({bike})=>bike.id));
    for (const [id,root] of rows) if (!incoming.has(id)) {remove(root);rows.delete(id);}
    for (const {bike,bay,zone} of entries) {
      const [x,z]=inspection?[0,0]:worldBays[bay.index];
      const key=spriteKey(bike);
      let root=rows.get(bike.id);
      if (root && root.userData.sprite!==key) {remove(root);rows.delete(bike.id);root=null;}
      if (!root) {
        root=new T.Group();root.userData.sprite=key;
        stock.add(root);
        rows.set(bike.id,root);
        const shadow=new T.Mesh(shadowGeometry,shadowMaterial);
        shadow.position.y=.008;shadow.rotation.x=-Math.PI/2;shadow.scale.set(1.27,.50,1);
        root.add(shadow);
        mountBike(bike,root);
      }
      root.userData.bike=bike;
      root.userData.zone=zone;
      root.position.set(x,inspection?0:bay.index<3?.466:.109,z);
    }
    canvas.dataset.visibleBikes=String(rows.size);
    countFallbacks();
    renderer.shadowMap.needsUpdate=true;invalidate();
  }

  if (!inspection) {
    const plinth=assets.acquire(DISPLAY_PLINTH);
    plinth.model.then(template=>{
      if (!alive) return;
      const positions=worldBays.slice(3);
      const transform=new T.Matrix4();
      template.updateMatrixWorld(true);
      template.traverse(node=>{
        if (!node.isMesh) return;
        const batch=new T.InstancedMesh(node.geometry,node.material,positions.length);
        for (const [index,[x,z]] of positions.entries()) {
          transform.makeTranslation(x,.009,z).multiply(node.matrixWorld);
          batch.setMatrixAt(index,transform);
        }
        batch.castShadow=batch.receiveShadow=true;
        batch.computeBoundingSphere();
        scene.add(batch);
        garageBatches.push(batch);
      });
      canvas.dataset.glb='ready';
      renderer.shadowMap.needsUpdate=true;invalidate();
    },()=>{if(alive)canvas.dataset.glb='fallback';});
  }

  const raycaster=new T.Raycaster();
  const pointer=new T.Vector2();
  function up(event) {
    if (!gesture.up(event) || inspection) return;
    const rect=canvas.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    for (const hit of raycaster.intersectObjects(stock.children,true)) {
      let node=hit.object;
      while (node && !node.userData.bike) node=node.parent;
      if (node) { focus(node.position);callbacks.select?.(node.userData.bike);break; }
    }
  }

  function onLost(event) {
    event.preventDefault();lost=true;
    callbacks.status('lost');
    dispose();
    canvas.addEventListener('webglcontextrestored',()=>callbacks.status('restart'),{once:true});
  }
  const suppress=event=>event.preventDefault();
  const events={webglcontextlost:onLost,pointerdown:event=>gesture.down(event),
    pointermove:event=>gesture.move(event),pointerup:up,pointercancel:up,
    lostpointercapture:up,contextmenu:suppress,selectstart:suppress,dragstart:suppress};
  for (const [event,listener] of Object.entries(events)) canvas.addEventListener(event,listener);
  controls.addEventListener('change',invalidate);
  controls.addEventListener('start',()=>{measuring=true;targetAnimation=undefined;invalidate();});
  controls.addEventListener('end',()=>{measuring=false;});
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  const intersection=new IntersectionObserver(([entry])=>{intersecting=entry.isIntersecting;invalidate();});
  intersection.observe(canvas);
  document.addEventListener('visibilitychange',invalidate);
  updateOptions(settings);
  reset();
  function dispose() {
    if (!alive) return;
    alive=false;
    cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();
    document.removeEventListener('visibilitychange',invalidate);
    for (const [event,listener] of Object.entries(events)) canvas.removeEventListener(event,listener);
    controls.dispose();workshop?.dispose();
    for (const row of rows.values()) remove(row);
    rows.clear();
    for (const batch of garageBatches) {batch.removeFromParent();batch.dispose();}
    sun.shadow.map?.dispose();
    shadowGeometry.dispose();shadowMaterial.dispose();assets.dispose();envTarget?.dispose();
    renderer.dispose();
    if (!context.isContextLost()) renderer.forceContextLoss();
  }
  return {
    update,updateOptions,
    cameraState:()=>({eye:camera.position.toArray(),target:controls.target.toArray(),distance:camera.position.distanceTo(controls.target),
      hidden:workshop?.hiddenWalls()??[]}),
    reset:()=>reset(true),
    metrics:()=>({width:canvas.width,height:canvas.height,surface:workshop?.textureSize(),
      shadow:renderer.shadowMap.enabled?sun.shadow.mapSize.x:0,reflection:scene.environmentIntensity,
      environment:Boolean(scene.environment),aa:context.getContextAttributes()?.antialias,
      render:{...renderer.info.render},resources:{...renderer.info.memory}}),
    active(value){active=value;if(!value){cancelAnimationFrame(frame);frame=0;}invalidate();},
    dispose,
  };
}
