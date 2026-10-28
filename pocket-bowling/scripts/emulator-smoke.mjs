import {execFileSync as run} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openSync,closeSync} from 'node:fs';
const adb=(...a)=>run('adb',a,{encoding:'utf8'});
const pkg='com.andrefiker.pocketbowling';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await mkdir('qa-artifacts',{recursive:true});
async function dump(name){
 let error;
 for(let i=0;i<6;i++){
  try{adb('shell','rm','-f','/sdcard/pocket.xml');adb('shell','uiautomator','dump','/sdcard/pocket.xml');const xml=adb('shell','cat','/sdcard/pocket.xml');if(!xml.includes('<hierarchy'))throw Error('UI hierarchy not ready');await writeFile(`qa-artifacts/${name}.xml`,xml);return xml;}
  catch(e){error=e;await wait(2000);}
 }
 throw error;
}
function screen(name){const fd=openSync(`qa-artifacts/${name}.png`,'w');try{run('adb',['exec-out','screencap','-p'],{stdio:['ignore',fd,'inherit']});}finally{closeSync(fd);}}
function bounds(xml,label){const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const node=xml.match(new RegExp('<node[^>]*(?:text|content-desc)="'+escaped+'"[^>]*>'));if(!node)throw Error('Missing UI '+label);const b=node[0].match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);assert.ok(b);return b.slice(1).map(Number);}
function tap(xml,label){const b=bounds(xml,label);adb('shell','input','tap',String(Math.round((b[0]+b[2])/2)),String(Math.round((b[1]+b[3])/2)));}
async function ready(name){for(let i=0;i<6;i++){await wait(1500);const xml=await dump(name);if(xml.includes('Scorecard')&&xml.includes('BOWL'))return xml;}screen(name);throw Error('App did not become ready');}
function texts(xml){const values=[...xml.matchAll(/\btext="([^\"]*)"/g)].map(m=>m[1]).filter(Boolean);const start=values.indexOf('Your scorecard'),end=values.findIndex(t=>t.startsWith('Dots indicate'));assert.ok(start>=0&&end>start,'Complete scorecard must be accessible');return values.slice(start,end+1);}
try{
 adb('install','-r','release/Pocket-Bowling-v1.0.0.apk');
 adb('shell','svc','wifi','disable');adb('shell','svc','data','disable');
 adb('shell','am','start','-W','-n',pkg+'/.MainActivity');
 adb('shell','input','keyevent','KEYCODE_WAKEUP');adb('shell','wm','dismiss-keyguard');
 let xml=await ready('emulator-initial');
 const lane=bounds(xml,'Bowling lane. Position the ball then swipe upward to bowl.');
 const x=Math.round((lane[0]+lane[2])/2),y=Math.round(lane[1]+(lane[3]-lane[1])*.85);
 adb('shell','input','swipe',String(x),String(y),String(x+4),String(y-180),'180');
 await wait(1000);adb('shell','input','keyevent','3');await wait(600);
 adb('shell','am','start','-W','-n',pkg+'/.MainActivity');await wait(11000);
 xml=await dump('emulator-after-roll');screen('emulator-after-roll');
 assert.ok(xml.includes('down.')||xml.includes('STRIKE')||xml.includes('Gutter')||xml.includes('No pins'));
 // The scorecard is the authoritative persistence check, not a welcome label.
 tap(xml,'Scorecard');await wait(500);xml=await dump('emulator-scorecard-before');
 const before=texts(xml);assert.ok(before.includes('Your scorecard'));
 assert.ok(before.some(t=>/^[0-9]+$/.test(t)));
 tap(xml,'Close dialog');await wait(400);
 adb('shell','am','force-stop',pkg);adb('shell','am','start','-W','-n',pkg+'/.MainActivity');
 xml=await ready('emulator-resumed');screen('emulator-resumed');
 tap(xml,'Scorecard');await wait(500);xml=await dump('emulator-scorecard-after');screen('emulator-scorecard-after');
 const after=texts(xml);assert.deepEqual(after,before,'Rolls and scoring must survive force-stop');
 await writeFile('qa-artifacts/emulator-results.json',JSON.stringify({status:'PASS',offline:true,installed:true,swipe:true,backgroundResume:true,forceStopScorecardMatch:true,before,after},null,2));
 console.log('PASS: installed, launched offline, pointer release, background/resume, exact scorecard retained after force-stop. No physical device claim.');
}catch(error){try{screen('emulator-failure');}catch{}try{await writeFile('qa-artifacts/emulator-logcat.txt',adb('logcat','-d','-t','500'));}catch{}try{await dump('emulator-failure');}catch{}throw error;}
