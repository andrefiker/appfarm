import './style.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {loadAnatomy,type View,type Structure} from './anatomy';
const stage=document.querySelector<HTMLElement>('#stage')!;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor('#e9e7df',1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;stage.append(renderer.domElement);
const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(37,1,.01,10);camera.position.set(0,.015,1.28);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,-.015,0);controls.enablePan=false;controls.enableDamping=true;controls.minDistance=.58;controls.maxDistance=1.9;controls.minPolarAngle=.4;controls.maxPolarAngle=2.65;controls.rotateSpeed=.65;
scene.add(new THREE.HemisphereLight('#fff5e4','#788b7c',1.65));
function light(x:number,y:number,z:number,intensity:number){const l=new THREE.DirectionalLight('#fff5e8',intensity);l.position.set(x,y,z);scene.add(l);return l;}
const key=light(-1,1.4,1.4,2.6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-.55;key.shadow.camera.right=.55;key.shadow.camera.top=.7;key.shadow.camera.bottom=-.6;key.shadow.camera.near=.1;key.shadow.camera.far=5;key.shadow.bias=-.00015;key.shadow.normalBias=.002;
light(1,.4,-1,1.9);light(1,.2,1,.65);
const standMat=new THREE.MeshStandardMaterial({color:'#777c70',roughness:.86});
const post=new THREE.Mesh(new THREE.CylinderGeometry(.019,.022,.10,32),standMat);post.position.set(0,-.36,0);scene.add(post);
const base=new THREE.Mesh(new THREE.CylinderGeometry(.14,.15,.025,64),standMat);base.position.y=-.416;base.receiveShadow=true;scene.add(base);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.13}));ground.rotation.x=-Math.PI/2;ground.position.y=-.43;ground.receiveShadow=true;scene.add(ground);
let structures:Structure[]=[];let view:View='skin';
function setView(v:View){view=v;for(const s of structures)s.mesh.visible=v==='skin'?s.layer==='skin':v==='muscle'?s.layer==='muscle'||s.layer==='bone':v==='skeleton'?s.layer==='bone':v==='organs'?s.layer==='organ'&&s.name!=='Diaphragm':s.layer!=='skin';document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===v)));render();}
function resize(){const r=stage.getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();render();}new ResizeObserver(resize).observe(stage);
function render(){renderer.render(scene,camera);}let running=true;function loop(){requestAnimationFrame(loop);if(!running)return;controls.update();render();}document.addEventListener('visibilitychange',()=>{running=!document.hidden});loop();
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view as View));
const dialog=document.querySelector<HTMLDialogElement>('#about-dialog')!;document.querySelector<HTMLButtonElement>('#about')!.onclick=()=>dialog.showModal();document.querySelector<HTMLButtonElement>('#close-about')!.onclick=()=>dialog.close();
loadAnatomy().then(s=>{structures=s;for(const a of s)scene.add(a.mesh);setView('skin');document.querySelector('#loading')!.remove();(window as any).__core={setView,setCamera:(x:number,y:number,z:number)=>{camera.position.set(x,y,z);controls.update();render()},structures:()=>structures.map(s=>({id:s.id,name:s.name,layer:s.layer,vertices:s.base.length/3})),renderer:()=>renderer.info,ready:true};resize();}).catch(e=>{document.querySelector('#loading')!.textContent='Unable to load bundled anatomy. Reopen the app.';console.error(e)});
