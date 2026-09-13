import {createHash} from 'node:crypto';
import webpush from 'web-push';

export class PushError extends Error {
  constructor(status,message){super(message);this.status=status;}
}

const hash=value=>createHash('sha256').update(value).digest('hex');
const colorName=color=>color==='w'?'white':'black';
const safeHandle=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{3,20}$/.test(value)?value:null;

export function moveEventId(room){
  return `move:${room.code}:${room.game_number||1}:${room.version}:${room.moves.length}`;
}

export function movePushPlan(room,moverColor){
  if(room.status!=='active'||!['w','b'].includes(moverColor)||room.turn===moverColor)return null;
  const targetColor=room.turn;
  const mover= moverColor==='w'?room.white_player:room.black_player;
  return {
    eventId:moveEventId(room),
    targetColor,
    title:'Quiet Knight',
    body:safeHandle(mover?.handle)?`${mover.handle} moved. Your turn.`:'Your opponent moved. Your turn.'
  };
}

export function nudgePlan(room,senderColor,requestId){
  if(room.status!=='active')throw new PushError(409,'Game is not active');
  if(!room.black_token)throw new PushError(409,'Your opponent has not joined yet');
  if(room.turn===senderColor)throw new PushError(409,'It is your turn');
  if(!/^[0-9a-f-]{36}$/i.test(requestId||''))throw new PushError(400,'Invalid nudge request');
  const sender=senderColor==='w'?room.white_player:room.black_player;
  return {
    eventId:`nudge:${room.code}:${room.game_number||1}:${requestId.toLowerCase()}`,
    targetColor:room.turn,
    title:'Quiet Knight',
    body:safeHandle(sender?.handle)?`${sender.handle} is waiting for your move.`:'Your opponent is waiting for your move.'
  };
}

function parseSubscription(input){
  const endpoint=typeof input?.endpoint==='string'?input.endpoint:'';
  let url;try{url=new URL(endpoint);}catch{throw new PushError(400,'Invalid push subscription');}
  if(url.protocol!=='https:'||endpoint.length>2048)throw new PushError(400,'Invalid push subscription');
  const p256dh=typeof input?.keys?.p256dh==='string'?input.keys.p256dh:'';
  const auth=typeof input?.keys?.auth==='string'?input.keys.auth:'';
  if(!/^[A-Za-z0-9_-]{40,200}$/.test(p256dh)||!/^[A-Za-z0-9_-]{10,100}$/.test(auth))throw new PushError(400,'Invalid push subscription');
  return{endpoint,p256dh,auth};
}

function seat(room,seatToken){
  if(typeof seatToken!=='string'||!seatToken)return null;
  if(seatToken===room.white_token)return{color:'w',token:room.white_token,player:room.white_player||null};
  if(room.black_token&&seatToken===room.black_token)return{color:'b',token:room.black_token,player:room.black_player||null};
  return null;
}

