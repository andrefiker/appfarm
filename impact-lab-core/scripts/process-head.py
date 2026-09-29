"""Original BodyParts3D 4.0 head derivative. Python 3, trimesh 4.7.4,
fast-simplification 0.1.12, mapbox-earcut 1.0.3. No Blender or atlas executable content.
Usage: python scripts/process-head.py EXTRACTED_OBJ_DIR PARTOF_ELEMENT_TABLE OUTPUT_GLB
"""
from pathlib import Path
import sys,json,hashlib
import trimesh,numpy as np
import mapbox_earcut
folder,table,target=map(Path,sys.argv[1:]);rows=[l.split('\t') for l in table.read_text().splitlines()[1:]]
scene=trimesh.Scene();metadata=[]
def source(fma):
 files=sorted(set(l[2] for l in rows if l[0]==fma))
 meshes=[]
 for f in files:
  m=trimesh.load(folder/(f+'.obj'),force='mesh');m.merge_vertices();m.remove_unreferenced_vertices();meshes.append(m)
 return trimesh.util.concatenate(meshes),files

def transform(m):
 v=m.vertices.copy();m.vertices=np.column_stack([v[:,0]*.001,v[:,2]*.001-1.068,-v[:,1]*.001-.104]);return m

def boundary_loops(m):
 edges,counts=np.unique(m.edges_sorted,axis=0,return_counts=True);edges=edges[counts==1];adj={}
 for a,b in edges:adj.setdefault(a,[]).append(b);adj.setdefault(b,[]).append(a)
 visited=set();loops=[]
 for start in adj:
  if start in visited or len(adj[start])!=2:continue
  loop=[start];visited.add(start);previous=start;current=adj[start][0]
  while current!=start and current not in visited and len(adj[current])==2:
   loop.append(current);visited.add(current);nxt=next(x for x in adj[current] if x!=previous);previous,current=current,nxt
  if current==start:loops.append(loop)
 return loops

def close_boundaries(m):
 faces=list(m.faces)
 for loop in boundary_loops(m):
  pts=m.vertices[loop];origin=pts.mean(0);_,_,axes=np.linalg.svd(pts-origin);xy=np.ascontiguousarray((pts-origin)@axes[:2].T,dtype=np.float64)
  triangles=mapbox_earcut.triangulate_float64(xy,np.array([len(loop)],dtype=np.uint32)).reshape(-1,3)
  faces.extend(np.asarray(loop)[triangles])
 m=trimesh.Trimesh(vertices=m.vertices,faces=faces,process=True);m.fix_normals(multibody=True);return m

def skin_envelope(m):
 # BP3D skin is a thin two-surface shell. Sample its OUTER silhouette so the
 # app's body-envelope convention does not mistake inner skin for a body exit.
 heights=np.linspace(.332,.5725,112);angles=np.linspace(-np.pi,np.pi,160,endpoint=False);origins=[];directions=[]
 for y in heights:
  for a in angles:
   direction=np.array([np.cos(a),0,np.sin(a)]);origins.append(np.array([0,y,-.026])+direction*.26);directions.append(-direction)
 origins=np.array(origins);directions=np.array(directions);points=np.zeros_like(origins)
 for begin in range(0,len(origins),1024):
  hits,ids,_=m.ray.intersects_location(origins[begin:begin+1024],directions[begin:begin+1024],multiple_hits=False);points[begin+ids]=hits
 missing=np.flatnonzero(~points.any(axis=1))
 for i in missing:
  row=i//len(angles);valid=np.flatnonzero(points[row*len(angles):(row+1)*len(angles)].any(axis=1));assert len(valid)>0
  nearest=valid[np.argmin(np.abs(valid-i%len(angles)))];points[i]=points[row*len(angles)+nearest]
 faces=[];count=len(angles)
 for row in range(len(heights)-1):
  for col in range(count):
   a=row*count+col;b=row*count+(col+1)%count;faces.extend([[a,b,a+count],[b,b+count,a+count]])
 for row in [0,len(heights)-1]:
  center=points[row*count:(row+1)*count].mean(0);index=len(points);points=np.vstack([points,center]);faces.extend([[row*count+i,index,row*count+(i+1)%count] for i in range(count)])
 result=trimesh.Trimesh(vertices=points,faces=faces,process=True);result.fix_normals();return result

