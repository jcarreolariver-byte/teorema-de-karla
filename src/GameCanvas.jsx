import React,{useEffect,useRef,useState} from 'react';
import {ArrowDown,Hand,MoveUpRight,Sparkles} from 'lucide-react';
import {missions} from './game';

export function GameCanvas({chapter,phase,collected,paused,reading,locked,onAction,onTravelEnd,onWishReady,onTourStep,onTourEnd,onMode,tourAdvance,onReady}){
  const canvas=useRef(null),api=useRef(null),labels=useRef([]),current=useRef(null),gesture=useRef(null),hold=useRef(null),fallbackTour=useRef(0);
  const [ready,setReady]=useState(false),[compatible,setCompatible]=useState(false),[holding,setHolding]=useState(false);
  current.current={chapter,phase,collected,paused,reading,locked,onAction,onTravelEnd,onWishReady,onTourStep,onTourEnd,tourAdvance};
  const cancelHold=()=>{clearTimeout(hold.current);hold.current=null;setHolding(false);api.current?.setHolding(false)};
  useEffect(()=>{
    let cancelled=false,renderer;
    const project=points=>points.forEach((p,i)=>{const el=labels.current[i];if(!el)return;el.style.left=`${(p.x+1)*50}%`;el.style.top=`${(1-p.y)*50}%`;el.style.visibility=p.visible?'visible':'hidden';el.dataset.side=p.x>.15?'left':'right'});
    import('./universe').then(({Universe})=>Universe.create(canvas.current,project,()=>current.current.onTravelEnd?.(),()=>current.current.onWishReady?.(),data=>current.current.onTourStep?.(data),()=>current.current.onTourEnd?.())).then(value=>{
      if(cancelled){value.dispose();return}renderer=value;api.current=value;value.update(current.current);setReady(true);onReady?.();
    }).catch(()=>{if(!cancelled){setCompatible(true);setReady(true);onMode?.(true);onReady?.()}});
    const lost=e=>{e.preventDefault();setCompatible(true);setReady(true);onMode?.(true);onReady?.()};
    const el=canvas.current;el.addEventListener('webglcontextlost',lost);
    return()=>{cancelled=true;clearTimeout(hold.current);renderer?.dispose();api.current=null;el.removeEventListener('webglcontextlost',lost)};
  },[]);
  useEffect(()=>{api.current?.update(current.current);if(paused||phase!=='playing')cancelHold()},[chapter,phase,collected,paused,reading,locked,tourAdvance]);
  useEffect(()=>{
    const root=canvas.current?.closest('main');if(!root)return;
    const measure=()=>{const bounds=canvas.current.getBoundingClientRect(),title=root.querySelector('.hero-heading'),footer=root.querySelector('.journey-bottom');if(!title||!footer)return;const a=title.getBoundingClientRect(),b=footer.getBoundingClientRect();const desktop=bounds.width>=1000;api.current?.setPlayArea(desktop?{left:Math.max(a.right,b.right)-bounds.left+55,right:bounds.width-55,top:110,bottom:bounds.height-75}:{left:24,right:bounds.width-24,top:a.bottom-bounds.top+28,bottom:b.top-bounds.top-34});};
    const observer=new ResizeObserver(measure);[root,root.querySelector('.hero-heading'),root.querySelector('.journey-bottom')].filter(Boolean).forEach(el=>observer.observe(el));measure();document.fonts?.ready.then(measure);window.visualViewport?.addEventListener('resize',measure);
    return()=>{observer.disconnect();window.visualViewport?.removeEventListener('resize',measure)};
  },[ready,chapter,phase,collected.length]);
  useEffect(()=>{if(!compatible||phase!=='travel'||paused)return;const timer=setTimeout(()=>current.current.onTravelEnd?.(),1200);return()=>clearTimeout(timer)},[compatible,phase,paused]);
  useEffect(()=>{
    if(!compatible||phase!=='tour'||paused)return;
    current.current.onTourStep?.({index:fallbackTour.current,moving:false});
  },[compatible,phase,paused]);
  useEffect(()=>{if(phase!=='tour')fallbackTour.current=0;else if(compatible&&tourAdvance){fallbackTour.current++;if(fallbackTour.current>=16)current.current.onTourEnd?.();else current.current.onTourStep?.({index:fallbackTour.current,moving:false})}},[tourAdvance]);
  const point=e=>{const r=canvas.current.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*2-1,y:1-(e.clientY-r.top)/r.height*2}};
  const allowed=()=>ready&&phase==='playing'&&!paused&&!reading&&!locked&&collected.length<missions[chapter].total;
  const act=id=>{api.current?.pulse();onAction(id)};
  const down=e=>{
    if(!allowed()||compatible)return;
    const p=point(e),id=api.current?.hit(p);if(chapter!==1)e.currentTarget.setPointerCapture(e.pointerId);gesture.current={last:p,drag:chapter===2&&id===0,start:p};
    if(chapter===0&&id===0){setHolding(true);api.current?.setHolding(true);hold.current=setTimeout(()=>{hold.current=null;setHolding(false);if(current.current.phase==='playing'&&!current.current.paused)act(0)},850)}
    else if(chapter!==2&&id>=0)act(id);
  };
  const move=e=>{
    if(paused||!ready)return;const p=point(e);if(api.current)Object.assign(api.current.pointer,p);const g=gesture.current;if(!g||!allowed())return;
    if(Math.hypot(p.x-g.start.x,p.y-g.start.y)>.16&&hold.current)cancelHold();
    if(g.drag&&chapter===2&&api.current?.dragOrb(p))act(0);
    if(chapter===3){for(let i=0;i<missions[chapter].total;i++)if(api.current?.hitTrail(g.last,p,i))act(i)}
    g.last=p;
  };
  const up=()=>{cancelHold();gesture.current=null;api.current?.releaseOrb()};
  const count=missions[chapter].nodes.length,focus=chapter===2?0:collected.length;
  return <div className={`universe ${holding?'holding':''}`} data-renderer={compatible?'compatible':'webgl'} data-ready={ready} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}>
    <canvas ref={canvas} aria-label="Universo tridimensional interactivo"/>
    {compatible&&<div className="compatible-scene"><img src={`${import.meta.env.BASE_URL}textures/nebula.jpg`} alt=""/><p>Modo compatible. Puedes recorrer toda la historia con los botones.</p></div>}
    {!compatible&&ready&&Array.from({length:count},(_,i)=>{
      const active=i===focus&&allowed();const destination=chapter===2&&i===1&&allowed();
      return <button key={`${chapter}-${i}`} ref={el=>labels.current[i]=el} className={`object-marker ${active?'focused':''} ${destination?'destination':''}`} data-node={i} disabled={!active} tabIndex={active?0:-1} aria-label={active?chapter===3&&i===0?'Empieza por esta estrella':missions[chapter].instruction:`Estrella ${i+1}`} onClick={e=>{if(active&&(e.detail===0||chapter===1||chapter===3))act(i)}}>
        {active&&chapter>=1&&<span className="planet-pointer" aria-hidden="true"><ArrowDown size={22}/></span>}
        {active&&chapter===0&&<span className={`gesture-hint ${chapter===2?'hint-above':''} ${chapter===3?'hint-star hint-above':''}`}>{chapter===2?<MoveUpRight size={17}/>:chapter===0?<Hand size={17}/>:<Sparkles size={16}/>}<span>{chapter===3?i===0?'Empieza aquí':i===missions[chapter].total-1?'La última estrella':'Sigue aquí':chapter===1?i===0?'Empieza aquí':'El siguiente mundo':missions[chapter].instruction}</span></span>}
        {active&&chapter===3&&<span className="star-number">{i+1}</span>}
        {destination&&<span className="destination-hint">Hasta aquí</span>}
        {active&&chapter===0&&<span className="hold-meter"/>}
      </button>;
    })}
    {!ready&&<div className="scene-loading" role="status"><span/>Preparando tu universo…</div>}
  </div>;
}