export class PushService {
  constructor({pool,publicKey=process.env.VAPID_PUBLIC_KEY,privateKey=process.env.VAPID_PRIVATE_KEY,subject=process.env.VAPID_SUBJECT||'https://quiet-knight-live-v2xp3y.v2.appdeploy.ai/',transport=webpush,logger=()=>{}}={}){
    this.pool=pool;this.publicKey=publicKey||'';this.privateKey=privateKey||'';this.subject=subject;this.transport=transport;this.logger=logger;
    this.available=Boolean(pool&&this.publicKey&&this.privateKey);
    if(this.available)this.transport.setVapidDetails(this.subject,this.publicKey,this.privateKey);
  }
  status(){return{available:this.available,configured:Boolean(this.publicKey&&this.privateKey)};}
  require(){if(!this.available)throw new PushError(503,'Move notifications are temporarily unavailable');}
  async subscribe(room,seatToken,input){
    this.require();const owner=seat(room,seatToken);if(!owner)throw new PushError(403,'You do not own a seat in this game');
    const item=parseSubscription(input);const digest=hash(owner.token);
    const {rows}=await this.pool.query(`INSERT INTO qk_push_subscriptions(id,player_id,room_code,seat_identity_digest,endpoint,p256dh,auth) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6) ON CONFLICT(endpoint) DO UPDATE SET player_id=EXCLUDED.player_id,room_code=EXCLUDED.room_code,seat_identity_digest=EXCLUDED.seat_identity_digest,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,updated_at=now(),disabled_at=NULL RETURNING id,created_at,updated_at`,[owner.player?.id||null,room.code,digest,item.endpoint,item.p256dh,item.auth]);
    return{subscribed:true,created_at:rows[0].created_at,updated_at:rows[0].updated_at};
  }
  async unsubscribe(room,seatToken,endpoint){
    this.require();const owner=seat(room,seatToken);if(!owner)throw new PushError(403,'You do not own a seat in this game');
    if(typeof endpoint!=='string'||endpoint.length>2048)throw new PushError(400,'Invalid push subscription');
    await this.pool.query('UPDATE qk_push_subscriptions SET disabled_at=now(),updated_at=now() WHERE endpoint=$1 AND room_code=$2 AND seat_identity_digest=$3',[endpoint,room.code,hash(owner.token)]);
    return{subscribed:false};
  }
  async subscriptionCount(room,targetColor){
    if(!this.available)return 0;
    const token=targetColor==='w'?room.white_token:targetColor==='b'?room.black_token:null;if(!token)return 0;
    const {rows}=await this.pool.query('SELECT count(*)::int AS count FROM qk_push_subscriptions WHERE room_code=$1 AND seat_identity_digest=$2 AND disabled_at IS NULL',[room.code,hash(token)]);
    return Number(rows[0]?.count)||0;
  }
  async hasEvent(eventId){const {rowCount}=await this.pool.query('SELECT 1 FROM qk_push_events WHERE event_id=$1',[eventId]);return rowCount>0;}
  async deliver(room,plan,kind){
    if(!this.available||!plan)return{status:'unavailable',subscriptions:0,sent:0};
    const claimed=await this.pool.query('INSERT INTO qk_push_events(event_id,event_kind,room_code,game_number,room_version) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING event_id',[plan.eventId,kind,room.code,room.game_number||1,room.version]);
    if(!claimed.rowCount)return{status:'duplicate',subscriptions:0,sent:0};
    const token=plan.targetColor==='w'?room.white_token:room.black_token;if(!token)return{status:'no-recipient',subscriptions:0,sent:0};
    const {rows}=await this.pool.query('SELECT id,endpoint,p256dh,auth FROM qk_push_subscriptions WHERE room_code=$1 AND seat_identity_digest=$2 AND disabled_at IS NULL',[room.code,hash(token)]);
    const payload=JSON.stringify({kind,eventId:plan.eventId,roomCode:room.code,title:plan.title,body:plan.body});let sent=0;
    await Promise.all(rows.map(async row=>{try{
      await this.transport.sendNotification({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},payload,{TTL:kind==='move'?1800:600,urgency:'normal',topic:hash(plan.eventId).slice(0,32)});
      sent++;await this.pool.query('UPDATE qk_push_subscriptions SET last_success_at=now(),updated_at=now() WHERE id=$1',[row.id]);
    }catch(error){const status=Number(error?.statusCode)||0;if(status===404||status===410)await this.pool.query('UPDATE qk_push_subscriptions SET disabled_at=now(),updated_at=now() WHERE id=$1',[row.id]);this.logger('push.failure',{kind,status:status||'transport'});}}));
    const status=sent>0?'sent':rows.length?'failed':'no-subscription';
    this.logger('push.delivery',{kind,room:room.code,target:colorName(plan.targetColor),subscriptions:rows.length,sent});return{status,subscriptions:rows.length,sent};
  }
}
