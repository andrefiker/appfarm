"""Blender 4.2 CLI: --background --factory-startup --disable-autoexec --python this.py -- INPUT.blend OUTPUT.glb
Only selected atlas meshes are loaded. No upstream scripts are executed.
"""
import bpy,bmesh,json,re,sys,os,hashlib
from mathutils import Matrix,Vector
args=sys.argv[sys.argv.index('--')+1:]; source,target=args
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
skin_names=['Anterior region of thigh','Posterior region of thigh','Vertebral region','Umbilical region','Sternocleidomastoid region','Scapular region','Sacral region','Hip region','Presternal region','Posterior region of neck','Pectoral region','Mammary region','Lumbar region','Lateral region of thorax','Lateral region of neck','Lateral region of abdomen','Interscapular region','Inguinal region','Infrascapular region','Inframammary region','Hypogastric region','Hypochondriac region','Gluteal region','Epigastric region','Deltoid region','Triangle of auscultation','Muscular triangle','Lesser supraclavicular fossa','Greater supraclavicular fossa','Deltopectoral triangle','Carotid triangle']
muscle_names=['Sternocostal head of pectoralis major muscle','Clavicular head of pectoralis major muscle','Rectus abdominis muscle','External abdominal oblique muscle','Latissimus dorsi muscle','Descending part of trapezius muscle','Transverse part of trapezius muscle','Ascending part of trapezius muscle','Serratus anterior muscle','Sternocleidomastoid muscle','Clavicular part of deltoid muscle','Acromial part of deltoid muscle','Scapular spinal part of deltoid muscle']
organs=['Superior lobe of right lung','Middle lobe of right lung','Inferior lobe of right lung','Superior lobe of left lung','Inferior lobe of left lung','Right ventricle','Left ventricle','Right atrium','Left atrium','Liver','Stomach','Jejunum','Ileum','Ascending colon','Descending colon','Transverse colon','Sigmoid colon','Duodenum','Diaphragm','Ascending aorta','Thoracic aorta','Superior vena cava','Pulmonary trunk']
def kind(n):
 if n in [s+'.'+side for s in skin_names for side in ['l','r']]:return 'skin'
 if n in [s+'.'+side for s in muscle_names for side in ['l','r']]:return 'muscle'
 if n in organs:return 'organ'
 if re.match(r'^(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth) rib\.[rl]$',n) or re.match(r'^Costal cartilage of .*\.[rl]$',n):return 'bone'
 if re.match(r'^Vertebra [TLC]\d+$',n) or re.match(r'^Intervertebral disc ',n):return 'bone'
 if n in ['Clavicle.l','Clavicle.r','Scapula.l','Scapula.r','Hip bone.l','Hip bone.r','Sacrum','Coccyx','Manubrium of sternum','Body of sternum','Xiphoid process']:return 'bone'
 return None
with bpy.data.libraries.load(source,link=False) as (src,dst):dst.objects=[n for n in src.objects if kind(n)]
for o in list(bpy.data.objects):
 if o.name not in bpy.context.scene.objects:bpy.context.collection.objects.link(o)
bpy.context.view_layer.update()
# Snapshot transforms before detaching dependency parents.
worlds={o.name:o.matrix_world.copy() for o in dst.objects if o}
kept=[];skin=[];meta=[]
for o in dst.objects:
 if not o or o.type not in ['MESH','CURVE']:continue
 k=kind(o.name)
 if not k:continue
 o.hide_set(False);o.hide_viewport=False;o.hide_render=False
 o.data=o.data.copy()
 o.parent=None;o.matrix_world=worlds[o.name]
 bpy.ops.object.select_all(action='DESELECT')
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 if o.type=='CURVE':
  o.data.resolution_u=6;o.data.bevel_resolution=3
  bpy.ops.object.convert(target='MESH')
 # Skin patches must be welded before subdivision, without individual solidify seams.
 if k=='skin':o.modifiers.clear()
 else:
  for m in list(o.modifiers):
   if m.type=='SUBSURF':m.levels=0 if k=='bone' else 1;m.render_levels=m.levels
   try:bpy.ops.object.modifier_apply(modifier=m.name)
   except:pass
 o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4)
 if k=='skin':skin.append(o)
 else:kept.append((o,k))
 o.select_set(False)
# Join continuous outer skin patches, weld seams, cap intentional crop boundaries.
bpy.ops.object.select_all(action='DESELECT')
for o in skin:o.select_set(True)
bpy.context.view_layer.objects.active=skin[0];bpy.ops.object.join();body=bpy.context.object;body.name='Skin'
bm=bmesh.new();bm.from_mesh(body.data)
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.0018)
bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(body.data);bm.free()
sub=body.modifiers.new('Continuous skin refinement','SUBSURF');sub.levels=2;bpy.ops.object.modifier_apply(modifier=sub.name)
kept.append((body,'skin'))
# Normalize: Blender x subject-left, z superior, -y anterior. glTF exporter makes x left, y up, z anterior.
for o,k in kept:
 bpy.context.view_layer.objects.active=o
 bm=bmesh.new();bm.from_mesh(o.data)
 for co,no in [((0,0,.86),(0,0,-1)),((0,0,1.515),(0,0,1)),((.205,0,0),(1,0,0)),((-.205,0,0),(-1,0,0))]:
  bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=co,plane_no=no,clear_outer=True,dist=0.00001)
 bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 if not bm.faces:bm.free();continue
 for v in bm.verts:v.co.z-=1.18
 bm.to_mesh(o.data);bm.free()
 o.data.materials.clear()
 mat=bpy.data.materials.new('core_'+k);mat.diffuse_color={'skin':(.55,.34,.23,1),'muscle':(.46,.12,.10,1),'bone':(.77,.71,.55,1),'organ':(.46,.24,.23,1)}[k];mat.use_nodes=True
 mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=mat.diffuse_color
 mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.78
 o.data.materials.append(mat)
 for p in o.data.polygons:p.material_index=0;p.use_smooth=True
 # Preserve large skin vertex field for small, stable deformations; optimize other structures.
 if len(o.data.polygons)>1800 and k!='skin':
  dec=o.modifiers.new('Mobile simplification','DECIMATE');dec.ratio=1800/len(o.data.polygons);bpy.ops.object.modifier_apply(modifier=dec.name)
 sid=re.sub(r'[^a-z0-9]+','_',o.name.lower()).strip('_')
 o['structureId']=sid;o['layer']=k;o['anatomicalName']=o.name
 meta.append({'id':sid,'name':o.name,'layer':k,'sourceObject':o.name,'vertices':len(o.data.vertices),'polygons':len(o.data.polygons)})
 o.select_set(False)
# Only selected meshes, no atlas empties, text, hidden application content or cameras.
bpy.ops.object.select_all(action='DESELECT')
for o,k in kept:
 if o.get('structureId'):o.select_set(True)
os.makedirs(os.path.dirname(target),exist_ok=True)
bpy.ops.export_scene.gltf(filepath=target,export_format='GLB',use_selection=True,export_extras=True,export_animations=False,export_cameras=False,export_lights=False,export_yup=True)
json.dump(meta,open(os.path.join(os.path.dirname(target),'anatomy-metadata.json'),'w'),indent=2)
print('EXPORTED',len(meta),'STRUCTURES',sum(m['polygons'] for m in meta),'POLYGONS',flush=True)
