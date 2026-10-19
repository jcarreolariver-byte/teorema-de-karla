import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RELEASE_AT,RELEASE_ZONE,isReleased,remainingParts,responseTime,serverTime} from '../src/release.js';
test('opens at the start of October 20 in Morelia, not the following midnight',()=>{
 assert.equal(new Date(RELEASE_AT).toISOString(),'2026-10-20T06:00:00.000Z');
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:RELEASE_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(RELEASE_AT));
 assert.equal(parts,'20/10/2026, 00:00');assert.equal(isReleased(RELEASE_AT-1),false);assert.equal(isReleased(RELEASE_AT),true);assert.equal(isReleased(RELEASE_AT+1),true);assert.equal(isReleased(null),false);
});
test('countdown rolls over correctly and never becomes negative',()=>{
 assert.deepEqual(remainingParts(RELEASE_AT-90061000),[1,1,1,1]);assert.deepEqual(remainingParts(RELEASE_AT-1),[0,0,0,1]);assert.deepEqual(remainingParts(RELEASE_AT+10000),[0,0,0,0]);
});
test('server time includes CDN age and refuses missing or failed server responses',()=>{
 assert.equal(responseTime(new Response(null,{headers:{date:'Tue, 20 Oct 2026 05:59:50 GMT',age:'10'}})),RELEASE_AT);
 assert.throws(()=>responseTime(new Response(null)),/hora/);assert.throws(()=>responseTime(new Response(null,{status:503,headers:{date:'Tue, 20 Oct 2026 06:00:00 GMT'}})),/hora/);
});
test('synchronization requests fresh headers and does not use the device clock',async()=>{
 const original=Date.now;Date.now=()=>RELEASE_AT+999999999;
 try{const time=await serverTime('https://example.test/?_clock=unique',async(url,options)=>{assert.equal(options.method,'HEAD');assert.equal(options.cache,'no-store');return new Response(null,{headers:{date:'Tue, 20 Oct 2026 05:59:59 GMT'}})});assert.equal(isReleased(time),false)}finally{Date.now=original}
});
