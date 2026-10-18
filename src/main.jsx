import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowRight,AudioLines,VolumeX,Pause,Play,RotateCcw,X} from 'lucide-react';
import {gift} from './content';
import {missions,canCollect} from './game';
import {GameCanvas} from './GameCanvas';
import {Soundtrack} from './audio';
import './style.css';

function App(){
 const [phase,setPhase]=useState('intro'),[chapter,setChapter]=useState(0),[collected,setCollected]=useState([]),[readingWish,setReadingWish]=useState(false),[wishRevealed,setWishRevealed]=useState(false),[ready,setReady]=useState(false),[compatible,setCompatible]=useState(false),[transforming,setTransforming]=useState(false);
 const [tourState,setTourState]=useState({index:0,moving:true}),[tourAdvance,setTourAdvance]=useState(0);
 const [sound,setSound]=useState({started:false,paused:false,muted:false,voice:'idle',error:''});
 const engine=useRef(null),progress=useRef([]),reading=useRef(false),storyFocus=useRef(null),playedButton=useRef(null),wishClose=useRef(null),effectTimers=useRef([]);
 if(!engine.current)engine.current=new Soundtrack(setSound);
 const mission=missions[chapter],complete=collected.length===mission.total,speaking=['loading','playing'].includes(sound.voice),modalOpen=readingWish&&wishRevealed;
 const voicePending=complete&&mission.voiceIndex!=null&&sound.voice!=='ended';
 useEffect(()=>{const hide=()=>{if(document.hidden&&engine.current.state.started&&!engine.current.state.paused)engine.current.pause()};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);engine.current.dispose();effectTimers.current.forEach(clearTimeout)}},[]);
 useEffect(()=>{if(phase==='story')storyFocus.current?.focus({preventScroll:true});if(phase==='playing')playedButton.current?.focus({preventScroll:true})},[phase,chapter]);
 useEffect(()=>{if(modalOpen)wishClose.current?.focus({preventScroll:true})},[modalOpen]);
 useEffect(()=>{if(phase==='playing'&&chapter===3&&complete&&sound.voice==='ended'){setTourState({index:0,moving:true});setPhase('tour')}},[phase,chapter,complete,sound.voice]);
 const delayUnlock=ms=>{setTransforming(true);effectTimers.current.push(setTimeout(()=>setTransforming(false),ms))};
 const act=id=>{
  if(transforming||!canCollect({phase,paused:sound.paused,reading:reading.current,count:progress.current.length,total:mission.total,id,ordered:chapter===3}))return;
  if(progress.current.includes(id)||chapter===2&&id!==0||chapter===1&&id!==progress.current.length)return;
  progress.current=[...progress.current,id];setCollected(progress.current);
  if(chapter!==1&&(chapter<3||progress.current.length===mission.total))delayUnlock(3200);
  if(chapter===1){reading.current=true;setReadingWish(true);setWishRevealed(false);if(compatible)setWishRevealed(true)}
  if(progress.current.length===mission.total&&mission.voiceIndex!=null)engine.current.narrate(mission.voiceIndex);
 };
 const begin=()=>{engine.current.start();setPhase('story')};
 const travel=()=>{if(!complete||voicePending||sound.paused||transforming)return;setPhase('travel')};
 const arrive=()=>{const next=chapter+1;progress.current=[];reading.current=false;setCollected([]);setReadingWish(false);setWishRevealed(false);setChapter(next);engine.current.changeChapter(missions[next].audioIndex);setPhase('story')};
 const restart=()=>{if(speaking)return;progress.current=[];reading.current=false;setCollected([]);setReadingWish(false);setWishRevealed(false);setChapter(0);engine.current.changeChapter(0);setTransforming(false);setTourAdvance(0);setTourState({index:0,moving:true});setPhase('intro')};
 const closeWish=()=>{reading.current=false;setReadingWish(false);setWishRevealed(false);delayUnlock(1700)};
 const primary=()=>{if(complete){if(chapter!==3)travel();return}act(chapter===2?0:collected.length)};
 const story=gift.chapters[mission.storyIndex];
 const buttonText=transforming&&chapter===0?'Tu universo está despertando…':complete?'Seguir la historia':mission.action;
 const actionHint=chapter===0?'Mantén la luz un instante o usa el botón.':chapter===1?'Un mundo a la vez. Sigue su pulso.':chapter===2?'Lleva la luz dorada hasta la azul.':'Empieza por la estrella señalada y sigue el trazo.';
 return <main className={`cinema phase-${phase} ${sound.paused?'is-paused':''} ${readingWish?'is-reading':''}`} data-chapter={chapter} data-phase={phase} data-tour-stop={tourState.index}>
  <GameCanvas chapter={chapter} phase={phase} collected={collected} paused={sound.paused} reading={readingWish} locked={transforming} tourAdvance={tourAdvance} onAction={act} onTravelEnd={arrive} onWishReady={()=>setWishRevealed(true)} onTourStep={setTourState} onTourEnd={()=>setPhase('epilogue')} onMode={setCompatible} onReady={()=>setReady(true)}/>
  <div className="scene-shade"/>
  <header className="hud" inert={sound.paused||modalOpen}><div className="wordmark"><span>EL TEOREMA</span><i>de Karla</i></div>{phase!=='intro'&&<div className="audio-controls" role="group" aria-label="Controles del viaje"><button className="sound-control" onClick={()=>engine.current.mute()} aria-label={sound.muted?'Activar sonido':'Silenciar'} aria-pressed={sound.muted}>{sound.muted?<VolumeX size={21}/>:<AudioLines size={21}/>}<span>{sound.muted?'Sin sonido':'Sonido activo'}</span></button><button className="pause-control" onClick={()=>engine.current.pause()} aria-label="Pausar"><Pause size={18}/></button></div>}</header>
  {phase==='intro'&&<><section className="hero-heading intro-heading"><p className="eyebrow">18 DE OCTUBRE · PARA TI</p><h1>Un universo<br/>hecho para ti.</h1><p className="lead">Hay encuentros que tardan<br/>una eternidad en prepararse.</p></section><section className="journey-bottom intro-bottom"><p className="narrative">Cuatro universos. Una historia.<br/>Te acompañaré, paso a paso.</p><button className="primary" disabled={!ready} onClick={begin}>{ready?'Comenzar el viaje':'Preparando el viaje…'}<ArrowRight size={22}/></button><p className="supporting">Con música y una historia para ti.<br/>Usa audífonos si puedes.</p></section></>}
  {phase==='story'&&<section inert={sound.paused} ref={storyFocus} tabIndex={-1} className="story-layer" aria-label="Historia del universo" key={`story-${chapter}`}><p className="eyebrow">{mission.label}</p><h1>{story.heading}</h1><div className="story-copy">{story.lines.map((line,i)=><p key={line} style={{animationDelay:`${i*.1}s`}}>{line}</p>)}</div><button className="primary" onClick={()=>setPhase('playing')} disabled={sound.paused}>{chapter===0?'Descubrir el origen':chapter===1?'Explorar los mundos':chapter===2?'Encontrar nuestras trayectorias':'Llegar a la demostración'}<ArrowRight size={21}/></button><p className="supporting">Lee a tu ritmo. El universo te espera.</p></section>}
  {phase==='playing'&&<>
   <section inert={sound.paused||modalOpen} className={`hero-heading world-${chapter}`}><p className="eyebrow">{mission.label}</p><h1>{mission.title.split('\n').map((line,i)=><React.Fragment key={line}>{i>0&&<br/>}{line}</React.Fragment>)}</h1>{chapter<2&&<p className="lead">{mission.subtitle}</p>}</section>
   <section inert={sound.paused||modalOpen} className={`journey-bottom ${complete?'is-complete':''}`} aria-label="Tu viaje" key={`bottom-${chapter}`}>
    {chapter>=2&&<p className="scene-subtitle">{mission.subtitle}</p>}
    {chapter!==1&&<p className="narrative" role="status">{complete?mission.done:chapter===0?'Todo comienza con algo pequeño.\nUn punto de luz. Una posibilidad.':chapter===2?'Mueve una pequeña posibilidad.\nObserva cómo cambia todo.':'Entre todos los futuros posibles,\nhay uno que quiero regalarte.'}</p>}
    {chapter===1&&<p className="atlas-guidance" role="status">{readingWish?modalOpen?'': 'Acercándonos a un deseo…':transforming?'Buscando el siguiente pulso…':complete?'Cinco mundos. Y todavía queda tanto universo.':'Toca el mundo que pulsa.'}</p>}
    {complete&&mission.voiceIndex!=null&&<div className="voice-status" role="status">{sound.voice==='loading'?'Preparando un mensaje para ti…':speaking?'Escucha. Este momento es tuyo.':sound.voice==='error'?'Tu mensaje está esperando. Reintenta el audio.':chapter===3?'Un último viaje para ti.':'Qué suerte la mía, Jockey.'}</div>}
    {!complete&&chapter!==1&&<p className="gesture-copy">{actionHint}</p>}
    {(chapter!==1||complete||compatible)&&!(chapter===3&&complete)&&<button ref={playedButton} className="primary" onClick={primary} disabled={sound.paused||voicePending||transforming||readingWish||!ready}>{buttonText}<ArrowRight size={21}/></button>}
    <nav className="journey-route" aria-label="Progreso del viaje">{missions.map((m,i)=><span key={m.name} aria-current={i===chapter?'step':undefined} className={i<=chapter?'visited':''}><i/>{m.name}</span>)}</nav><span className="sr-only" data-testid="progress">{collected.length} / {mission.total}</span>
   </section>
  </>}
  {modalOpen&&<div className="wish-veil"><section inert={sound.paused} className="wish-letter" role="dialog" aria-modal="true" aria-labelledby="wish-title" onKeyDown={e=>{if(e.key==='Escape')closeWish()}}><div className="wish-letter-top"><span id="wish-title">UN DESEO PARA TI · {collected.length} / 5</span><button ref={wishClose} onClick={closeWish} aria-label="Cerrar deseo"><X size={20}/></button></div><p>{gift.wishes[collected.at(-1)]}</p><small>{complete?'Cinco deseos. Y tanto universo por descubrir.':'Al cerrar, otro mundo te espera.'}</small></section></div>}
  {phase==='travel'&&<div className="travel-caption" role="status"><span>{chapter===0?'Hay deseos esperando por ti.':chapter===1?'Y entre todos los caminos…':'Algunas verdades permanecen.'}</span><small>Viajando al siguiente universo</small></div>}
  {phase==='tour'&&<section inert={sound.paused} className={`quality-caption ${tourState.moving?'is-moving':''}`} aria-label="Un recorrido por tus estrellas"><span className="eyebrow">TUS CONSTELACIONES · {String(tourState.index+1).padStart(2,'0')} / 16</span><div className="quality-words" key={tourState.index} aria-live="polite">{!tourState.moving&&<p>{gift.qualities[tourState.index]}</p>}</div><button className="tour-next" disabled={tourState.moving||sound.paused} onClick={()=>setTourAdvance(n=>n+1)}>{tourState.index===15?'Ver mi universo':'Siguiente estrella'}<ArrowRight size={17}/></button></section>}
  {phase==='epilogue'&&<section inert={sound.paused} className="epilogue-copy"><p className="eyebrow">KARLA · 18 DE OCTUBRE</p><h1>Que nunca te alcance el olvido,<br/><i>mi eterna casualidad</i></h1><button className="primary" onClick={restart}>Comenzar de nuevo<RotateCcw size={19}/></button></section>}
  {sound.paused&&<div className="pause-overlay" role="dialog" aria-modal="true" aria-label="Viaje en pausa"><p>Tu universo está en pausa.</p><button autoFocus className="secondary" onClick={()=>engine.current.pause()}><Play size={16}/>Continuar el viaje</button></div>}
  {sound.error&&<div className="audio-error" role="alert"><p>{sound.error}</p><button className="secondary" onClick={()=>engine.current.retry()}>Reintentar audio</button></div>}
 </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
