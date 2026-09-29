import * as THREE from 'three';
import type {DamageEvent} from './damage';
import type {PathLeg} from './physics-state';

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
export interface GelTrack {start:THREE.Vector3;end:THREE.Vector3;energy:number;count:number;lastId:number;}
/** Merge only almost coincident segments; bone deflections retain their bend. */
export function gelTracks(events:DamageEvent[]):GelTrack[]{
 const tracks:GelTrack[]=[];
 for(const e of events){if(e.tool!=='projectile')continue;for(const l of e.physical?.path??[]){if(l.start.distanceTo(l.end)<.002)continue;
  const direction=l.end.clone().sub(l.start).normalize();const old=tracks.find(t=>t.start.distanceTo(l.start)<.018&&t.end.distanceTo(l.end)<.025&&t.end.clone().sub(t.start).normalize().dot(direction)>.985);
  if(old){old.count++;old.lastId=e.id;old.energy=Math.max(old.energy,l.energyIn);}
  else tracks.push({start:l.start.clone(),end:l.end.clone(),energy:l.energyIn,count:1,lastId:e.id});
 }}return tracks;
}
export function gelRadius(count:number){return Math.min(.025,.0075+.0035*Math.sqrt(Math.max(0,count-1)));}
export function cavityExpansion(frame:number){const t=THREE.MathUtils.clamp(frame/96,0,1);return t<.09?0:1+1.35*Math.sin(Math.PI*THREE.MathUtils.clamp((t-.09)/.56,0,1))**2;}
export class GelRenderer {
 group=new THREE.Group();tracks:GelTrack[]=[];private meshes:THREE.Mesh[]=[];
 clear(){for(const mesh of this.meshes){mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}this.meshes=[];this.tracks=[];this.group.clear();}
 update(events:DamageEvent[]){this.clear();this.tracks=gelTracks(events);for(const t of this.tracks){const direction=t.end.clone().sub(t.start),length=direction.length();
  // Closed, corrugated cavity: irregular walls, narrow entries, expanded central region.
  const rings=22,sides=16,positions:number[]=[],indices:number[]=[],radius=gelRadius(t.count);
  for(let r=0;r<=rings;r++){const u=r/rings,profile=.12+.88*Math.sin(Math.PI*u)**.65;for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,crease=1+.11*Math.sin(a*5+u*19)+.065*Math.cos(a*9-u*31);positions.push(Math.cos(a)*radius*profile*crease,Math.sin(a)*radius*profile*crease,u*length);}}
  for(let r=0;r<rings;r++)for(let j=0;j<sides;j++){const a=r*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1);}
  for(const [ring,sign] of [[0,-1],[rings,1]]){const c=positions.length/3;positions.push(0,0,ring/rings*length);for(let j=0;j<sides;j++){const a=ring*(sides+1)+j;indices.push(c,sign>0?a:a+1,sign>0?a+1:a);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  const m=new THREE.MeshStandardMaterial({color:'#f2e4be',roughness:.34,metalness:0,side:THREE.DoubleSide,transparent:true,opacity:.62,depthWrite:false,envMapIntensity:.35});
  const mesh=new THREE.Mesh(g,m);mesh.position.copy(t.start);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction.normalize());mesh.renderOrder=3;mesh.userData.lastId=t.lastId;this.group.add(mesh);this.meshes.push(mesh);
 }}
 pose(frame=96,eventId=-1){for(const mesh of this.meshes){const active=mesh.userData.lastId===eventId,factor=active?cavityExpansion(frame):1;mesh.visible=factor>0;mesh.scale.set(factor,factor,1);}}
 setView(view:string,plane:THREE.Plane){this.group.visible=view==='skin'||view==='cutaway';for(const mesh of this.meshes)(mesh.material as THREE.Material).clippingPlanes=view==='cutaway'?[plane]:[];}
}
