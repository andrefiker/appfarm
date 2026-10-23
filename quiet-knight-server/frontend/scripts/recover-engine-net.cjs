// Recover the exact public NNUE bytes from the unmodified, pinned WASM module.
// LLVM splits zero-filled data in the file; initialized linear memory restores it.
// This is a source-distribution aid when upstream network mirrors are unavailable.
const {writeFileSync}=require('fs');const {createHash}=require('crypto');const {join}=require('path');
const init=require('stockfish');
init('lite-single').then(engine=>{
 const memory=Buffer.from(engine.HEAPU8.buffer),offset=memory.indexOf(Buffer.from('Network trained'))-12;
 if(offset<0)throw Error('NNUE header missing');
 const net=memory.subarray(offset,offset+6617595),sha=createHash('sha256').update(net).digest('hex');
 if(sha!=='9067e33176e8c5edb7aa8db6a3aedd012f84a1f39872e86357c6c2d0993f314d')throw Error('Unexpected NNUE bytes');
 writeFileSync(join(process.argv[2]||'.','nn-9067e33176e8.nnue'),net);console.log('Verified public NNUE source asset: '+sha);process.exit(0);
}).catch(error=>{console.error(error.message);process.exit(1);});
