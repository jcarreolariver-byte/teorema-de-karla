const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const output=process.env.SCREENSHOT_DIR||'test-results';fs.mkdirSync(output,{recursive:true});
(async()=>{
 let page;const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--autoplay-policy=user-gesture-required','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 try{
  page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:process.env.REDUCED_MOTION||'no-preference'});page.setDefaultTimeout(90000);
  const errors=[],failed=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('fonts.googleapis'))failed.push([r.status(),r.url()])});
  if(process.env.VERCEL_OIDC_TOKEN){const origin=new URL(process.env.BASE_URL).origin;await page.route(`${origin}/**`,r=>r.continue({headers:{...r.request().headers(),'x-vercel-trusted-oidc-idp-token':process.env.VERCEL_OIDC_TOKEN}}))}
  await page.addInitScript(()=>{
   window.__audio={sources:[],gains:[]};const Original=window.AudioContext;
   window.AudioContext=class extends Original{constructor(...a){super(...a);window.__audio.ctx=this}createGain(){const g=super.createGain();window.__audio.gains.push(g);return g}createBufferSource(){const s=super.createBufferSource(),start=s.start.bind(s);s.start=(...a)=>{if(s.buffer.duration<100)s.playbackRate.value=16;window.__audio.sources.push(s);return start(...a)};return s}};
  });
  const state=async(phase,chapter)=>{await page.locator(`main[data-phase="${phase}"][data-chapter="${chapter}"]`).waitFor();console.log(`Reached ${phase} ${chapter}`)};
  const progress=async(n)=>page.waitForFunction(n=>document.querySelector('[data-testid=progress]')?.textContent.startsWith(`${n} /`),n);
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:4174');await page.locator('.universe[data-ready="true"]').waitFor();assert.equal(await page.locator('.universe').getAttribute('data-renderer'),'webgl');assert.equal(await page.evaluate(()=>window.__audio.sources.length),0);
  await page.getByRole('button',{name:'Comenzar el viaje'}).click();await state('story',0);await page.getByRole('button',{name:'Descubrir el origen'}).click();
  const seed=await page.locator('.object-marker.focused').boundingBox();await page.mouse.move(seed.x+seed.width/2,seed.y+seed.height/2);await page.mouse.down();await page.waitForTimeout(120);await page.mouse.up();await progress(0);
  const hold=await page.locator('.object-marker.focused').boundingBox();await page.mouse.move(hold.x+hold.width/2,hold.y+hold.height/2);await page.mouse.down();await page.waitForTimeout(1000);await page.mouse.up();await progress(1);
  await page.getByRole('button',{name:'Seguir la historia'}).click();await state('story',1);await page.getByRole('button',{name:'Explorar los mundos'}).click();
  for(let i=0;i<5;i++){
   await page.waitForFunction(i=>document.querySelector('canvas').dataset.pulse===String(i),i);await page.locator('.object-marker.focused').click();await progress(i+1);
   await page.getByRole('button',{name:'Cerrar deseo'}).waitFor();assert.ok((await page.locator('.wish-letter>p').textContent()).startsWith('Que'));assert.equal(await page.locator('canvas').getAttribute('data-pulse'),'none');
   assert.equal(await page.locator('.object-marker.focused').count(),0);await page.getByRole('button',{name:'Cerrar deseo'}).click();
  }
  await page.screenshot({path:`${output}/mundos.png`});await page.getByRole('button',{name:'Seguir la historia'}).click();await state('story',2);await page.getByRole('button',{name:'Encontrar nuestras trayectorias'}).click();
  const a=await page.locator('.object-marker.focused').boundingBox(),b=await page.locator('.object-marker.destination').boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:30});await page.mouse.up();await progress(1);
  await page.getByRole('button',{name:'Pausar',exact:true}).click();await page.waitForFunction(()=>window.__audio.ctx.state==='suspended');const t=await page.evaluate(()=>window.__audio.ctx.currentTime);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.__audio.ctx.currentTime),t);await page.getByRole('button',{name:'Continuar el viaje',exact:true}).click();
  await page.getByRole('button',{name:'Seguir la historia'}).click();await state('story',3);await page.getByRole('button',{name:'Llegar a la demostración'}).click();for(let i=0;i<15;i++){await page.locator('.object-marker.focused').click();await progress(i+1)}await page.locator('.object-marker.focused').click();
  await page.screenshot({path:`${output}/constelacion-k.png`});await state('tour',3);assert.equal(await page.locator('.hero-heading').count(),0);
  await page.locator('main[data-tour-stop="0"] .quality-words p').waitFor();await page.waitForTimeout(10000);assert.equal(await page.locator('main').getAttribute('data-tour-stop'),'0','A portrait must wait for the reader without automatic advancement');
  for(let i=0;i<16;i++){await page.locator(`main[data-tour-stop="${i}"] .quality-words p`).waitFor();assert.ok((await page.locator('.quality-words p').textContent()).length>40);await page.getByRole('button',{name:i===15?'Ver mi universo':'Siguiente estrella',exact:true}).click()}
  await state('epilogue',3);await page.getByRole('heading',{name:'Que nunca te alcance el olvido, mi eterna casualidad'}).waitFor();await page.screenshot({path:`${output}/universo-final.png`});
  const durations=await page.evaluate(()=>window.__audio.sources.filter(s=>s.buffer.duration<100).map(s=>s.buffer.duration));assert.deepEqual(durations,[]);
  assert.ok(await page.evaluate(()=>window.__audio.sources.filter(s=>s.buffer.duration>150).length>=1));
  await page.getByRole('button',{name:'Silenciar',exact:true}).click();await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__audio.gains[0].gain.value),0);await page.getByRole('button',{name:'Activar sonido',exact:true}).click();
  for(const [width,height]of [[320,568],[390,844],[430,932],[844,390]]){await page.setViewportSize({width,height});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
  await page.getByRole('button',{name:'Comenzar de nuevo'}).click();await state('intro',0);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.equal(requests.some(u=>u.includes('voz-')),false);
  console.log(JSON.stringify({passed:true,durations,checks:['one pulse at a time','five unobscured worlds','wish after approach','close wish to continue','continuous chapter flights','no personal voice requests','energy fusion','sixteen star portraits','stellar panorama','one uninterrupted music source','pause/resume','mute','responsive sizing','restart'],note:'No personal recordings are included; original music runs uninterrupted.'},null,2));
 }catch(e){if(page){await page.screenshot({path:`${output}/test-failure.png`});console.error(await page.locator('main').getAttribute('data-phase'),await page.locator('main').getAttribute('data-chapter'),await page.locator('main').getAttribute('data-tour-stop'));}throw e;}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
