/* Extract embedded WebGL2 GLSL for glslangValidator in CI. */
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../web/shader.js'),'utf8');
for(const [label,extension] of [['VERT','vert'],['FRAG','frag']]){
  const match=source.match(new RegExp('const '+label+' = `([\\s\\S]*?)`'+ ';'));
  if(!match)throw Error('Could not extract '+label+' GLSL');
  const out=path.join(os.tmpdir(),'singularity.'+extension);
  fs.writeFileSync(out,match[1].trimStart()+'\n');
  console.log(out,match[1].length,'characters');
}
