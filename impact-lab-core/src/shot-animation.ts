import * as THREE from 'three';import type {DamageEvent} from './damage';import {shotPosition,profile} from './shot-profiles';
/** Bounded exhibition overlay follows recorded paths; never computes new hits. */
export class ShotAnimation {
 group=new THREE.Group();events:DamageEvent[]=[];tips:THREE.Mesh[]=[];trails:THREE.Line[]=[];
 constructor(){for(let i=0;i<3;i++){const tip=new THREE.Mesh(new THREE.SphereGeometry(.004,10,8),new THREE.MeshBasicMaterial({color:'#ffe8a7',depthTest:false}));tip.renderOrder=10;const trail=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#ffe4a1',transparent:true,opacity:.72,depthTest:false}));trail.renderOrder=9;this.group.add(tip,trail);this.tips.push(tip);this.trails.push(trail);}this.clear();}
 setEvents(events:DamageEvent[]){this.events=events.slice(-3);this.pose(96);}
 clear(){this.events=[];for(const o of this.group.children)o.visible=false;}
 pose(frame:number){for(let i=0;i<3;i++){const e=this.events[i],tip=this.tips[i],trail=this.trails[i];tip.visible=!!e&&(frame<52||!e.exit);trail.visible=!!e&&frame>0&&frame<65;if(!e)continue;const pose=shotPosition(e,frame),size=profile(e.weapon).width;tip.position.copy(pose.point);tip.scale.setScalar(size*(frame<52?1:.55));(tip.material as THREE.MeshBasicMaterial).color.set(frame<52?'#ffe8a7':'#ad7740');const behind=pose.point.clone().addScaledVector(pose.direction,-.035);trail.geometry.setFromPoints([behind,pose.point]);(trail.material as THREE.LineBasicMaterial).opacity=frame<48?.72:Math.max(0,.72*(65-frame)/17);}}
}
