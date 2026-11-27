// Run both revisions on local HTTP servers. Playwright instruments camera poses for screenshots.
const {chromium,devices}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path=require('node:path');
const {mkdir}=require('node:fs/promises');

const output=process.env.GRAPHICS_SCREENSHOTS;
const urls=[process.env.GRAPHICS_BASE_URL,process.env.GRAPHICS_URL];
if(!output || urls.some(url=>!url))throw Error('Set GRAPHICS_SCREENSHOTS, GRAPHICS_BASE_URL and GRAPHICS_URL');
const cases={
  general:[[15,17.2,21],[0,.2,0]],
  showroom:[[7,8.5,9],[2.5,.6,-.6]],
  service:[[-2.2,7,9],[-4.8,.5,-1.3]],
  office:[[-4.5,7,-12],[.3,.9,-4.4]],
  equipment:[[-1.9,7,12.7],[-4.9,.65,4.1]],
};
(async()=>{
  await mkdir(output,{recursive:true});
  const {newGame,synchronize}=await import(path.join(process.cwd(),'game.mjs'));
  const seed=synchronize(newGame(),1800000000000).state;
  seed.clock.paused=true;
  seed.branches[0].tier=2;
  seed.branches[0].garage=[
    ['Yamaha MT-25',2024,'#292b2e',0,'inspected'],
    ['Kawasaki Z900',2025,'#639d34',4,'ready'],
    ['KTM 1390 Super Duke R',2024,'#e86920',8,'ready'],
  ].map(([name,year,color,slot,stage])=>({name,year,color,slot,stage,id:'visual-'+slot,
    km:1390,condition:100,value:160000,price:120000,spent:120000,faults:slot===0?['lastik']:[],
    paintAccent:slot===8?'#292b2e':undefined}));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',
    args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    for (const [index,url] of urls.entries()) {
      const revision=index?'after':'before';
      const page=await browser.newPage({...devices['iPhone 13'],viewport:{width:390,height:844}});
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.addInitScript(s=>{
        Date.now=()=>s.clock.wall;
        localStorage.setItem('motor-empire.v9',JSON.stringify(s));
        localStorage.setItem('motor-empire.graphics.v1',JSON.stringify({mode:'3d',quality:'medium'}));
      },seed);
      await page.route('**/graphics/renderer.mjs*',async route=>{
        const response=await route.fetch();
        const source=(await response.text()).replace('    active(value)',`    capture(eye,point){
          moveTo(new T.Vector3(...point),new T.Vector3(...eye).sub(new T.Vector3(...point)),false);
        },
        active(value)`).replace('  return {\n    update,updateOptions','  return window.captureRenderer={\n    update,updateOptions');
        await route.fulfill({response,body:source,contentType:'text/javascript'});
      });
      await page.goto(url);
      await page.waitForFunction(()=>document.querySelector('#save')?.textContent.includes('açık'));
      await page.locator('.bottom-nav [data-page=garage]').tap();
      await page.waitForFunction(()=>document.querySelector('#garage-webgl')?.dataset.glb==='ready');
      const canvas=page.locator('#garage-webgl');
      await canvas.scrollIntoViewIfNeeded();
      const capture=async(name,pose,full=false)=>{
        await page.evaluate(([eye,target])=>window.captureRenderer.capture(eye,target),pose);
        await page.waitForTimeout(650);
        const file=path.join(output,revision+'-'+name+'.png');
        if(full)await page.screenshot({path:file});
        else await canvas.screenshot({path:file});
      };
      for(const [name,pose] of Object.entries(cases)) await capture(name,pose);
      await capture('portrait',cases.general,true);
      await page.locator('#graphics-settings summary').tap();
      for(const quality of ['low','medium','high','ultra']) {
        await page.selectOption('#graphics-form [name=quality]',quality);
        await capture(quality,cases.showroom);
      }
      await page.locator('#graphics-settings summary').tap();
      await page.setViewportSize({width:844,height:390});
      await canvas.scrollIntoViewIfNeeded();
      await capture('landscape',cases.general,true);
      await page.close();
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
