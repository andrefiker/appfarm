import {strict as a} from 'node:assert';
import {test} from 'node:test';
import {Chess} from 'chess.js';
import {IdentityStore} from '../identity.js';
for(const feature of ['Teaching','Amateur'])test(feature+' match is written to normal history but cannot award Quiet Points',async()=>{
 const white={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',handle:'Alice'},black={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',handle:'Bob'};
 const db={on(){},async connect(){return {async query(sql,args=[]){
   if(sql.includes('FROM qk_games WHERE room_code'))return {rows:[]};
   if(sql.includes('FOR UPDATE'))return {rows:[white,black]};
   if(sql.startsWith('INSERT INTO qk_games')){insert=args;return {rows:[{id:'saved',result:args[7],scored:args[14],score_reason:args[15]}]};}
   if(sql.includes('human_games=human_games+1'))human++;
   if(sql.includes('quiet_points=quiet_points+'))points++;
   return {rows:[]};
 },release(){}}}};
 let insert, human=0,points=0,checkedPair=0;
 const i=new IdentityStore({pool:db});i.ready=true;
 i.pairStatus=async()=>{checkedPair++;return {eligible:true,reason:'Quiet Points game',remaining:3};};
 const g=new Chess(),m=g.move('e4');
 const result=await i.record({code:'SAMPLE',game_number:1,status:'resigned',winner:'w',fen:g.fen(),moves:[m],created_at:Date.now(),white_player:white,black_player:black,
   ...(feature==='Teaching'?{teaching:{game:1,rev:3,active:false,ever:true,proposal:null}}:{amateur:{game:1,enabled:false,ever:true}}),points_policy:{eligible:true}});
 a.equal(result.id,'saved');a.equal(result.scored,false);a.match(result.score_reason,new RegExp(feature+" game"));a.equal(result.result,'1-0');
 a.equal(insert[16],0);a.equal(insert[17],0);a.equal(human,2);a.equal(points,0);a.equal(checkedPair,0);
});