def join_torso(head):
 torso=trimesh.load(Path(__file__).parent.parent/'public/models/torso.glb',force='scene');body=max(torso.geometry.values(),key=lambda g:len(g.vertices)).copy();body.merge_vertices()
 body=body.slice_plane([0,.314,0],[0,-1,0],cap=False);body.merge_vertices();head=head.slice_plane([0,.350,0],[0,1,0],cap=False);head.merge_vertices()
 a=max(boundary_loops(body),key=len);b=max(boundary_loops(head),key=len)
 def ordered(m,ids):
  points=m.vertices[ids];center=points.mean(0);angles=np.arctan2(points[:,2]-center[2],points[:,0]-center[0]);order=np.argsort(angles);return np.array(ids)[order],angles[order]
 a,aa=ordered(body,a);b,bb=ordered(head,b);b=b+len(body.vertices);verts=list(np.vstack([body.vertices,head.vertices]));faces=list(body.faces)+list(head.faces+len(body.vertices))
 def stitch(a,aa,b,bb):
  i=j=0
  while i<len(a) or j<len(b):
   ai=a[i%len(a)];bj=b[j%len(b)];na=aa[(i+1)%len(a)]+(2*np.pi if i+1>=len(a) else 0);nb=bb[(j+1)%len(b)]+(2*np.pi if j+1>=len(b) else 0)
   if j==len(b) or (i<len(a) and na<=nb):faces.append([ai,a[(i+1)%len(a)],bj]);i+=1
   else:faces.append([ai,b[(j+1)%len(b)],bj]);j+=1
 theta=np.linspace(-np.pi,np.pi,192,endpoint=False)
 def resample(ids,angles):
  xyz=np.array(verts)[ids];return np.column_stack([np.interp(theta,np.r_[angles[-1]-2*np.pi,angles,angles[0]+2*np.pi],np.r_[xyz[-1,k],xyz[:,k],xyz[0,k]]) for k in range(3)])
 lower=resample(a,aa);upper=resample(b,bb);last,lastangles=a,aa
 for t in np.linspace(.08,.92,9):
  points=lower*(1-t)+upper*t;ring=np.arange(len(verts),len(verts)+len(points));verts.extend(points);stitch(last,lastangles,ring,theta);last,lastangles=ring,theta
 stitch(last,lastangles,b,bb)
 verts=np.array(verts)

 m=trimesh.Trimesh(vertices=verts,faces=faces,process=True);m.merge_vertices(digits_vertex=5);m=close_boundaries(m)
 # Local neck relaxation only; all torso/head anatomy outside the join is preserved.
 adjacency=m.vertex_neighbors;selection=np.flatnonzero((m.vertices[:,1]>.305)&(m.vertices[:,1]<.362));vertices=m.vertices.copy()
 for strength in [.35,-.36]*8:
  before=vertices.copy()
  for index in selection:
   if adjacency[index]:vertices[index]+=strength*(before[adjacency[index]].mean(0)-before[index])
 # Smooth the neck connector to a human neck envelope; retain face and chest.
 for index in selection:
  t=np.clip((vertices[index,1]-.285)/.105,0,1);w=np.sin(np.pi*t)**2*.88;x,z=vertices[index,0],vertices[index,2]+.035;a=np.arctan2(z/.049,x/.057);target=np.array([np.cos(a)*(.052+.012*(1-t)**3),vertices[index,1],-.035+np.sin(a)*(.044+.013*t**3)]);vertices[index]=vertices[index]*(1-w)+target*w
 m.vertices=vertices;m.fix_normals();return m

