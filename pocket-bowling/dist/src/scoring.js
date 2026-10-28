// Pure ten-pin evaluator. null cumulative totals mean unresolved bonuses.
export function score(rolls, count=10) {
 if(!Number.isInteger(count)||count<1||count>10)throw Error('Invalid frame count');
 const frames=[]; let i=0,total=0,pending=false,complete=false;
 for(let f=0;f<count;f++){
  const start=i,a=rolls[i]; if(a===undefined)break;
  if(!Number.isInteger(a)||a<0||a>10)throw Error('Invalid pins');
  const last=f===count-1; let n= a===10&&!last?1:2;
  if(last && (a===10 || (rolls[i+1]!==undefined && a+rolls[i+1]===10)))n=3;
  const rr=rolls.slice(i,i+n);
  for(let k=1;k<rr.length;k++){
   const limit= last&&a===10 ? (k===1||rr[1]===10?10:10-rr[1]) : (k===1?10-a:10);
   if(!Number.isInteger(rr[k])||rr[k]<0||rr[k]>limit)throw Error('Invalid rack total');
  }
  const closed=rr.length===n; let value=null;
  if(last){if(closed)value=rr.reduce((s,x)=>s+x,0);}
  else if(a===10){if(rolls[i+2]!==undefined)value=10+rolls[i+1]+rolls[i+2];}
  else if(rr.length===2){if(a+rr[1]===10){if(rolls[i+2]!==undefined)value=10+rolls[i+2];}else value=a+rr[1];}
  pending ||= value===null; if(value!==null)total+=value;
  frames.push({rolls:rr,value,total:pending?null:total,closed,strike:a===10,spare:a!==10&&rr.length>=2&&a+rr[1]===10,start});
  i+=rr.length; if(!closed)break;
  if(last)complete=true;
 }
 if(i<rolls.length)throw Error('Game is complete');
 const current=frames.at(-1), frame=complete?count:(!current?1:current.closed?frames.length+1:frames.length);
 let remaining=10;
 if(current&&!current.closed){const r=current.rolls;remaining=10-r.at(-1);if(frame===count && (r.at(-1)===10 || (r.length===2&&r[0]+r[1]===10)))remaining=10;}
 return {frames,total:frames.filter(f=>f.total!==null).at(-1)?.total??0,complete,frame,remaining,pending:frames.some(f=>f.value===null)};
}
export function symbols(r,last=false){return r.map((v,i)=>v===10&&(i===0||last&&(r[i-1]===10||i===2&&r[0]!==10))?'X':i>0&&r[i-1]+v===10&&!(last&&i===1&&r[0]===10)?'/':v===0?'–':String(v));}
