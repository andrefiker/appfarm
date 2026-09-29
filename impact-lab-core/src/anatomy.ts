import * as THREE from 'three';
import {MeshBVH,acceleratedRaycast} from 'three-mesh-bvh';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export type Layer='skin'|'muscle'|'bone'|'organ';
export type View='skin'|'muscle'|'skeleton'|'organs'|'cutaway';
export interface Structure {id:string;name:string;layer:Layer;mesh:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;base:Float32Array;normals:Float32Array;}
export async function loadAnatomy():Promise<Structure[]> {
 const gltf=await new GLTFLoader().loadAsync('./models/torso.glb');return structuresFromScene(gltf.scene);
}
export function structuresFromScene(scene:THREE.Object3D):Structure[]{const structures:Structure[]=[];scene.updateMatrixWorld(true);
 scene.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const d=o.userData;const layer=d.layer as Layer;if(!layer)return;
  const geometry=o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);geometry.computeVertexNormals();
  geometry.boundsTree=new MeshBVH(geometry,{indirect:true,maxLeafTris:10});
  const name=d.anatomicalName as string;const material=tissueMaterial(layer,name);const mesh=new THREE.Mesh(geometry,material);
  mesh.raycast=acceleratedRaycast;mesh.name=d.structureId;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={...d};
  structures.push({id:d.structureId,name,layer,mesh,base:new Float32Array(geometry.attributes.position.array),normals:new Float32Array(geometry.attributes.normal.array)});
 });return structures;
}
export function tissueMaterial(layer:Layer,name:string){
 let color=layer==='skin'?'#b88970':layer==='bone'?'#ddd0ac':layer==='muscle'?'#96483d':'#b97d72';
 if(/lung/.test(name))color='#b98e86';if(name==='Liver')color='#8b4846';if(name==='Stomach')color='#c18b74';if(/colon|Jejunum|Ileum|Duodenum/.test(name))color='#bf9b7c';if(/ventricle|atrium/.test(name))color='#934d46';if(name==='Diaphragm')color='#b37160';if(/cartilage|disc/i.test(name))color='#b9c2b7';
 const mat=new THREE.MeshStandardMaterial({color,roughness:layer==='bone'?.84:.82,metalness:0,side:THREE.DoubleSide});
 const fiber=/pectoralis/.test(name)?new THREE.Vector3(.35,.9,.12):/oblique/.test(name)?new THREE.Vector3(.8,.45,.2):new THREE.Vector3(1,.08,.25);
 mat.onBeforeCompile=shader=>{
  shader.uniforms.uTissue={value:layer==='skin'?0:layer==='muscle'?1:layer==='bone'?2:3};shader.uniforms.uFiber={value:fiber};
  shader.vertexShader='varying vec3 vAnatomy;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAnatomy=position;');
  shader.fragmentShader='varying vec3 vAnatomy;\nuniform float uTissue;\nuniform vec3 uFiber;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float grain=fract(sin(dot(floor(vAnatomy*2300.),vec3(12.9898,78.233,45.164)))*43758.5453);
   float broad=sin(vAnatomy.x*53.+vAnatomy.z*28.)*sin(vAnatomy.y*39.);
   if(uTissue<.5){diffuseColor.rgb*=.96+.045*grain+.025*broad;}
   else if(uTissue<1.5){float phase=dot(vAnatomy,uFiber)*1900.+sin(vAnatomy.y*140.)*.7;float fibers=.5+.5*sin(phase)*(1.-smoothstep(.6,2.5,fwidth(phase)));diffuseColor.rgb*=.88+.20*fibers+.025*grain;}
   else if(uTissue<2.5){diffuseColor.rgb*=.93+.07*grain+.03*broad;}
   else{float mottling=sin(vAnatomy.x*293.+sin(vAnatomy.z*163.)*2.)*sin(vAnatomy.y*337.+sin(vAnatomy.x*89.)*1.8);diffuseColor.rgb*=.98+.02*mottling+.02*grain;}`);
 };mat.customProgramCacheKey=()=>`anatomy-${layer}`;return mat;
}
