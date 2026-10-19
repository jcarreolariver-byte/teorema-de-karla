import {isReleased,remainingParts,serverTime} from './release';
import './countdown.css';
const root=document.getElementById('root');
root.innerHTML=`<main class="waiting-room"><div class="waiting-stars" aria-hidden="true"></div><header class="waiting-brand"><span>EL TEOREMA</span><i>de Karla</i></header><section class="waiting-letter"><p class="waiting-eyebrow">20 DE OCTUBRE · PARA TI</p><div class="waiting-sigil" aria-hidden="true"><svg viewBox="0 0 100 110"><path d="M24 92V18M78 18L24 55L78 92"/><g><circle cx="24" cy="18" r="3"/><circle cx="24" cy="55" r="3"/><circle cx="24" cy="92" r="3"/><circle cx="78" cy="18" r="3"/><circle cx="78" cy="92" r="3"/></g></svg></div><h1>Hay universos que esperan<br/><i>el momento exacto.</i></h1><p class="waiting-copy">Karla, el tuyo se abre cuando<br/>comienza tu cumpleaños.</p><div class="countdown" role="timer" aria-label="Tiempo que falta para abrir tu regalo"><div><strong>—</strong><span>DÍAS</span></div><div><strong>—</strong><span>HORAS</span></div><div><strong>—</strong><span>MINUTOS</span></div><div><strong>—</strong><span>SEGUNDOS</span></div></div><p class="waiting-status" role="status">Sincronizando las estrellas…</p><button class="waiting-retry" hidden>Volver a comprobar</button><p class="waiting-date">20 de octubre de 2026 · 00:00<br/>Hora de Morelia, Michoacán</p></section><footer class="waiting-footer">UN PEQUEÑO UNIVERSO ESTÁ ESPERANDO POR TI</footer></main>`;
const digits=[...root.querySelectorAll('.countdown strong')],status=root.querySelector('.waiting-status'),retry=root.querySelector('.waiting-retry');
let anchor=null,at=0,opening=false,busy=false,opened=false;
function clock(){return anchor===null?null:anchor+performance.now()-at;}
async function openGift(){
 if(opening||opened)return;opening=true;status.textContent='Tu universo está listo. Abriendo el regalo…';
 try{await import('./main.jsx');opened=true;clearInterval(ticker);clearInterval(syncer);document.removeEventListener('visibilitychange',onVisible);}
 catch{opening=false;status.textContent='Tu regalo ya está listo. Comprueba tu conexión para abrirlo.';retry.hidden=false;}
}
function tick(){const now=clock();if(now===null||opening||opened)return;remainingParts(now).forEach((n,i)=>digits[i].textContent=String(n).padStart(2,'0'));if(isReleased(now))openGift();}
async function sync(){
 if(busy||opened)return;busy=true;retry.hidden=true;
 try{const url=new URL(import.meta.env.BASE_URL,location.origin);url.searchParams.set('_clock',crypto.randomUUID());anchor=await serverTime(url);at=performance.now();status.textContent='El universo también sabe esperar.';tick();}
 catch{if(anchor===null)status.textContent='Conéctate a internet para comprobar la hora de tu regalo.';else status.textContent='La cuenta continúa. Intentando reconectar…';retry.hidden=false;}
 finally{busy=false;}
}
retry.addEventListener('click',()=>isReleased(clock())?openGift():sync());
const onVisible=()=>{if(!document.hidden)sync();};
document.addEventListener('visibilitychange',onVisible);
const ticker=setInterval(tick,1000),syncer=setInterval(sync,60000);sync();
