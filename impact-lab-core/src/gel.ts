import * as THREE from 'three';
import type {DamageEvent} from './damage';
import {profile,shotArrivalFrame} from './shot-profiles';

/** Camera-readable gel surrogate. No measured material or ammunition parameters. */
export function gelMaterial(){
 const m=new THREE.MeshPhysicalMaterial({color:'#d99319',roughness:.25,metalness:0,transparent:true,opacity:.46,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,clearcoat:.65,clearcoatRoughness:.22,envMapIntensity:.65});
 m.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`if(!gl_FrontFacing)discard;float rim=pow(1.-abs(dot(normal,normalize(vViewPosition))),2.3);
 diffuseColor.a=clamp(diffuseColor.a+rim*.48,.18,.82);
 #include <opaque_fragment>`);
 };
 return m;
}
export interface GelTrack {event:DamageEvent;start:THREE.Vector3;end:THREE.Vector3;energy:number;count:number;lastId:number;scale:number;pulse:number;pathStart:number;pathEnd:number;}
/** Merge only almost coincident segments; bone deflections retain their bend. */
export function gelTracks(events:DamageEvent[]):GelTrack[]{
 const tracks:GelTrack[]=[];
 for(const e of events){if(e.tool!=='projectile')continue;const total=(e.physical?.path??[]).reduce((a,l)=>a+l.start.distanceTo(l.end),0);let travelled=0;for(const l of e.physical?.path??[]){const pathStart=travelled/Math.max(total,.00001);travelled+=l.start.distanceTo(l.end);const pathEnd=travelled/Math.max(total,.00001);if(l.start.distanceTo(l.end)<.002)continue;
  const direction=l.end.clone().sub(l.start).normalize();const old=tracks.find(t=>t.start.distanceTo(l.start)<.012&&t.end.distanceTo(l.end)<.025&&t.end.clone().sub(t.start).normalize().dot(direction)>.985);
  if(old){old.count++;old.lastId=e.id;old.energy=Math.max(old.energy,l.energyIn);old.scale=Math.max(old.scale,profile(e.weapon).width);old.pulse=profile(e.weapon).pulse;old.event=e;old.pathStart=pathStart;old.pathEnd=pathEnd;}
  else tracks.push({event:e,start:l.start.clone(),end:l.end.clone(),energy:l.energyIn,count:1,lastId:e.id,scale:profile(e.weapon).width,pulse:profile(e.weapon).pulse,pathStart,pathEnd});
 }}return tracks;
}
export function gelRadius(count:number){return Math.min(.025,.0075+.0035*Math.sqrt(Math.max(0,count-1)));}
export function cavityExpansion(frame:number){const t=THREE.MathUtils.clamp(frame/96,0,1);return t<.09?0:1+1.35*Math.sin(Math.PI*THREE.MathUtils.clamp((t-.09)/.56,0,1))**2;}
export class GelRenderer {
 group=new THREE.Group();tracks:GelTrack[]=[];private meshes:THREE.Mesh[]=[];
 clear(){for(const mesh of this.meshes){mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}this.meshes=[];this.tracks=[];this.group.clear();}
 update(events:DamageEvent[]){this.clear();this.tracks=gelTracks(events);for(const t of this.tracks){const direction=t.end.clone().sub(t.start),length=direction.length();
  // Closed, corrugated cavity: irregular walls, narrow entries, expanded central region.
  const rings=22,sides=16,positions:number[]=[],indices:number[]=[],radius=gelRadius(t.count)*t.scale;
  for(let r=0;r<=rings;r++){const u=r/rings,profile=.12+.88*Math.sin(Math.PI*u)**.65;for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,crease=1+.11*Math.sin(a*5+u*19)+.065*Math.cos(a*9-u*31);positions.push(Math.cos(a)*radius*profile*crease,Math.sin(a)*radius*profile*crease,u*length);}}
  for(let r=0;r<rings;r++)for(let j=0;j<sides;j++){const a=r*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1);}
  for(const [ring,sign] of [[0,-1],[rings,1]]){const c=positions.length/3;positions.push(0,0,ring/rings*length);for(let j=0;j<sides;j++){const a=ring*(sides+1)+j;indices.push(c,sign>0?a:a+1,sign>0?a+1:a);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  const m=new THREE.MeshStandardMaterial({color:'#719d9d',roughness:.34,metalness:0,side:THREE.DoubleSide,transparent:true,opacity:.82,depthWrite:false,envMapIntensity:.35});
  const mesh=new THREE.Mesh(g,m);mesh.position.copy(t.start);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction.normalize());mesh.renderOrder=3;mesh.userData={lastId:t.lastId,track:t,rest:new Float32Array(g.attributes.position.array),arrivals:Float32Array.from({length:g.attributes.position.count},(_,i)=>shotArrivalFrame(t.event,t.pathStart+g.attributes.position.getZ(i)/Math.max(.00001,length)*(t.pathEnd-t.pathStart))),length};this.group.add(mesh);this.meshes.push(mesh);
 }}
 pose(frame=96,eventId:number|number[]=-1){const activeIds=Array.isArray(eventId)?eventId:[eventId];for(const mesh of this.meshes){const active=activeIds.includes(mesh.userData.lastId),t=mesh.userData.track as GelTrack,rest=mesh.userData.rest as Float32Array,p=mesh.geometry.attributes.position;if(!active&&!mesh.userData.dynamic)continue;mesh.userData.dynamic=active&&frame<96;(mesh.material as THREE.Material).depthTest=!(active&&frame>=12&&frame<96);mesh.visible=true;for(let i=0;i<p.count;i++){const k=i*3,u=rest[k+2]/Math.max(.00001,mesh.userData.length),arrival=mesh.userData.arrivals[i],local=(frame-arrival)/Math.max(1,96-arrival),old=t.count>1?gelRadius(t.count-1)/gelRadius(t.count):0;const factor=!active||frame>=96?1:local<0?old:Math.max(old,1+t.pulse*Math.sin(Math.PI*THREE.MathUtils.clamp(local/.72,0,1))**2);p.setXYZ(i,rest[k]*factor,rest[k+1]*factor,rest[k+2]);}p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();}}
 setView(view:string,plane:THREE.Plane){this.group.visible=view==='skin'||view==='cutaway';for(const mesh of this.meshes)(mesh.material as THREE.Material).clippingPlanes=view==='cutaway'?[plane]:[];}
}
