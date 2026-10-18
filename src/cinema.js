export const WORLD_DEPTH=34;
export const FLIGHT_SECONDS=6.8;
export const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10)};
export function flightPose(from,to,t){
 const u=smooth(t),v=1-u;
 // The same endpoints are used by both the flight and the resting camera.
 const a=[from[0]-3.8,from[1]+1.4,from[2]-10],b=[to[0]-3.2,to[1]+.8,to[2]+10];
 return from.map((x,i)=>v*v*v*x+3*v*v*u*a[i]+3*v*u*u*b[i]+u*u*u*to[i]);
}
// Three straight strokes form K. The parameter jumps between disconnected strokes.
export const kPoint=t=>t<=1/3?[-.85,-1.15+2.3*t*3,0]:t<=2/3?[.95-1.8*(t*3-1),1.15*(2-t*3),0]:[-.85+1.8*(t*3-2),-1.15*(t*3-2),0];
export const kStops=[...Array.from({length:6},(_,i)=>i/15),...Array.from({length:5},(_,i)=>i===0?1/3+1e-9:1/3+i/12),...Array.from({length:5},(_,i)=>2/3+(i+1)/15)];
export const kEdges=kStops.flatMap((t,i)=>i===5||i===15?[]:[[i,i+1]]);

export const TOUR_MOVE_SECONDS=1.8;
export const atlasLayout=[[-.95,.85,-5,.14],[-.35,.4,-3.5,.19],[.55,.1,-2,.25],[-.5,-.55,-.7,.32],[.65,-.95,.7,.42]];

// Fit the complete activity into measured UI-free screen space, including near geometry.
export function activityFrame({width,height,left,right,top,bottom,depth,aspect}){
 const tan=Math.tan(43*Math.PI/360),fraction=Math.max(.08,(bottom-top)/height),horizontal=(right-left)/width*aspect;
 const fit=f=>f*2*tan*depth/(3.15+f*4*tan);
 return {scale:Math.min(width>=1000?2.2:1,fit(fraction),fit(horizontal)),x:((left+right)/2-width/2)/width*2*tan*depth*aspect,y:-.06+(height/2-(top+bottom)/2)/height*2*tan*depth};
}
