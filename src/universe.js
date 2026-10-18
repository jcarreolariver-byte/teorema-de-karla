import * as THREE from 'three';
import {distanceToSegment,missions} from './game';
import {WORLD_DEPTH,FLIGHT_SECONDS,flightPose,smooth,kPoint,kStops,kEdges,atlasLayout,TOUR_MOVE_SECONDS,activityFrame} from './cinema';
const GOLD=0xf2c786,BLUE=0x8bbfe8;
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const mix=THREE.MathUtils.lerp;

export class Universe {
 static async create(canvas,onProject,onTravelEnd,onWishReady,onTourStep,onTourEnd){
  const loader=new THREE.TextureLoader();
  const textures=await Promise.all(['origin','moon','nebula','galaxy'].map(n=>loader.loadAsync(`${import.meta.env.BASE_URL}textures/${n}.jpg`)));
  return new Universe(canvas,textures,onProject,onTravelEnd,onWishReady,onTourStep,onTourEnd);
 }
 constructor(canvas,textures,onProject,onTravelEnd,onWishReady,onTourStep,onTourEnd){
  Object.assign(this,{canvas,textures,onProject,onTravelEnd,onWishReady,onTourStep,onTourEnd,chapter:0,phase:'intro',collected:[],pointer:{x:0,y:0},time:0,billboards:[],effects:[0,0,0,0],charge:0,join:0,energy:0,reading:false});
  this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<600?1.5:1.75));
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;this.renderer.setClearColor(0x02050b);
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(43,1,.1,230);this.ray=new THREE.Raycaster();this.look=V(0,-.06,0);
  textures.forEach(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy())});
  this.sky=new THREE.Mesh(new THREE.SphereGeometry(195,40,24),new THREE.MeshBasicMaterial({map:textures[2],side:THREE.BackSide,color:0xb7c7e8}));this.sky.rotation.y=.6;this.sky.position.z=-48;this.scene.add(this.sky);
  this.scene.add(new THREE.AmbientLight(0x6d8caf,.7));
  for(const [color,intensity,pos] of [[0xffdea6,4.4,[5,4,5]],[0x588bd8,2.1,[-4,0,3]],[0xb3d9ff,1.2,[0,4,-3]]]){const l=new THREE.DirectionalLight(color,intensity);l.position.set(...pos);this.scene.add(l)}
  // All four destinations coexist in one space. None is swapped on arrival.
  this.groups=Array.from({length:4},(_,i)=>{const g=new THREE.Group();g.position.z=-i*WORLD_DEPTH;this.scene.add(g);return g});this.groups[0].scale.setScalar(.85);this.groups[0].position.y=-.1;
  this.buildOrigin();this.buildAtlas();this.buildMeeting();this.buildFinal();this.buildDeepSpace();this.buildReactions();this.buildGalacticDepth();this.buildStarRoads();
  this.nodes=this.nodeSets[0];this.width=canvas.clientWidth;this.height=canvas.clientHeight;
  this.camera.position.copy(this.restPose(0));
  this.resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;this.width=w;this.height=h;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false)};
  this.resize();this.observer=new ResizeObserver(this.resize);this.observer.observe(canvas);window.addEventListener('resize',this.resize);
  this.last=performance.now();this.lastFrame=0;
  this.frame=now=>{this.raf=requestAnimationFrame(this.frame);if(document.hidden||this.paused){this.last=now;return}if(now-this.lastFrame<16)return;const dt=Math.min((now-this.last)/1000,.05);this.last=now;this.lastFrame=now;this.time+=dt;this.tick(dt);this.renderer.render(this.scene,this.camera);this.publishPoints();};
  this.raf=requestAnimationFrame(this.frame);
 }
 setPlayArea(area){this.playArea=area}
 fitActivity(dt){
  if(this.phase!=='playing'||this.chapter<2||!this.playArea)return;
  const depth=this.restPose(this.chapter).z+this.chapter*WORLD_DEPTH;
  const {scale,x,y}=activityFrame({...this.playArea,width:this.width,height:this.height,depth,aspect:this.camera.aspect});
  const group=this.groups[this.chapter],blend=1-Math.exp(-dt*8);
  group.scale.lerp(V(scale,scale,scale),blend);group.position.y=mix(group.position.y,y,blend);group.position.x=mix(group.position.x,x,blend);
 }
 restPose(chapter){return V(chapter===1?.45:0,.08,-chapter*WORLD_DEPTH+(this.width>900?8.2:9.1))}
 tick(dt){
  const motion=this.reduced?0:1,blend=1-Math.exp(-dt*2.5);this.energy=Math.max(0,this.energy-dt*.28);
  if(this.phase==='tour'||this.phase==='epilogue'){this.tickTour(dt)}else if(this.flight){
   this.flight.elapsed+=dt;const t=Math.min(1,this.flight.elapsed/this.flight.duration);
   this.camera.position.fromArray(flightPose(this.flight.from,this.flight.to,t));
   this.look.lerpVectors(this.flight.lookFrom,this.flight.lookTo,smooth(t));
   this.camera.fov=43+Math.sin(Math.PI*t)*8*motion;this.camera.updateProjectionMatrix();
   if(t===1){this.awaitingChapter=this.chapter+1;this.flight=null;this.camera.fov=43;this.camera.updateProjectionMatrix();this.onTravelEnd?.()}
  }else if(this.awaitingChapter==null){
   const target=this.restPose(this.chapter),look=V(this.chapter===1?.32:0,-.06,-this.chapter*WORLD_DEPTH);
   if(this.chapter===1&&this.reading&&this.collected.length){const m=this.atlasMoons[this.collected.at(-1)];target.set(m.position.x+.15,m.position.y+.16,this.groups[1].position.z+m.position.z+4.5);look.set(m.position.x,m.position.y,this.groups[1].position.z+m.position.z)}
   target.x+=this.pointer.x*.20*motion;target.y+=this.pointer.y*.09*motion;
   this.camera.position.lerp(target,blend*.55);this.look.lerp(look,blend*.55);
   if(this.chapter===1&&this.reading&&!this.wishArrivalReported&&this.camera.position.distanceTo(target)<.18){this.wishArrivalReported=true;this.onWishReady?.()}
  }
  this.fitActivity(dt);
  this.camera.lookAt(this.look);
  this.nebulaLayers.forEach(p=>{p.material.uniforms.opacity.value=p.userData.strength*smooth(Math.max(0,Math.min(1,(this.camera.position.z-p.position.z-2)/12)))});
  this.sky.rotation.y=.6+this.time*.001*motion;this.spaceDust.rotation.z=Math.sin(this.time*.02)*.025*motion;
  this.originPlanet.rotation.y=this.time*.025*motion;
  const born=this.chapter===0&&this.collected.length?1:this.completedOrigin?1:0;
  this.charge=mix(this.charge,this.holding?1:0,Math.min(1,dt*3));
  this.ignition=mix(this.ignition||0,born,blend*.5);
  const power=this.ignition;
  this.originPlanet.material.emissive.setHex(0x244c9b);this.originPlanet.material.emissiveIntensity=.015+power*.65;
  this.originRings.rotation.z=-.35+this.time*(.008+power*.08)*motion;this.originRings.rotation.x=1.35-power*.6;
  this.originRings.scale.setScalar(.9+power*.55);this.originLight.intensity=this.charge*9+power*18;
  this.originGalaxy.visible=power>.002||this.charge>.01;this.originGalaxy.material.uniforms.progress.value=power;this.originGalaxy.material.uniforms.time.value=this.time*motion;
  this.originGalaxy.material.uniforms.charge.value=this.charge;
  const age=this.time-this.effects[0];this.shock.visible=born&&age<5;this.shock.scale.setScalar(.1+Math.min(age/4,1)*5);this.shock.material.opacity=Math.max(0,1-age/5)*.7;
  this.nodeSets[0][0].children[0].scale.setScalar(1+this.charge*1.5+power*1.1);
  this.atlasMoons.forEach((m,i)=>{
   const found=this.chapter>1||this.chapter===1&&this.collected.includes(i),selected=this.chapter===1&&this.reading&&this.collected.at(-1)===i;
   m.scale.lerp(V(selected?3.5:found?1.45:1,selected?3.5:found?1.45:1,selected?3.5:found?1.45:1),blend);
   m.rotation.y=this.time*(.04+i*.01)*motion;m.material.emissive.setHex(i%2?0x245bb5:0x9b6726);m.material.emissiveIntensity=mix(m.material.emissiveIntensity,found?.38:.015,blend);
   const ring=this.wishRings[i];ring.scale.setScalar(selected?3.6:found?1.45:1);ring.material.opacity=mix(ring.material.opacity,found?.45:0,blend);
   this.wishTrails[i].material.opacity=mix(this.wishTrails[i].material.opacity,found?.8:0,blend);
   this.nodeSets[1][i].position.copy(m.position);
  });

  const wantedJoin=this.completedMeeting?1:this.dragAmount||0;
  this.join=mix(this.join,wantedJoin,Math.min(1,dt*(wantedJoin===1?.9:3)));
  for(const mesh of this.ribbons){mesh.morphTargetInfluences[0]=this.join;mesh.rotation.y=Math.sin(this.time*.15)*.1*motion;mesh.material.emissiveIntensity=.12+this.join*.28}
  this.ribbonDust.material.uniforms.progress.value=this.join;this.ribbonDust.material.uniforms.time.value=this.time*motion;
  if(this.chapter===2&&this.collected.length){this.meetingGold.position.lerp(V(0,0,1.8),blend);this.meetingBlue.position.lerp(V(0,0,1.8),blend);this.unionGlow.scale.setScalar(.2+this.join*.9);this.unionGlow.material.uniforms.opacity.value=this.join*.55}
  this.meetingLight.intensity=this.join*8;this.tickEnergy();
  const finalCount=this.chapter===3?this.collected.length:0,complete=finalCount===kStops.length;
  this.finalSegments.forEach((line,i)=>{const lit=line.userData.end<finalCount||complete;line.userData.reveal=mix(line.userData.reveal||0,lit?1:0,blend);line.geometry.setDrawRange(0,Math.floor(line.geometry.index.count*line.userData.reveal/6)*6);});
  this.kDust.material.uniforms.progress.value=mix(this.kDust.material.uniforms.progress.value,finalCount/kStops.length,blend);
  this.kDust.material.uniforms.time.value=this.time*motion;this.kHalo.children.forEach(line=>{line.material.opacity=mix(line.material.opacity,complete?.32:.035,blend)});
  this.finalLight.intensity=mix(this.finalLight.intensity,complete?24:finalCount*.6,blend);this.horizon.material.emissiveIntensity=complete?.35:.05;
  this.horizon.rotation.y=this.time*.014*motion;
  this.nodes.forEach((n,i)=>{
   const focused=(this.chapter===2?i===0:i===this.collected.length)&&!this.reading&&!this.locked,found=this.collected.includes(i)||this.chapter===2&&this.collected.length>0;
   n.userData.ring.visible=focused&&!found&&this.phase==='playing';n.userData.ring.rotation.z=this.time*.25*motion;n.userData.ring.scale.setScalar(focused?1+Math.sin(this.time*4)*.12:1);
   n.userData.glow.material.uniforms.opacity.value=this.chapter===1?found?.12:focused?.5+Math.sin(this.time*4)*.25:.035:found?.85:focused?.8:.18;
   n.userData.glow.scale.setScalar(this.chapter===1?focused?1.3+Math.sin(this.time*4)*.18:1:found?1.7:1+Math.sin(this.time*3)*.05*motion);
   n.userData.hit.scale.setScalar(Math.max(n.userData.radius,this.camera.position.distanceTo(n.getWorldPosition(V()))*.032));
  });
  this.billboards.forEach(b=>b.quaternion.copy(this.camera.quaternion));
  if(Math.floor(this.time*10)!==this.diagnosticFrame){this.diagnosticFrame=Math.floor(this.time*10);Object.assign(this.canvas.dataset,{cameraZ:this.camera.position.z.toFixed(3),cameraX:this.camera.position.x.toFixed(3),flight:this.flight?(this.flight.elapsed/this.flight.duration).toFixed(3):'idle',ignition:power.toFixed(2),joined:this.join.toFixed(2),constellation:String(finalCount),pulse:this.chapter===1&&!this.reading&&!this.locked&&this.collected.length<5?String(this.collected.length):'none',tourStop:this.tour?String(this.tour.index):'none'})}
 }
  glow(color,size=1,opacity=.7){
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.ShaderMaterial({uniforms:{tint:{value:new THREE.Color(color)},opacity:{value:opacity}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform vec3 tint;uniform float opacity;void main(){float d=length(vUv-.5)*2.;float a=exp(-d*d*5.)*smoothstep(1.,.1,d);gl_FragColor=vec4(tint,a*opacity);}' }));
    this.billboards.push(mesh);return mesh;
  }
  atmosphere(radius,color){return new THREE.Mesh(new THREE.SphereGeometry(radius,64,40),new THREE.ShaderMaterial({uniforms:{tint:{value:new THREE.Color(color)}},transparent:true,side:THREE.BackSide,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'varying vec3 vNormal;varying vec3 vPosition;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vPosition=mv.xyz;vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}',fragmentShader:'uniform vec3 tint;varying vec3 vNormal;varying vec3 vPosition;void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(-vPosition))),3.);gl_FragColor=vec4(tint,rim*.48);}' }));}
  planet(radius,map,color=0xffffff){const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,80,56),new THREE.MeshStandardMaterial({map,color,bumpMap:map,bumpScale:radius*.025,roughness:.82,metalness:.16}));return mesh}
  rocks(count,inner,outer,material){
    const mesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),material,count),dummy=new THREE.Object3D();
    for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,r=inner+Math.random()*(outer-inner),s=.006+Math.pow(Math.random(),3)*.025;dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,(Math.random()-.5)*.035);dummy.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);dummy.scale.set(s,s*.7,s*.9);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)}return mesh;
  }
  node(parent,pos,color=GOLD,radius=.075){
    const group=new THREE.Group();group.position.copy(pos);parent.add(group);
    const core=new THREE.Mesh(new THREE.SphereGeometry(radius,24,16),new THREE.MeshBasicMaterial({color}));group.add(core);
    const halo=this.glow(color,radius*10,.7);group.add(halo);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(radius*1.9,.008,8,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7}));group.add(ring);
    const hit=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({visible:false}));group.add(hit);
    group.userData={glow:halo,ring,hit,radius:radius*2.7};return group;
  }
  buildOrigin(){
    const group=this.groups[0],planet=this.planet(1.62,this.textures[0],0xd9e7ff);planet.position.set(.22,-.15,0);this.originPlanet=planet;group.add(planet);
    const atm=this.atmosphere(1.68,0x638ee7);atm.position.copy(planet.position);group.add(atm);
    const rings=new THREE.Group();rings.position.copy(planet.position);rings.rotation.set(1.10,.18,-.35);this.originRings=rings;group.add(rings);
    const mat=new THREE.MeshStandardMaterial({color:0xcaa26b,roughness:.8,metalness:.3});rings.add(this.rocks(innerWidth<600?700:1300,2.02,2.70,mat));
    for(const r of [2.03,2.12,2.39,2.65])rings.add(new THREE.Mesh(new THREE.TorusGeometry(r,.006,6,180),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:.45})));
    const disc=new THREE.Mesh(new THREE.RingGeometry(2.02,2.7,160),new THREE.MeshStandardMaterial({color:GOLD,side:THREE.DoubleSide,transparent:true,opacity:.085,depthWrite:false}));rings.add(disc);
    const sun=this.glow(0xffd6a0,3.4,.9);sun.position.set(1.5,.9,-1.4);group.add(sun);
    const foreground=this.rocks(28,3.2,4.9,new THREE.MeshStandardMaterial({map:this.textures[1],color:0x7e674e,roughness:1}));foreground.rotation.set(.6,.1,.2);foreground.position.z=3;group.add(foreground);
    const seed=this.node(group,new THREE.Vector3(-.75,-.55,1.65),GOLD,.075);
    this.nodeSets=[ [seed] ];
  }
  buildAtlas(){
    const group=this.groups[1];this.atlasMoons=[];
    this.nodeSets[1]=atlasLayout.map(([x,y,z,r],i)=>{
      const moon=this.planet(r,this.textures[i%2],i%2?0x8fa1c8:0xc8c0aa);moon.position.set(x,y,z);moon.userData.radius=r;this.atlasMoons.push(moon);group.add(moon);
      const n=this.node(group,V(x,y,z),GOLD,.035);n.children[0].visible=false;n.userData.radius=Math.max(.22,r*1.4);
      n.userData.ring.geometry.dispose();n.userData.ring.geometry=new THREE.TorusGeometry(r*1.32,.008,8,80);
      n.userData.glow.geometry.dispose();n.userData.glow.geometry=new THREE.PlaneGeometry(r*6,r*6);return n;
    });
    const sun=this.glow(0xffd29a,1.2,.5);sun.position.set(1.7,1.3,-8);group.add(sun);
  }
 buildMeeting(){
  const group=this.groups[2];this.ribbons=[];
  const trajectory=(side,joined)=>new THREE.CatmullRomCurve3(Array.from({length:121},(_,i)=>{const t=i/120,a=t*Math.PI*4+side*Math.PI;return joined?V(Math.cos(a)*.82,-1.2+t*2.4,Math.sin(a)*.82):V((side?1:-1)*.96+Math.cos(a)*.45,-1.2+t*2.4,Math.sin(a)*.5)}));
  this.ribbonPaths=[[],[]];
  for(let side=0;side<2;side++){
   const initial=trajectory(side,false),merged=trajectory(side,true);this.ribbonPaths[side]=[initial,merged];
   const geometry=new THREE.TubeGeometry(initial,150,.075,10,false),target=new THREE.TubeGeometry(merged,150,.075,10,false);
   geometry.morphAttributes.position=[target.attributes.position.clone()];geometry.morphAttributes.normal=[target.attributes.normal.clone()];target.dispose();
   const mesh=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({color:side?0x7badeb:0xe8bb72,emissive:side?0x2455ae:0x91551c,emissiveIntensity:.18,metalness:.6,roughness:.25,clearcoat:1}));group.add(mesh);this.ribbons.push(mesh);
  }
  const start=[],end=[];
  for(let i=0;i<5000;i++){const side=i%2,t=Math.random(),j=V((Math.random()-.5)*.14,(Math.random()-.5)*.14,(Math.random()-.5)*.14);start.push(this.ribbonPaths[side][0].getPoint(t).add(j));end.push(this.ribbonPaths[side][1].getPoint(t).add(j))}
  this.ribbonDust=this.morphCloud(start,end,0xffdcb1,.8);group.add(this.ribbonDust);
  const a=this.node(group,V(-.95,-.8,1.8),GOLD,.08),b=this.node(group,V(.95,.6,1.8),BLUE,.08);this.meetingGold=a;this.meetingBlue=b;this.goldHome=a.position.clone();this.blueHome=b.position.clone();this.nodeSets[2]=[a,b];
  this.unionGlow=this.glow(0xffe0a4,2,.0);this.unionGlow.position.set(0,0,1.8);group.add(this.unionGlow);
  this.buildEnergy();
  this.meetingLight=new THREE.PointLight(0xe0c5ff,0,12,2);this.meetingLight.position.set(0,0,2.6);group.add(this.meetingLight);
 }
 buildFinal(){
  const group=this.groups[3];this.horizon=this.planet(3.3,this.textures[0],0x97b5ed);this.horizon.position.set(0,-4.65,-1.4);this.horizon.material.emissive.setHex(0x1c4d85);group.add(this.horizon);
  const atm=this.atmosphere(3.38,0x4c89d0);atm.position.copy(this.horizon.position);group.add(atm);
  this.nodeSets[3]=kStops.map(t=>this.node(group,V(...kPoint(t)),GOLD,.036));
  this.finalSegments=kEdges.map(([a,b])=>{
   const path=new THREE.LineCurve3(V(...kPoint(kStops[a])),V(...kPoint(kStops[b])));
   const line=new THREE.Mesh(new THREE.TubeGeometry(path,40,.009,7,false),new THREE.MeshBasicMaterial({color:0xffd28a,transparent:true,opacity:.95,blending:THREE.AdditiveBlending}));line.userData.end=b;line.geometry.setDrawRange(0,0);group.add(line);return line;
  });
  this.kHalo=new THREE.Group();group.add(this.kHalo);
  for(const [a,b] of [[[-.85,-1.15,0],[-.85,1.15,0]],[[.95,1.15,0],[-.85,0,0]],[[-.85,0,0],[.95,-1.15,0]]]){
   this.kHalo.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(V(...a),V(...b)),100,.045,8,false),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:.035,depthWrite:false,blending:THREE.AdditiveBlending})));
  }
  const positions=[],orders=[];
  for(let i=0;i<6500;i++){const t=Math.random(),p=V(...kPoint(t)),spread=Math.random()<.7?.024:.11;p.add(V((Math.random()-.5)*spread,(Math.random()-.5)*spread,(Math.random()-.5)*.13));positions.push(p.x,p.y,p.z);orders.push(t)}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('order',new THREE.Float32BufferAttribute(orders,1));
  this.kDust=new THREE.Points(geo,new THREE.ShaderMaterial({uniforms:{progress:{value:0},time:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'attribute float order;uniform float progress;uniform float time;varying float alpha;void main(){alpha=.025+smoothstep(order-.04,order,progress)*.9;vec3 p=position;p.z+=sin(time*.8+order*30.)*.015;vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(14./-mv.z,1.,3.);gl_Position=projectionMatrix*mv;}',fragmentShader:'varying float alpha;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(1.,.74,.35,exp(-d*d*20.)*alpha);}'}));group.add(this.kDust);
  this.finalLight=new THREE.PointLight(0xffcb7f,0,15,2);this.finalLight.position.set(0,0,2);group.add(this.finalLight);
  const ring=new THREE.Group();ring.position.set(0,-2.4,-2);ring.rotation.set(1.2,.35,-.25);ring.add(this.rocks(1100,2.7,4.8,new THREE.MeshStandardMaterial({color:0xb48a51,metalness:.4,roughness:.6})));group.add(ring);
  for(const [x,y,z,r] of [[-1.9,1.2,-2,.24],[2,.1,-2,.18],[1.8,-1.4,-1,.16],[-1.5,-.9,-3,.1]]){const m=this.planet(r,this.textures[1]);m.position.set(x,y,z);group.add(m)}
 }
 morphCloud(start,end,color,opacity){
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(end.flatMap(p=>p.toArray()),3));geo.setAttribute('start',new THREE.Float32BufferAttribute(start.flatMap(p=>p.toArray()),3));
  return new THREE.Points(geo,new THREE.ShaderMaterial({uniforms:{progress:{value:0},time:{value:0},charge:{value:0},tint:{value:new THREE.Color(color)},base:{value:opacity}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'attribute vec3 start;uniform float progress;uniform float time;uniform float charge;varying float flicker;void main(){vec3 p=mix(start,position,smoothstep(0.,1.,progress));float a=time*.08*progress;mat2 r=mat2(cos(a),-sin(a),sin(a),cos(a));p.xy=r*p.xy;p+=sin(position*11.+time)*.012;flicker=.6+.4*sin(time*2.+position.x*15.);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp((11.+charge*12.)/-mv.z,1.,4.);gl_Position=projectionMatrix*mv;}',fragmentShader:'uniform vec3 tint;uniform float base;uniform float progress;varying float flicker;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(tint,exp(-d*d*19.)*base*flicker);}'}));
 }
 buildReactions(){
  const g=this.groups[0];this.originLight=new THREE.PointLight(0xffc477,0,12,2);this.originLight.position.set(-.75,-.55,2.4);g.add(this.originLight);
  const start=[],end=[];
  for(let i=0;i<6500;i++){const r=.4+Math.pow(Math.random(),.5)*3.5,a=(i%3)*Math.PI*2/3+r*1.65+(Math.random()-.5)*.3;start.push(V(-.75+(Math.random()-.5)*.08,-.55+(Math.random()-.5)*.08,1.65));end.push(V(Math.cos(a+r)*r+.22,Math.sin(a+r)*r*.55-.15,(Math.random()-.5)*.4))}
  this.originGalaxy=this.morphCloud(start,end,GOLD,.85);g.add(this.originGalaxy);
  this.shock=new THREE.Mesh(new THREE.TorusGeometry(1,.025,8,160),new THREE.MeshBasicMaterial({color:0xffe0a4,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));this.shock.position.set(-.75,-.55,1.6);g.add(this.shock);
  this.wishRings=[];this.wishTrails=[];
  this.atlasMoons.forEach((m,i)=>{
   const ring=new THREE.Mesh(new THREE.TorusGeometry(m.userData.radius*1.32,.009,8,100),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0,blending:THREE.AdditiveBlending}));ring.position.copy(m.position);this.groups[1].add(ring);this.wishRings.push(ring);
   const curve=new THREE.CatmullRomCurve3([V(.05,.9,-2.6),V(m.position.x-.4,m.position.y+.5,-.6),m.position.clone()]);
   const line=new THREE.Mesh(new THREE.TubeGeometry(curve,60,.007,6,false),new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0,blending:THREE.AdditiveBlending}));this.groups[1].add(line);this.wishTrails.push(line);
  });
 }
 buildDeepSpace(){
  const count=innerWidth<600?7000:11000,positions=[],colors=[];
  for(let i=0;i<count;i++){positions.push((Math.random()-.5)*85,(Math.random()-.5)*60,18-Math.random()*195);const c=new THREE.Color(i%5===0?GOLD:BLUE);colors.push(c.r,c.g,c.b)}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  this.spaceDust=new THREE.Points(geo,new THREE.ShaderMaterial({vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'varying vec3 c;void main(){c=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(30./-mv.z,1.,3.);gl_Position=projectionMatrix*mv;}',fragmentShader:'varying vec3 c;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(c,exp(-d*d*22.)*.7);}'}));this.scene.add(this.spaceDust);
  // Physical landmarks between chapters pass beside the camera during the flight.
  for(let i=0;i<13;i++){const m=this.planet(.12+(i%3)*.09,this.textures[i%2]);m.position.set((i%2?1:-1)*(2.8+i%3),Math.sin(i)*2.5,-8-i*7.3);this.scene.add(m)}
  const route=new THREE.CatmullRomCurve3(Array.from({length:110},(_,i)=>V(Math.sin(i*.19)*3.2,Math.cos(i*.13)*1.1,-i)));
  this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(route.getPoints(700)),new THREE.LineBasicMaterial({color:0xb49564,transparent:true,opacity:.14})));
 }
 buildGalacticDepth(){
  this.nebulaLayers=[[-22,.18,.25],[-56,-.35,.25],[-90,.1,.2],[-114,.02,.85],[-148,.25,.7],[-184,-.2,.7]].map(([z,angle,strength])=>{
   const p=new THREE.Mesh(new THREE.PlaneGeometry(30,20),new THREE.ShaderMaterial({uniforms:{map:{value:this.textures[3]},opacity:{value:strength}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform sampler2D map;uniform float opacity;void main(){vec4 c=texture2D(map,vUv);vec2 edge=smoothstep(vec2(0.),vec2(.16),vUv)*smoothstep(vec2(0.),vec2(.16),1.-vUv);gl_FragColor=vec4(c.rgb,c.a*opacity*edge.x*edge.y);}'}));p.position.set(0,0,z);p.rotation.z=angle;p.userData.strength=strength;this.scene.add(p);return p;
  });
 }
 buildEnergy(){
  this.energyStreams=[];
  for(let side=0;side<2;side++){
   const p=new Float32Array(100*3),colors=new Float32Array(100*3),tint=new THREE.Color(side?BLUE:GOLD);
   for(let i=0;i<100;i++){const strength=1-(i%50)/50;colors.set([tint.r*strength,tint.g*strength,tint.b*strength],i*3)}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(colors,3));
   const tail=new THREE.Points(g,new THREE.PointsMaterial({vertexColors:true,size:.035,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}));tail.frustumCulled=false;this.groups[2].add(tail);
   const heads=[0,.5].map(()=>{const head=this.node(this.groups[2],V(),side?BLUE:GOLD,.026);head.userData.ring.visible=false;return head});this.energyStreams.push({side,tail,heads});
  }
 }
 tickEnergy(){
  this.energyStreams.forEach(({side,tail,heads})=>{
   const attr=tail.geometry.attributes.position;
   for(let i=0;i<100;i++){const t=((this.time*.13+Math.floor(i/50)*.5-(i%50)*.002)%1+1)%1,p=this.ribbonPaths[side][0].getPoint(t).lerp(this.ribbonPaths[side][1].getPoint(t),this.join);attr.setXYZ(i,p.x,p.y,p.z);if(i%50===0)heads[Math.floor(i/50)].position.copy(p)}attr.needsUpdate=true;
  });
 }
 buildStarRoads(){
  const positions=[],colors=[];
  for(let road=0;road<9;road++){
   const points=Array.from({length:120},(_,i)=>{const t=i/119;return V(Math.sin(t*2.2+road*.6)*(3+road*.8),-2+Math.cos(t*3+road)*1.5,-126-t*60)});
   const curve=new THREE.CatmullRomCurve3(points);
   this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(350)),new THREE.LineBasicMaterial({color:road%2?BLUE:GOLD,transparent:true,opacity:.2})));
   for(let i=0;i<550;i++){const p=curve.getPoint(Math.random());p.x+=(Math.random()-.5)*.15;p.y+=(Math.random()-.5)*.15;positions.push(p.x,p.y,p.z);const c=new THREE.Color(road%2?BLUE:GOLD);colors.push(c.r,c.g,c.b)}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  this.starRoads=new THREE.Points(g,new THREE.PointsMaterial({vertexColors:true,size:.04,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));this.scene.add(this.starRoads);
 }
 startTour(){this.tour={index:0,elapsed:0,from:this.camera.position.clone(),lookFrom:this.look.clone(),reported:false};this.onTourStep?.({index:0,moving:true})}
 nextTourStop(){
  if(!this.tour)return;
  if(this.tour.index===15){this.departure={elapsed:0,from:this.camera.position.toArray(),to:[0,1.8,-130],lookFrom:this.look.clone(),lookTo:V(0,-1,-157)};this.tour=null;this.onTourStep?.({index:15,moving:true});return}
  this.tour={index:this.tour.index+1,elapsed:0,from:this.camera.position.clone(),lookFrom:this.look.clone(),reported:false};this.onTourStep?.({index:this.tour.index,moving:true});
 }
 tickTour(dt){
  if(this.departure){const d=this.departure;d.elapsed+=dt;const t=Math.min(1,d.elapsed/(this.reduced?.1:9));this.camera.position.fromArray(flightPose(d.from,d.to,t));this.look.lerpVectors(d.lookFrom,d.lookTo,smooth(t));if(t===1){this.departure=null;this.onTourEnd?.()}return}
  if(!this.tour)return;
  const tour=this.tour;tour.elapsed+=dt;const star=this.nodes[tour.index].getWorldPosition(V()),to=star.clone().add(V(.14,.08,2.6)),duration=this.reduced?.1:TOUR_MOVE_SECONDS,t=smooth(Math.min(1,tour.elapsed/duration));
  this.camera.position.lerpVectors(tour.from,to,t);this.look.lerpVectors(tour.lookFrom,star,t);
  if(!tour.reported&&tour.elapsed>=duration){tour.reported=true;this.onTourStep?.({index:tour.index,moving:false})}
 }
 setHolding(value){this.holding=value}
 beginFlight(){
  if(this.flight)return;
  const to=this.restPose(this.chapter+1),lookTo=V(this.chapter+1===1?.32:0,-.06,-(this.chapter+1)*WORLD_DEPTH);
  this.flight={from:this.camera.position.toArray(),to:to.toArray(),lookFrom:this.look.clone(),lookTo,elapsed:0,duration:this.reduced?.08:FLIGHT_SECONDS};
 }
 update({chapter,phase,collected,paused,reading,locked,tourAdvance=0}){
  if(chapter!==this.chapter){
   const restart=chapter===0;this.awaitingChapter=null;this.chapter=chapter;this.nodes=this.nodeSets[chapter];this.collected=[];this.dragAmount=0;
   if(restart){for(const i of [2,3]){this.groups[i].scale.setScalar(1);this.groups[i].position.y=0;this.groups[i].position.x=0}this.playArea=null;this.flight=null;this.tour=null;this.departure=null;this.completedOrigin=false;this.completedMeeting=false;this.ignition=0;this.join=0;this.camera.position.copy(this.restPose(0));this.look.set(0,-.06,0);this.meetingGold.position.copy(this.goldHome);this.meetingBlue.position.copy(this.blueHome)}
  }
  if(collected.length>this.collected.length){this.effects[chapter]=this.time;this.energy=1;if(chapter===1)this.wishArrivalReported=false;if(chapter===0){this.completedOrigin=true;this.holding=false}if(chapter===2)this.completedMeeting=true}
  this.collected=collected;this.paused=paused;this.reading=reading;this.locked=locked;
  if(phase==='travel'&&this.phase!=='travel')this.beginFlight();if(phase==='tour'&&this.phase!=='tour')this.startTour();if(phase==='tour'&&tourAdvance!==this.tourAdvance&&this.tour?.reported)this.nextTourStop();this.tourAdvance=tourAdvance;this.phase=phase;this.last=performance.now();
 }
 publishPoints(){
  const points=this.nodes.map(n=>{const v=n.getWorldPosition(V()).project(this.camera);return{x:v.x,y:v.y,visible:v.z<1&&v.z>-1}});this.projected=points;this.onProject?.(points);
 }
 hit(point){
  const id=this.chapter===2?0:this.collected.length,n=this.nodes[id];if(!n)return -1;
  this.scene.updateMatrixWorld(true);this.ray.setFromCamera(new THREE.Vector2(point.x,point.y),this.camera);
  const target=this.projected?.[id];const near=target&&Math.hypot((point.x-target.x)*this.width/2,(point.y-target.y)*this.height/2)<38;
  return near||this.ray.intersectObject(n.userData.hit,false).length?id:-1;
 }
 pulse(){this.energy=1}
 dragOrb(point){
  this.ray.setFromCamera(new THREE.Vector2(point.x,point.y),this.camera);const p=V();this.ray.ray.intersectPlane(new THREE.Plane(V(0,0,1),-(this.groups[2].position.z+1.8*this.groups[2].scale.z)),p);this.groups[2].worldToLocal(p);this.meetingGold.position.copy(p);
  const initial=this.goldHome.distanceTo(this.blueHome),remaining=p.distanceTo(this.meetingBlue.position);this.dragAmount=Math.max(0,Math.min(.92,1-remaining/initial));
  const target=this.meetingBlue.getWorldPosition(V()).project(this.camera);return Math.hypot((point.x-target.x)*this.width/2,(point.y-target.y)*this.height/2)<38;
 }
 releaseOrb(){if(!this.collected.length){this.meetingGold.position.copy(this.goldHome);this.dragAmount=0}}
 hitTrail(a,b,index){const p=this.projected?.[index];return p&&distanceToSegment({x:p.x*this.width/2,y:p.y*this.height/2},{x:a.x*this.width/2,y:a.y*this.height/2},{x:b.x*this.width/2,y:b.y*this.height/2})<24}
 dispose(){cancelAnimationFrame(this.raf);this.observer.disconnect();window.removeEventListener('resize',this.resize);this.scene.traverse(o=>{o.geometry?.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m?.dispose())});this.textures.forEach(t=>t.dispose());this.renderer.dispose();this.renderer.forceContextLoss()}
}