def add(fma,name,layer,limit):
 m,files=source(fma)
 if layer=='skin':
  m=m.slice_plane([0,0,1400],[0,0,1],cap=False);m.merge_vertices()
  # The neck section is one convex contour: close it with a deterministic fan.
  edges=m.edges_sorted;unique,counts=np.unique(edges,axis=0,return_counts=True);boundary=unique[counts==1]
  boundary=boundary[np.all(np.abs(m.vertices[boundary,2]-1400)<.001,axis=1)]
  center=m.vertices[np.unique(boundary)].mean(axis=0);idx=len(m.vertices)
  m=trimesh.Trimesh(vertices=np.vstack([m.vertices,center]),faces=np.vstack([m.faces,np.column_stack([boundary,np.full(len(boundary),idx)])]),process=True);m.fix_normals()
 m=transform(m)
 if layer=='skin':
  # Match the previous torso's neck dimensions across the lower 25 mm.
  t=np.clip((m.vertices[:,1]-.332)/.025,0,1);m.vertices[:,0]*=.78+.22*t;m.vertices[:,2]=(m.vertices[:,2]+.026)*(.65+.35*t)-.026
 if layer=='skin':m=skin_envelope(m)
 elif len(m.faces)>limit:m=m.simplify_quadric_decimation(face_count=limit)
 m.merge_vertices();m=close_boundaries(m)
 if layer!='skin' and not m.is_watertight:
  vox=m.voxelized(pitch=.002).fill();m=vox.marching_cubes;m.apply_transform(vox.transform);m.fix_normals(multibody=True)
 if layer=='skin':m=join_torso(m)
 sid='skin' if layer=='skin' else 'bp3d_'+fma.lower()
 mat=trimesh.visual.material.PBRMaterial(baseColorFactor=[180,135,108,255] if layer=='skin' else [220,207,173,255] if layer=='bone' else [177,137,130,255],roughnessFactor=.86)
 m.visual=trimesh.visual.TextureVisuals(material=mat)
 extra={'structureId':sid,'anatomicalName':name,'layer':layer,'source':'BodyParts3D 4.0','sourceFMA':fma}
 scene.add_geometry(m,node_name=sid,geom_name=sid,metadata=extra)
 metadata.append({**extra,'sourceFiles':files,'sourceHashes':{f:hashlib.sha256((folder/(f+'.obj')).read_bytes()).hexdigest() for f in files},'faces':len(m.faces),'bounds':m.bounds.tolist(),'watertight':m.is_watertight})
add('FMA7163','Skin','skin',22000)
for fma,name in [('FMA52734','Frontal bone'),('FMA52735','Occipital bone'),('FMA52738','Right temporal bone'),('FMA52739','Left temporal bone'),('FMA52788','Right parietal bone'),('FMA52789','Left parietal bone'),('FMA52748','Mandible'),('FMA53649','Right maxilla'),('FMA53650','Left maxilla'),('FMA52736','Sphenoid bone')]:add(fma,name,'bone',2200)
for fma,name in [('FMA72969','Right frontal lobe'),('FMA72970','Left frontal lobe'),('FMA72971','Right temporal lobe'),('FMA72972','Left temporal lobe'),('FMA72973','Right parietal lobe'),('FMA72974','Left parietal lobe'),('FMA72975','Right occipital lobe'),('FMA72976','Left occipital lobe'),('FMA67944','Cerebellum')]:add(fma,name,'organ',2200)
target.write_bytes(scene.export(file_type='glb',include_normals=True));target.with_suffix('.json').write_text(json.dumps(metadata,indent=2));print(json.dumps({'structures':len(metadata),'faces':sum(m['faces'] for m in metadata),'bytes':target.stat().st_size,'closed':sum(m['watertight'] for m in metadata),'skin':metadata[0]},indent=2))
