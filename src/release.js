export const RELEASE_AT = Date.parse('2026-10-20T00:00:00-06:00');
export const RELEASE_ZONE = 'America/Mexico_City';
export const isReleased = now => Number.isFinite(now) && now >= RELEASE_AT;
export function remainingParts(now) {
 const seconds=Math.max(0,Math.ceil((RELEASE_AT-now)/1000));
 return [Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60];
}
export function responseTime(response) {
 const time=Date.parse(response.headers.get('date'));
 const age=Number(response.headers.get('age')||0);
 if(!response.ok||!Number.isFinite(time)||!Number.isFinite(age)||age<0)throw new Error('No se pudo comprobar la hora.');
 return time+age*1000;
}
export async function serverTime(url,fetcher=fetch) {
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try {return responseTime(await fetcher(url,{method:'HEAD',cache:'no-store',signal:controller.signal}));}
 finally {clearTimeout(timer);}
}
