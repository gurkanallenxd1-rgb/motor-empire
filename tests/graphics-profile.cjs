const {chromium,devices}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=process.cwd();
const url=process.env.GRAPHICS_URL || 'http://127.0.0.1:8397';
(async()=>{
 const game=await import(root+'/game.mjs');
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await b.newPage({...devices['iPhone 13']});
 await page.emulateMedia({reducedMotion:'reduce'});
 page.on('pageerror',console.error);
 const seed=game.newGame(); seed.branches[0].tier=2;
 await page.addInitScript(s=>{localStorage.setItem('motor-empire.v9',JSON.stringify(s));},seed);
 const requested=[];
 page.on('request',request=>requested.push(new URL(request.url()).pathname));
 await page.goto(url);
 await page.waitForFunction(()=>document.querySelector('#save')?.textContent.includes('açık'));
 const initiallyLoaded=requested.some(path=>path.startsWith('/graphics/vendor/'));
 await page.locator('.bottom-nav [data-page=garage]').tap();
 await page.locator('#graphics-settings summary').tap();
 await page.selectOption('#graphics-form [name=quality]','medium');
 await page.locator('#graphics-form [name=mode]').evaluate(el=>{
   window.graphicsStart=performance.now();
   el.value='3d';el.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await page.waitForFunction(()=>document.querySelector('#garage-webgl')?.dataset.glb==='ready');
 console.log(JSON.stringify({initiallyLoaded,appGlbMs:await page.evaluate(()=>Math.round(performance.now()-window.graphicsStart))}));
 await page.selectOption('#graphics-form [name=mode]','2d');
 await page.locator('.bottom-nav [data-page=home]').tap();
 const rows=await page.evaluate(async ()=>{
  const {createRenderer}=await import('/graphics/renderer.mjs');

  const stats=[];
  for(const [quality,aa,shadows,reflections] of [['medium',true,'auto','auto'],['medium',true,'off','auto'],['medium',true,'auto','off'],['medium',false,'auto','auto']]){
   const canvas=document.createElement('canvas');
   canvas.style.cssText='display:block;width:390px;height:260px';
   canvas.style.position='fixed';canvas.style.inset=0;document.body.append(canvas);
   const gl=canvas.getContext('webgl2',{alpha:false,antialias:aa,powerPreference:'low-power'});
   const ext=gl.getExtension('WEBGL_debug_renderer_info');
   const backend=ext&&gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
   const timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');
   const samples=[];
   const start=performance.now();
   let sample, current, first;
   for (const key of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']) {
    const draw=gl[key].bind(gl);
    gl[key]=(...args)=>{
     if (current) current.calls++;
     draw(...args);
    };
   }
   const clear=gl.clear.bind(gl);
   gl.clear=(...args)=>{
    if (gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING)===null) {
     first ??= performance.now();
     if (sample && !current) {
      const frame={begin:performance.now(),calls:0,query:timer ? gl.createQuery() : null};
      current=frame;
      if (frame.query) gl.beginQuery(timer.TIME_ELAPSED_EXT,frame.query);
      queueMicrotask(()=>{
       frame.submitMs=+(performance.now()-frame.begin).toFixed(2);
       if (frame.query) gl.endQuery(timer.TIME_ELAPSED_EXT);
       current=null;
       const complete=sample;
       sample=null;
       complete(frame);
      });
     }
    }
    clear(...args);
   };
   const renderer=createRenderer(canvas,{quality,aa,shadows,reflections,fps:60,resolution:'auto',meter:false},{status(){}});
   const init=Math.round(performance.now()-start);
   renderer.update([]);
   while (canvas.dataset.glb!=='ready' && performance.now()-start<15000) {
    await new Promise(resolve=>requestAnimationFrame(resolve));
   }
   if (canvas.dataset.glb!=='ready') throw Error('Platform GLB did not load');
   const geometryMs=Math.round(performance.now()-start);
   for (let i=0;i<9;i++) {
    const frame=await new Promise(resolve=>{sample=resolve;renderer.reset();});
    if (i>1) samples.push(frame);
    else if (frame.query) gl.deleteQuery(frame.query);
   }
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const disjoint=timer && gl.getParameter(timer.GPU_DISJOINT_EXT);
   const deviceMs=[];
   for (const {query} of samples) {
    if (!query) continue;
    if (!disjoint && gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)) {
     deviceMs.push(+(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6).toFixed(2));
    }
    gl.deleteQuery(query);
   }
   stats.push({quality,aa,shadows,reflections,backend,timer:Boolean(timer),deviceMs,init,
    firstFrameStartMs:Math.round(first-start),geometryMs,submitMs:samples.map(frame=>frame.submitMs),
    calls:samples.map(frame=>frame.calls),width:canvas.width,height:canvas.height});
   renderer.dispose();canvas.remove();
  }
  return stats;
 });
 console.log(JSON.stringify(rows,null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
