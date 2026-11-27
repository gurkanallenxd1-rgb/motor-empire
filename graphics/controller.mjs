import { graphicsOptions,prototypeAllowed,readGraphics,writeGraphics } from './config.mjs?v=0.17.0.1';
import { motorcycleAsset } from './registry.mjs?v=0.17.0.1';

const levelNames={low:'Düşük',medium:'Orta',high:'Yüksek',ultra:'Ultra'};

export function createGraphicsController({byId,select,refresh}) {
  const form=byId('graphics-form');
  const stage=byId('garage-3d');
  const host=byId('garage-3d-host');
  const legacy=byId('garage-scene');
  const legacyControls=legacy.nextElementSibling;
  const message=byId('graphics-message');
  const meter=byId('graphics-meter');
  const stockNote=byId('graphics-stock-note');
  const profileNote=byId('graphics-profile-note');
  function showProfile(p) {
    profileNote.textContent=`${p.auto?'Otomatik · ':''}${({low:'Düşük',medium:'Orta',high:'Yüksek',ultra:'Ultra'})[p.name]} · Üst piksel oranı ${p.dpr.toLocaleString('tr-TR')} · Doku ${p.texture}² · Gölge ${p.shadow||'kapalı'} · Yansıma %${Math.round(p.reflection*100)} · ${p.detail?'Yüzey ayrıntısı açık':'Temel yüzey'} · ${p.aa?'MSAA açık':'MSAA kapalı'} · ${p.fps} FPS sınırı`;
  }
  let storage;
  try {storage=window.localStorage;} catch {}
  let settings=readGraphics(storage);
  let garage;
  let detail;
  let engine;
  let requested=0;
  let detailRequest=0;
  let loading=false;
  let visible=false;
  let last;
  let failed=false;
  let contextLost=false;
  for (const [key,value] of Object.entries(settings)) {
    const field=form.elements.namedItem(key);
    if (typeof value==='boolean') field.checked=value;
    else field.value=value;
  }

  function display(enabled) {
    stage.hidden=!enabled;
    legacy.hidden=enabled;
    legacyControls.hidden=enabled;
  }

  function stop() {
    requested++;
    loading=false;
    contextLost=false;
    garage?.dispose();
    garage=undefined;
    host.replaceChildren();
    profileNote.textContent='';
    display(false);
  }

  function status(value) {
    if (value==='restart') {
      if (!contextLost) return;
      stop();
      refresh();
      return;
    }
    if (value==='failed') {
      failed=true;stop();
      message.textContent='WebGL yeniden başlatılamadı. 2D garaj açık.';
    } else if (value==='lost') {
      contextLost=true;display(false);
      message.textContent='WebGL bağlantısı kesildi. Kurtarma sırasında 2D garaj açık.';
    } else {
      contextLost=false;display(true);
      message.textContent='Deneysel 3D Garaj · Motosikletler özgün 2D görselleriyle temsil edilebilir.';
    }
    stage.dataset.renderer=value;
    refresh();
  }

  function measure(value) {
    meter.hidden=!settings.meter;
    meter.textContent=value
      ? `${value.fps} FPS · ${value.triangles.toLocaleString('tr-TR')} üçgen · ${value.textures} doku`
      : 'FPS · Ölçüm için kamerayı hareket ettir';
    const canvas=host.querySelector('canvas');
    if (canvas && value) canvas.dataset.measure=JSON.stringify(value);
  }

  function module() {
    engine ??= import('./renderer.mjs?v=0.17.0.1').catch(error=>{engine=null;throw error;});
    return engine;
  }

  function show(parking,capacity,branch) {
    visible=true;
    const items=JSON.stringify(parking.map(({bike,bay,zone})=>[bike.id,bike.stage,bike.color,bike.paintAccent,bay.index,zone]));
    const changed=last?.branch!==branch || last?.items!==items;
    last={parking,capacity,branch,items};
    if (!prototypeAllowed(settings,capacity)) {
      if (garage || loading) stop();
      message.textContent=settings.mode==='3d'?'Deneysel 3D, 10 bölmeli şubelerde kullanılabilir. 2D garaj açık.':'2D garaj açık.';
      return false;
    }
    if (garage) {
      if (changed && !contextLost) garage.update(parking);
      return !contextLost;
    }
    if (failed || loading) return false;
    loading=true;
    const token=++requested;
    message.textContent='3D hazırlanıyor. 2D garaj açık.';
    module().then(({createRenderer})=>{
      if (token!==requested || !visible) return;
      // Make the canvas measurable during initialization; reveal it only on success.
      stage.hidden=false;
      const canvas=document.createElement('canvas');
      canvas.id='garage-webgl';
      canvas.setAttribute('aria-label','Deneysel 3D garaj');
      host.replaceChildren(canvas);
      garage=createRenderer(canvas,settings,{select:b=>{
        const current=last.parking.find(({bike})=>bike.id===b.id);
        if (current) select(current.bike,true);
      },status:value=>{if (token===requested && visible) status(value);},measure,profile:showProfile,fallbacks:count=>{
        stockNote.hidden=!count;
        stockNote.textContent=count ? `${count} motosiklet özgün 2D görseliyle gösteriliyor.` : '';
      }});
      loading=false;
      garage.update(last.parking);
      measure(null);
      status('ready');
    }).catch(()=>{
      if (token!==requested) return;
      failed=true;stop();
      stage.dataset.renderer='unavailable';
      message.textContent='WebGL 2 veya 3D kaynakları kullanılamıyor. 2D garaj açık.';
      refresh();
    });
    return false;
  }

  form.addEventListener('change',()=>{
    const raw={};
    for (const key of Object.keys(settings)) {
      const field=form.elements.namedItem(key);
      raw[key]=field.type==='checkbox'?field.checked:key==='fps'?Number(field.value):field.value;
    }
    const next=graphicsOptions(raw);
    if (settings.aa!==next.aa || settings.mode!==next.mode) stop();
    settings=next;failed=false;
    writeGraphics(storage,settings);
    if (garage && !contextLost) garage.updateOptions(settings);
    if (visible && last) refresh();
  });
  byId('graphics-reset-camera').addEventListener('click',()=>garage?.reset());
  byId('graphics-reset-detail').addEventListener('click',()=>detail?.reset());
  byId('bike-detail').addEventListener('close',()=>{
    detailRequest++;
    detail?.dispose();detail=undefined;
    byId('graphics-detail').hidden=true;
    garage?.active(true);
  });
  function inspect(bike,model,requested3d) {
    const statusNode=byId('graphics-detail-status');
    statusNode.hidden=!requested3d;
    if (!requested3d) return;
    const path=motorcycleAsset(model?.id,bike.year,bike.color,bike.paintAccent);
    statusNode.textContent=path ? '3D model yükleniyor…' : 'Bu varyant için doğrulanmış 3D model yok. Özgün 2D görsel gösteriliyor.';
    if (!path) return;
    const token=++detailRequest;
    module().then(({createRenderer})=>{
      if (token!==detailRequest || !byId('bike-detail').open) return;
      const container=byId('graphics-detail');
      container.hidden=false;
      const canvas=document.createElement('canvas');
      byId('graphics-detail-host').replaceChildren(canvas);
      const original=byId('detail-image');
      detail=createRenderer(canvas,settings,{status:value=>{
        if (value==='ready') return;
        original.hidden=false;
        container.hidden=true;
        statusNode.textContent='WebGL kullanılamıyor. Özgün 2D görsel açık.';
      },model:()=>{
        original.hidden=true;
        statusNode.textContent='Deneysel 3D inceleme · Görsel hasar henüz işlenmiyor.';
      },modelFallback:()=>{
        container.hidden=true;
        statusNode.textContent='3D model yüklenemedi. Özgün 2D görsel açık.';
        garage?.active(true);
      }},{inspection:true});
      garage?.active(false);
      detail.update([{bike,bay:{index:0},zone:'gallery'}]);
    }).catch(()=>{
      if (token!==detailRequest) return;
      byId('graphics-detail').hidden=true;
      statusNode.textContent='3D inceleme başlatılamadı. Özgün 2D görsel açık.';
    });
  }
  return {show,inspect,leave(){visible=false;if(garage||loading)stop();}};
}
