import * as THREE from 'three';
import type {DamageEvent,Contact} from './damage';
import type {Structure} from './anatomy';
import {pickContact} from './interaction';
export type WeaponId='legacy'|'pistol'|'rifle'|'shotgun';
// Artistic normalized values, not real cartridges, velocities or gel calibration.
export const SHOT_PROFILES={
 legacy:{label:'Projectile',energy:1,width:1,pulse:1.35,pellets:1,description:'Original shot'},
 pistol:{label:'Pistol',energy:.72,width:.82,pulse:.9,pellets:1,description:'Compact single channel'},
 rifle:{label:'Rifle',energy:1.22,width:1.2,pulse:1.8,pellets:1,description:'Stronger cavity pulse'},
 shotgun:{label:'Shotgun',energy:.44,width:.6,pulse:.8,pellets:3,description:'Three illustrative pellet tracks'}
} as const;
export function profile(id?:string){return SHOT_PROFILES[id as WeaponId]??SHOT_PROFILES.legacy;}
export function latestShot(events:DamageEvent[]){const last=events.at(-1);return !last?[]:last.shotId===undefined?[last]:events.filter(e=>e.shotId===last.shotId);}
export function replayShot(events:DamageEvent[]):DamageEvent{const last=events.at(-1)!;if(events.length<2)return last;return {...last,physical:{...last.physical!,contacts:events.flatMap(e=>e.physical?.contacts??[]),fractures:events.flatMap(e=>e.physical?.fractures??[]),responseById:Object.assign({},...events.map(e=>e.physical?.responseById??{}))}};}
export function shotContacts(structures:Structure[],contact:Contact,id:WeaponId){if(id!=='shotgun')return [contact];const d=contact.direction,up=new THREE.Vector3(0,1,0),u=new THREE.Vector3().crossVectors(d,up).normalize();if(u.lengthSq()<.01)u.set(1,0,0);const v=new THREE.Vector3().crossVectors(u,d).normalize();const source=contact.point.clone().addScaledVector(d,-.38),contacts:Contact[]=[];
 // Three representative pellets: deterministic pattern, independently intersected.
 for(const [x,y] of [[0,0],[-.030,.022],[.028,-.023]]){const target=contact.point.clone().addScaledVector(u,x).addScaledVector(v,y);const ray=new THREE.Raycaster(source,target.sub(source).normalize());const c=pickContact(structures,ray);if(c)contacts.push(c);}return contacts;
}
export function shotPosition(e:DamageEvent,frame:number){const approach=e.point.clone().addScaledVector(e.direction,-.19);if(frame<12)return {point:approach.lerp(e.point,Math.max(0,frame)/12),direction:e.direction.clone(),fraction:0};const legs=e.physical?.path??[],total=legs.reduce((a,l)=>a+l.start.distanceTo(l.end),0),fraction=THREE.MathUtils.clamp((frame-12)/36,0,1);let distance=total*fraction;for(const l of legs){const length=l.start.distanceTo(l.end);if(distance<=length)return {point:l.start.clone().lerp(l.end,distance/Math.max(length,.000001)),direction:l.end.clone().sub(l.start).normalize(),fraction};distance-=length;}return {point:e.end.clone(),direction:e.direction.clone(),fraction};}
