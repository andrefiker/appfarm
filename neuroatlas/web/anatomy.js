/* Original scalable schematics. Coordinates are pedagogical, not stereotactic. */
(function(root){
const colors={cortex:'#758b91',frontal:'#6bbda9',parietal:'#a39bd0',temporal:'#d7a76b',occipital:'#829dc6',motor:'#d68a92',sensory:'#9eb9dd',dlpfc:'#9ad4bf',vmpfc:'#7ecbb8',ofc:'#9dd6b1',insula:'#edb881',acc:'#d9a080',pcc:'#b2a2d8',hippocampus:'#b6cd8a',amygdala:'#db8d97',thalamus:'#b2a2d8',hypothalamus:'#dfb275',basal:'#bca87d',cerebellum:'#879eb2',brainstem:'#aac2b8',callosum:'#d5d8cf',ventricles:'#76bbdc'};
const shape=(id,d)=>({id,d});
const lateral=[
shape('frontal','M68 233 C56 222 53 206 59 194 C53 178 66 161 76 154 C76 137 91 124 108 117 C115 101 130 93 147 92 C160 77 177 70 196 73 C213 59 235 55 251 61 C270 54 289 60 308 69 C294 106 294 132 275 160 C261 182 268 201 249 225 L179 252 C132 273 87 263 68 233 Z'),
shape('parietal','M308 69 C323 59 342 58 355 64 C372 57 392 66 401 73 C422 71 437 82 445 91 C458 90 466 97 471 105 L452 147 L424 219 L269 242 L249 225 C268 201 261 182 275 160 C294 132 294 106 308 69 Z'),
shape('occipital','M471 105 C489 110 501 125 505 139 C524 145 536 160 536 175 C551 187 560 202 561 216 C569 234 559 250 548 257 C540 274 512 282 476 287 L424 219 L452 147 Z'),
shape('temporal','M179 252 C206 248 230 249 269 242 C322 235 376 230 424 219 L476 287 C467 305 447 316 429 316 C413 333 390 340 372 336 C357 348 337 347 322 344 C301 355 277 351 263 344 C244 348 223 341 211 333 C190 333 178 324 171 311 C151 300 147 283 152 271 C156 260 165 255 179 252 Z'),
shape('brainstem','M330 331 L369 319 C371 348 371 363 393 382 L382 423 L355 416 C350 389 335 374 326 357 Z'),
shape('cerebellum','M402 315 C443 291 507 305 536 339 C562 370 522 399 470 399 C425 401 389 383 384 354 C378 337 386 324 402 315 Z'),
shape('motor','M286 68 L306 69 C291 108 290 133 273 157 C259 177 264 203 248 226 L230 234 C250 206 245 180 255 156 C274 130 278 102 286 68 Z'),
shape('sensory','M309 71 L331 74 C314 107 317 132 300 163 C288 181 287 210 271 237 L250 228 C270 198 265 177 278 157 C296 127 293 103 309 71 Z'),
shape('dlpfc','M105 158 C135 123 180 104 218 109 C235 115 231 148 212 167 C187 187 146 197 110 191 C100 183 100 172 105 158 Z')];
const medial=[
shape('frontal','M65 230 C43 183 77 120 136 91 C192 62 260 51 307 66 L286 136 C240 121 180 129 149 159 C123 185 139 214 157 239 C122 266 84 262 65 230 Z'),
shape('parietal','M307 66 C368 52 430 69 468 105 L444 179 L404 219 L354 160 L286 136 Z'),
shape('occipital','M468 105 C527 136 554 188 555 234 C549 271 491 292 431 284 L404 219 L444 179 Z'),
shape('temporal','M157 239 C208 253 262 262 316 259 L404 219 L431 284 C413 321 345 342 268 339 C209 336 167 304 145 279 Z'),
shape('brainstem','M332 253 L360 254 C358 279 364 300 375 315 C388 332 394 346 387 359 L380 423 L353 419 C352 392 342 375 330 359 C308 355 301 337 309 320 C314 308 322 302 321 289 Z'),
shape('cerebellum','M396 304 C445 287 509 313 531 348 C551 382 511 403 461 400 C423 398 388 384 381 355 C376 333 383 315 396 304 Z'),
shape('acc','M149 215 C124 180 147 149 181 132 C212 115 254 112 293 120 L300 144 C252 134 213 140 186 158 C166 171 167 191 178 207 Z'),
shape('pcc','M293 120 C336 125 376 147 389 174 L372 196 C350 167 325 150 300 144 Z'),
shape('callosum','M177 207 C158 181 180 157 213 148 C262 133 324 146 350 168 C375 188 361 219 339 223 L327 206 C346 205 349 192 331 180 C302 158 247 155 216 167 C196 174 190 188 197 200 Z'),
shape('ventricles','M203 199 C198 185 216 176 243 174 C278 171 310 180 320 191 L305 208 C273 196 243 195 220 205 Z'),
shape('thalamus','M235 216 C244 198 286 194 309 211 C328 229 314 251 286 257 C254 262 226 242 235 216 Z'),
shape('hypothalamus','M236 249 C251 263 279 268 288 257 L290 282 L263 294 L235 279 Z'),
shape('vmpfc','M99 230 C108 215 133 210 154 218 L170 244 L151 269 C125 272 103 258 99 230 Z')];
const inferior=[
shape('frontal','M305 69 C274 41 211 55 173 98 C139 130 131 164 141 205 L300 228 L306 190 L312 228 L471 205 C482 161 471 125 438 94 C405 55 346 42 315 69 Z'),
shape('temporal','M141 205 C92 219 87 275 110 326 C130 369 177 388 215 357 L258 256 L300 228 Z M471 205 C520 219 525 275 502 326 C482 369 435 388 397 357 L354 256 L312 228 Z'),
shape('occipital','M215 357 C207 383 229 413 263 414 C290 413 302 388 305 362 C311 388 323 413 350 414 C384 413 405 383 397 357 L350 324 L262 324 Z'),
shape('ofc','M162 132 C183 99 223 79 265 94 L287 189 L168 181 Z M450 132 C429 99 389 79 347 94 L325 189 L444 181 Z'),
shape('cerebellum','M195 324 C225 295 275 308 305 325 C335 308 385 295 415 324 C432 346 413 383 381 388 C350 391 323 376 305 365 C287 376 260 391 229 388 C197 383 178 346 195 324 Z'),
shape('brainstem','M284 227 L328 227 L338 292 C339 315 323 322 323 343 L317 388 L293 388 L287 343 C287 322 271 315 272 292 Z')];
const coronalBase=[
shape('cortex','M303 66 C241 36 167 68 124 129 C89 181 88 240 117 282 C143 314 191 315 231 292 L277 264 L305 268 L333 264 L379 292 C419 315 467 314 493 282 C522 240 521 181 486 129 C443 68 369 36 307 66 L306 122 L304 122 Z'),
shape('temporal','M117 282 C121 331 151 366 193 370 C230 369 255 342 262 301 L231 292 Z M493 282 C489 331 459 366 417 370 C380 369 355 342 348 301 L379 292 Z'),
shape('callosum','M223 150 C245 123 274 113 305 115 C336 113 365 123 387 150 L367 161 C347 143 327 138 305 139 C283 138 263 143 243 161 Z'),
shape('ventricles','M242 165 C256 151 281 148 295 155 L295 197 L280 198 L270 180 L253 190 Z M368 165 C354 151 329 148 315 155 L315 197 L330 198 L340 180 L357 190 Z'),
shape('basal','M278 199 C264 191 253 197 253 210 C257 222 269 227 277 221 Z M332 199 C346 191 357 197 357 210 C353 222 341 227 333 221 Z M212 174 C193 194 187 222 203 246 C214 257 240 244 250 219 L236 195 Z M398 174 C417 194 423 222 407 246 C396 257 370 244 360 219 L374 195 Z'),
shape('insula','M155 189 C145 204 149 232 164 250 L180 232 L177 207 Z M455 189 C465 204 461 232 446 250 L430 232 L433 207 Z')];
const coronalA=[...coronalBase,shape('amygdala','M229 287 C209 278 195 292 201 308 C209 327 234 325 245 309 C251 299 243 290 229 287 Z M381 287 C401 278 415 292 409 308 C401 327 376 325 365 309 C359 299 367 290 381 287 Z')];
const coronalP=[...coronalBase.filter(s=>s.id!=='basal'),shape('thalamus','M258 208 C266 194 286 193 296 210 L296 258 C274 264 251 249 250 232 Z M352 208 C344 194 324 193 314 210 L314 258 C336 264 359 249 360 232 Z'),shape('hippocampus','M223 299 C201 289 193 314 207 326 C220 339 242 331 251 317 L239 308 C232 319 221 320 217 313 Z M387 299 C409 289 417 314 403 326 C390 339 368 331 359 317 L371 308 C378 319 389 320 393 313 Z')];
const views={lateral:{name:'Lateral',caption:'Hemisfério esquerdo · vista lateral',orient:['ANTERIOR','POSTERIOR'],shapes:lateral},medial:{name:'Medial',caption:'Corte sagital esquemático · estruturas expostas',orient:['ANTERIOR','POSTERIOR'],shapes:medial},inferior:{name:'Inferior',caption:'Vista inferior · anterior no alto',orient:['DIREITO','ESQUERDO'],shapes:inferior},coronalA:{name:'Corte anterior',caption:'Corte coronal anterior · nível amigdaloide · córtex em cinza sem limites lobares',orient:['DIREITO','ESQUERDO'],shapes:coronalA},coronalP:{name:'Corte posterior',caption:'Corte coronal mais posterior · nível hipocampal · córtex em cinza sem limites lobares',orient:['DIREITO','ESQUERDO'],shapes:coronalP}};
const marks={lateral:{frontal:[150,219],parietal:[374,139],temporal:[294,294],occipital:[509,215],motor:[265,147],sensory:[298,150],dlpfc:[162,152],cerebellum:[463,354],brainstem:[360,382]},medial:{frontal:[114,151],parietal:[375,98],occipital:[504,218],temporal:[233,305],acc:[198,142],pcc:[350,154],callosum:[245,152],ventricles:[268,184],thalamus:[278,229],hypothalamus:[259,274],vmpfc:[131,240],cerebellum:[454,351],brainstem:[353,344]},inferior:{frontal:[248,80],temporal:[160,279],occipital:[265,397],ofc:[221,140],brainstem:[306,289],cerebellum:[372,347]},coronalA:{temporal:[168,329],callosum:[305,128],ventricles:[273,169],basal:[221,218],insula:[163,216],amygdala:[222,302]},coronalP:{temporal:[168,329],callosum:[305,128],ventricles:[273,169],insula:[163,216],thalamus:[277,232],hippocampus:[220,327]}};
const gyri={lateral:['M86 186 Q105 170 117 181','M104 137 Q119 150 139 136 Q159 121 171 131','M151 97 Q159 113 192 98 Q218 84 240 95','M87 218 Q114 228 137 211','M163 215 Q182 204 204 211 Q220 218 234 202','M338 92 Q351 111 376 97 Q397 88 410 107','M331 125 Q346 142 337 169 Q334 183 350 192','M373 169 Q391 179 407 160 Q423 144 434 155','M454 187 Q476 176 489 193 Q506 211 534 201','M477 242 Q505 248 527 230','M191 272 Q218 284 245 269 Q276 259 296 270 Q322 277 347 264','M192 304 Q224 313 252 301 Q276 292 303 305 Q328 315 354 296 Q376 282 404 287'],medial:['M82 197 Q99 175 112 183','M160 107 Q190 84 214 102 Q235 113 252 91','M348 82 Q356 100 383 110 Q399 115 406 134','M478 145 Q476 171 493 189 Q517 204 524 227','M431 242 Q475 223 511 250','M186 282 Q205 292 228 281 Q249 273 270 289 Q296 305 320 287'],inferior:['M176 118 Q196 136 177 156','M229 104 Q249 136 238 174','M437 118 Q417 136 436 156','M384 104 Q364 136 375 174','M128 243 Q150 252 136 286 Q135 310 154 329','M484 243 Q462 252 476 286 Q477 310 458 329'],coronalA:[],coronalP:[]};
const deep=['insula','amygdala','hippocampus','thalamus','hypothalamus','basal','callosum','ventricles','brainstem','cerebellum'];
const landmarks={
 lateral:[{label:'Sulco central',d:'M307 69 C293 106 295 130 276 158 C264 181 269 201 250 226'}, {label:'Sulco lateral',d:'M156 263 C190 247 226 251 269 242 C321 236 376 230 424 219'}],
 medial:[{label:'Sulco do cíngulo',d:'M131 211 C109 166 144 130 184 113 C245 87 325 105 367 135'}, {label:'Sulco parieto-occipital',d:'M468 105 C449 133 445 164 418 207'}, {label:'Sulco calcarino',d:'M418 207 C448 228 479 215 534 234'}],
 inferior:[{label:'Fissura longitudinal',d:'M306 68V190'}, {label:'Sulco colateral · posição aproximada',d:'M206 220 C202 265 189 298 179 329 M406 220 C410 265 423 298 433 329'}],
 coronalA:[{label:'Fissura longitudinal',d:'M305 67V113'}, {label:'Sulco lateral · profundidade',d:'M124 192 C137 184 152 185 163 195 M486 192 C473 184 458 185 447 195'}],
 coronalP:[{label:'Fissura longitudinal',d:'M305 67V113'}, {label:'Terceiro ventrículo · espaço mediano',d:'M305 209V258'}]
};
// Interior background separates cortical mantle from a schematic white-matter field.
const whiteMatter='M284 90 C230 66 180 101 151 151 C134 174 135 190 151 198 L185 204 L190 258 L229 274 L277 249 L305 253 L333 249 L381 274 L420 258 L425 204 L459 198 C475 190 476 174 459 151 C430 101 380 66 326 90 L325 131 L285 131 Z';
const foldDetail={
 lateral:['M91 161 C108 159 112 148 128 154 C146 164 159 154 173 153','M120 204 C139 211 151 196 169 196','M204 85 C202 101 214 111 207 126','M231 130 C245 141 234 156 240 172','M362 118 C378 123 387 141 403 133','M355 211 C367 194 387 207 402 190','M445 126 C457 135 455 150 463 161','M501 160 C496 177 516 178 524 187','M360 312 C381 320 407 305 425 310'],
 medial:['M95 158 C113 153 114 132 134 126','M271 77 C263 92 273 102 281 108','M325 89 C335 100 328 111 339 119','M449 133 C435 135 435 151 421 154','M461 265 C479 277 506 264 523 256'],
 inferior:['M193 206 C175 233 171 263 177 283','M419 206 C437 233 441 263 435 283','M205 347 Q250 368 288 347','M407 347 Q362 368 324 347'],
 coronalA:['M141 148 Q159 144 160 127 Q177 131 181 111','M196 87 Q200 107 221 100','M238 76 Q242 95 262 96','M469 148 Q451 144 450 127 Q433 131 429 111','M414 87 Q410 107 389 100','M372 76 Q368 95 348 96','M130 300 Q145 309 141 330','M480 300 Q465 309 469 330'],
 coronalP:['M141 148 Q159 144 160 127 Q177 131 181 111','M196 87 Q200 107 221 100','M238 76 Q242 95 262 96','M469 148 Q451 144 450 127 Q433 131 429 111','M414 87 Q410 107 389 100','M372 76 Q368 95 348 96','M130 300 Q145 309 141 330','M480 300 Q465 309 469 330']
};
function svg(view='lateral',selected='',labels=true,options={}){
 const v=views[view],highlighted=new Set(options.highlighted||[]),prefix=options.prefix||'';
 const label=id=>root.ATLAS_DATA?.regions.find(r=>r.id===id)?.name||id;
 const paths=v.shapes.map(s=>{
  const active=s.id!=='cortex'&&(!options.highlighted||highlighted.has(s.id));
  const interior=options.tissue==='internal'&&!deep.includes(s.id);
  return `<path ${s.id==='cortex'?'':`data-region="${s.id}"`} class="structure ${s.id===selected||options.emphasis?.includes(s.id)?'selected':''} ${options.highlighted?(highlighted.has(s.id)?'circuit-on':'circuit-off'):''} ${interior?'tissue-muted':''}" fill="${options.colors?.[s.id]||colors[s.id]}" d="${s.d}" ${!active?'aria-hidden="true"':`role="button" tabindex="0" aria-label="${label(s.id)}"`}/>`+(s.id==='cortex'?`<path class="white-matter" d="${whiteMatter}" aria-hidden="true"/>`:'');
 }).join('');
 return `<svg class="brain-svg" viewBox="0 0 620 450" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="${v.caption}. Esquema anatômico, não ressonância."><defs><pattern id="${prefix}dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" opacity=".06"/></pattern></defs><rect width="620" height="450" fill="url(#${prefix}dots)"/><text x="30" y="35" class="orient">${v.orient[0]}</text><text x="590" y="35" text-anchor="end" class="orient">${v.orient[1]}</text><g id="${prefix}brain-transform">${paths}<g class="gyri">${[...(gyri[view]||[]),...(foldDetail[view]||[])].map(d=>`<path d="${d}"/>`).join('')}${['lateral','medial'].includes(view)?Array.from({length:9},(_,i)=>`<path d="M${400-i/2} ${321+i*7} Q450 ${338+i*6} ${520-i*2} ${329+i*7}"/>`).join(''):''}</g>${options.landmarks?`<g class="anatomy-landmarks" aria-hidden="true">${landmarks[view].map(m=>`<path d="${m.d}"/>`).join('')}</g>`:''}${labels?Object.entries(marks[view]).filter(([id])=>!options.highlighted||highlighted.has(id)).map(([id,p])=>`<g class="brain-label" data-region="${id}" role="button" tabindex="0" aria-label="${label(id)}"><circle cx="${p[0]}" cy="${p[1]}" r="17"/><text x="${p[0]}" y="${p[1]+7}">${Object.keys(marks[view]).indexOf(id)+1}</text></g>`).join(''):''}</g></svg>`;
}
root.Anatomy={colors,views,marks,svg,landmarks,deep};
if(typeof module!=='undefined')module.exports=root.Anatomy;
})(typeof window!=='undefined'?window:globalThis);
