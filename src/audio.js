export const tracks=['origen.mp3','two-trajectories.mp3','luminous-crescendo.mp3','a-final-chord.mp3'];
export const voices={1:'voz-encuentro.m4a',3:'voz-final.m4a'};
export const BED=tracks[2],OVERLAP=8;

// Chapters never touch the music clock. One complete piece overlaps its own tail.
export class Soundtrack {
 constructor(report=()=>{}){Object.assign(this,{report,cache:new Map(),beds:new Set(),state:{started:false,paused:false,muted:false,voice:'idle',error:''},chapter:-1,version:0,disposed:false})}
 update(patch){Object.assign(this.state,patch);this.report({...this.state})}
 unlock(){
  if(!this.ctx){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw new Error('Este navegador no admite el audio. Prueba con Safari o Chrome.');this.ctx=new Context();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination)}
  return this.ctx.resume();
 }
 async start(){try{await this.unlock();this.update({started:true,paused:false,error:''});await this.changeChapter(0)}catch(e){this.update({error:e.message||'No se pudo activar el sonido.'})}}
 async buffer(file){
  if(!this.cache.has(file)){const promise=fetch(`${import.meta.env?.BASE_URL ?? "/teorema-de-karla/"}audio/${file}`).then(r=>{if(!r.ok)throw new Error('No se pudo cargar el audio. Comprueba tu conexión y reintenta.');return r.arrayBuffer()}).then(b=>this.ctx.decodeAudioData(b));this.cache.set(file,promise);promise.catch(()=>this.cache.delete(file))}
  return this.cache.get(file);
 }
 ramp(param,value,seconds){const now=this.ctx.currentTime;if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);else{const v=param.value;param.cancelScheduledValues(now);param.setValueAtTime(v,now)}param.linearRampToValueAtTime(value,now+seconds)}
 makeSource(buffer,loop,volume){const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.loop=loop;gain.gain.value=volume;source.connect(gain);gain.connect(this.master);return{source,gain}}
 scheduleBed(at,first=false){
  const source=this.ctx.createBufferSource(),envelope=this.ctx.createGain(),gain=this.ctx.createGain(),duration=this.bedBuffer.duration,overlap=Math.min(OVERLAP,duration/4);
  source.buffer=this.bedBuffer;source.connect(envelope);envelope.connect(gain);gain.connect(this.master);
  gain.gain.value=this.state.voice==='playing'?.055:.28;
  envelope.gain.setValueAtTime(0,at);envelope.gain.linearRampToValueAtTime(1,at+(first?3:overlap));envelope.gain.setValueAtTime(1,at+duration-overlap);envelope.gain.linearRampToValueAtTime(0,at+duration);
  const bed={source,gain,envelope,at,end:at+duration};this.beds.add(bed);this.music=bed;
  source.onended=()=>{source.disconnect();envelope.disconnect();gain.disconnect();this.beds.delete(bed)};
  source.start(at);this.nextBedAt=at+duration-overlap;
 }
 pump(){if(this.disposed||!this.bedBuffer)return;if(this.nextBedAt-this.ctx.currentTime<12)this.scheduleBed(Math.max(this.nextBedAt,this.ctx.currentTime+.05))}
 ensureMusic(){
  if(this.beds.size)return Promise.resolve();if(this.musicPromise)return this.musicPromise;
  this.musicPromise=this.buffer(BED).then(buffer=>{if(this.disposed)return;this.bedBuffer=buffer;this.scheduleBed(this.ctx.currentTime+.05,true);this.scheduler=setInterval(()=>this.pump(),500)}).catch(e=>{this.musicPromise=null;this.update({error:e.message})});return this.musicPromise;
 }
 async changeChapter(chapter){const changed=this.chapter!==chapter;this.chapter=chapter;++this.version;this.update(changed?{voice:'idle',error:''}:{error:''});if(this.state.started)await this.ensureMusic()}
 async narrate(chapter){
  if(!voices[chapter]){this.update({voice:'ended',error:''});return;}
  if(['loading','playing'].includes(this.state.voice))return;const version=this.version;this.update({voice:'loading',error:''});
  try{
   await this.unlock();this.update({paused:false});const buffer=await this.buffer(voices[chapter]);if(version!==this.version||this.disposed)return;
   this.narration=this.makeSource(buffer,false,1);for(const b of this.beds)this.ramp(b.gain.gain,.055,.8);
   this.narration.source.onended=()=>{this.narration.source.disconnect();this.narration.gain.disconnect();this.narration=null;for(const b of this.beds)this.ramp(b.gain.gain,.28,4);this.update({voice:'ended'});for(const key of this.cache.keys())if(key!==BED)this.cache.delete(key)};
   this.narration.source.start(this.ctx.currentTime+.85);this.update({voice:'playing'});
  }catch(e){this.update({voice:'error',error:e.message||'No se pudo reproducir tu mensaje. Reintenta.'})}
 }
 mute(){const muted=!this.state.muted;this.update({muted});if(this.ctx)this.ramp(this.master.gain,muted?0:1,.2)}
 async pause(){if(!this.ctx)return;try{if(this.state.paused){await this.unlock();this.update({paused:false})}else{await this.ctx.suspend();this.update({paused:true})}}catch{this.update({error:'Pulsa Reanudar para continuar el audio.'})}}
 retry(){if(!this.state.started)return this.start();if(this.state.voice==='error')return this.narrate(this.chapter);this.musicPromise=null;return this.ensureMusic()}
 dispose(){this.disposed=true;++this.version;clearInterval(this.scheduler);if(this.narration){this.narration.source.onended=null;try{this.narration.source.stop()}catch{}this.narration.source.disconnect();this.narration.gain.disconnect()}for(const b of this.beds){b.source.onended=null;try{b.source.stop()}catch{}b.source.disconnect();b.envelope.disconnect();b.gain.disconnect()}this.beds.clear();this.ctx?.close();this.cache.clear()}
}
