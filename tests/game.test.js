import {test} from 'node:test';
import assert from 'node:assert/strict';
import {distanceToSegment, missions, clamp, canCollect, flightDuration} from '../src/game.js';

test('fast drag across a destination counts even if neither endpoint is on the star',()=>{
 assert.equal(distanceToSegment({x:.62,y:.18},{x:-.62,y:.18},{x:.85,y:.18}),0);
});
test('a nearby parallel gesture must not complete the meeting',()=>{
 assert.ok(distanceToSegment({x:.62,y:.18},{x:-.62,y:-.2},{x:.85,y:-.2})>.14);
});
test('stationary touches and points beyond the segment are handled',()=>{
 assert.equal(distanceToSegment({x:1,y:0},{x:0,y:0},{x:0,y:0}),1);
 assert.equal(distanceToSegment({x:2,y:0},{x:0,y:0},{x:1,y:0}),1);
});
test('mission goals stay inside the playable region with distinct targets',()=>{
 missions.forEach((m,i)=>{
  assert.equal(m.nodes.length,i===2?2:m.total);
  for(const [x,y] of m.nodes){assert.ok(Math.abs(x)<.9);assert.ok(y>-.4&&y<.65)}
  assert.equal(new Set(m.nodes.map(p=>p.join(','))).size,m.nodes.length);
 });
 assert.equal(clamp(-2,-.85,.85),-.85);assert.equal(clamp(2,-.85,.85),.85);
});


test('story, travel, pause and reading a wish prevent accidental progression',()=>{
 const base={phase:'playing',paused:false,reading:false,count:0,total:5,id:0,ordered:false};
 assert.equal(canCollect(base),true);
 for(const patch of [{phase:'story'},{phase:'intro'},{phase:'travel'},{paused:true},{reading:true},{count:5}])assert.equal(canCollect({...base,...patch}),false);
});
test('the final constellation requires the next star and reduced motion avoids a long flight',()=>{
 const state={phase:'playing',paused:false,reading:false,count:2,total:6,id:3,ordered:true};
 assert.equal(canCollect(state),false);assert.equal(canCollect({...state,id:2}),true);
 assert.ok(flightDuration(true)<100);assert.ok(flightDuration(false)>=2000);
});
test('the visual journey preserves chapter ordering and message completion cues',()=>{
 assert.deepEqual(missions.map(m=>m.audioIndex),[0,2,1,3]);
 assert.equal(missions[2].voiceIndex,1);assert.equal(missions[3].voiceIndex,3);
 assert.equal(missions[0].voiceIndex,undefined);assert.equal(missions[1].voiceIndex,undefined);
});

test('a flight moves forward without a camera reset at either endpoint',async()=>{
 const {flightPose}=await import('../src/cinema.js');const a=[0,.08,9.1],b=[.45,.08,-24.9];
 assert.deepEqual(flightPose(a,b,0),a);assert.deepEqual(flightPose(a,b,1),b);
 let last=a[2];for(let i=1;i<=100;i++){const p=flightPose(a,b,i/100);assert.ok(p[2]<=last);last=p[2]}
 assert.ok(Math.abs(flightPose(a,b,.999)[2]-b[2])<.00001);
});
test('K uses sixteen distinct stars and only its three straight strokes',async()=>{
 const {kPoint,kStops,kEdges}=await import('../src/cinema.js');assert.equal(kStops.length,16);
 assert.equal(new Set(kStops.map(t=>kPoint(t).join(','))).size,16);
 for(const [a,b] of kEdges){
  const p=kPoint(kStops[a]),q=kPoint(kStops[b]);
  for(let j=0;j<=10;j++){
   const x=p[0]+(q[0]-p[0])*j/10,y=p[1]+(q[1]-p[1])*j/10;
   assert.ok(Math.abs(x+.85)<1e-7||Math.abs(Math.abs(y)-(x+.85)*1.15/1.8)<1e-7);
  }
 }
 assert.ok(kPoint(kStops[6])[0]>.94);assert.ok(kPoint(kStops[15])[0]>.94);
});

test('five worlds increase in size and depth while remaining separate in mobile overview',async()=>{
 const {atlasLayout}=await import('../src/cinema.js');assert.equal(atlasLayout.length,5);
 for(let i=1;i<5;i++){assert.ok(atlasLayout[i][2]>atlasLayout[i-1][2]);assert.ok(atlasLayout[i][3]>atlasLayout[i-1][3])}
 for(const [w,h]of [[390,844],[320,568]]){
  const f=h/(2*Math.tan(43*Math.PI/360));const projected=atlasLayout.map(([x,y,z,r])=>({x:w/2+(x-.32)*f/(9.1-z),y:h/2-y*f/(9.1-z),r:r*1.45*f/(9.1-z)}));
  for(const p of projected){assert.ok(p.x-p.r>0&&p.x+p.r<w);assert.ok(p.y-p.r>h*.28&&p.y+p.r<h*.8)}
  for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)assert.ok(Math.hypot(projected[i].x-projected[j].x,projected[i].y-projected[j].y)>projected[i].r+projected[j].r);
 }
});
test('each constellation star has an original intellectual portrait',async()=>{const {gift}=await import('../src/content.js');assert.equal(gift.qualities.length,missions[3].total);assert.equal(new Set(gift.qualities).size,16);assert.equal(gift.wishes.length,5)});


test('the whole activity stays between measured title and footer, including near spirals',async()=>{
 const THREE=await import('three');const {activityFrame}=await import('../src/cinema.js');
 for(const [width,height,top,bottom] of [[440,766,260,530],[390,664,235,440],[320,568,210,370],[390,844,260,620]]){
  const {scale,y}=activityFrame({width,height,left:24,right:width-24,top,bottom,depth:9.1,aspect:width/height});
  for(const px of [-.2,.2])for(const py of [-.09,.09]){
   const camera=new THREE.PerspectiveCamera(43,width/height,.1,230);camera.position.set(px,.08+py,9.1);camera.lookAt(0,-.06,0);camera.updateMatrixWorld();
   for(const x of [-1.5,1.5])for(const localY of [-1.3,1.3])for(const z of [-.8,1.8]){
    const point=new THREE.Vector3(x*scale,localY*scale+y,z*scale).project(camera),screenY=(1-point.y)*height/2;
    assert.ok(screenY>top&&screenY<bottom,`${width}x${height}: ${screenY} outside ${top}…${bottom}`);
   }
  }
 }
});

test('desktop uses the tall right column without changing the mobile scale',async()=>{
 const {activityFrame}=await import('../src/cinema.js');
 const full=activityFrame({width:1440,height:900,left:635,right:1385,top:110,bottom:825,depth:8.2,aspect:1440/900});
 const oldBand=activityFrame({width:1440,height:900,left:24,right:1416,top:500,bottom:620,depth:8.2,aspect:1440/900});
 assert.ok(full.scale>oldBand.scale*2);assert.ok(full.x>0);
 const mobile=activityFrame({width:440,height:766,left:24,right:416,top:260,bottom:530,depth:9.1,aspect:440/766});
 assert.equal(mobile.x,0);assert.ok(mobile.scale<=1);
});
