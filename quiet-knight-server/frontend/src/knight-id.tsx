import { historyEntry } from './post-game';
import { identityHeaders } from './player-credential';
import { accountRequest, accountServiceReady } from './account-api';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

export type KnightPlayer = { id:string; handle:string; quiet_points:number; scored_games:number; wins:number; draws:number; losses:number; current_win_streak:number; best_win_streak:number; registered:boolean; human_games:number; human_wins:number; human_draws:number; human_losses:number; computer_games:number; computer_wins:number; computer_draws:number; computer_losses:number };
export type RememberedGame = { id:string; room_code:string; game_number:number; white_player_id:string|null; black_player_id:string|null; white_points:number; black_points:number; score_reason?:string; white_handle:string; black_handle:string; result:string; final_fen:string; moves:{san:string}[]; scored:boolean; ended_at:string };
export type ComputerGame={id:string;result:string;final_fen:string;moves:{san:string}[];level:number;ended_at:string};
type AuthResponse={player:KnightPlayer;games?:RememberedGame[];computer_games?:ComputerGame[];recovery_code?:string};

async function playerRequest(path:string,body?:unknown):Promise<AuthResponse>{return accountRequest<AuthResponse>(path,body,identityHeaders());}

export function useKnightId(){
 const[player,setPlayer]=useState<KnightPlayer|null>(null),[games,setGames]=useState<RememberedGame[]>([]),[computerGames,setComputerGames]=useState<ComputerGame[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[recoveryCode,setRecoveryCode]=useState('');
 const authRevision=useRef(0);
 const refresh=useCallback(async()=>{const revision=authRevision.current;if(!navigator.onLine){setError('Connection problem. Check your internet connection.');return;}try{const health=await accountRequest<{available:boolean;migration:number}>('/players/health');if(revision!==authRevision.current)return;if(!accountServiceReady(health)){setError('Server unavailable. Accounts are not ready yet.');return;}const data=await playerRequest('/players/me');if(revision!==authRevision.current)return;setPlayer(data.player);setGames(data.games||[]);setComputerGames(data.computer_games||[]);setError('');}catch(e){if(revision!==authRevision.current)return;if((e as{status?:number}).status===401){setPlayer(null);setGames([]);setComputerGames([]);try{localStorage.removeItem('qk-player-profile-v1');localStorage.removeItem('qk-player-active-v1');}catch{}setError('');}else setError(e instanceof Error?e.message:'Server unavailable. Please try again later.');}},[]);
 useEffect(()=>{void refresh();window.addEventListener('online',refresh);return()=>window.removeEventListener('online',refresh);},[refresh]);
 const act=useCallback(async(path:string,payload:unknown)=>{if(busy)return false;authRevision.current++;setBusy(true);setError('');try{const result=await playerRequest(path,payload);if(!result.player?.registered||!result.player.id)throw new Error('Server unavailable. Please try again later.');authRevision.current++;setPlayer(result.player);setGames(result.games||[]);setComputerGames(result.computer_games||[]);setRecoveryCode(result.recovery_code||'');try{localStorage.removeItem('qk-player-token-v1');localStorage.removeItem('qk-player-profile-v1');localStorage.removeItem('qk-player-active-v1');}catch{}return true;}catch(e){setError(e instanceof Error?e.message:'Account request failed. Please try again.');return false;}finally{setBusy(false);}},[busy]);
 const register=(handle:string,password:string)=>act('/players/register',{handle,password});
 const login=(handle:string,password:string)=>act('/players/login',{handle,password});
 const recover=(handle:string,code:string,password:string)=>act('/players/recover',{handle,recovery_code:code,password});
 const claim=(password:string)=>act('/players/claim',{password});
 const recordComputer=useCallback(async(game:{client_game_id:string;moves:{from:string;to:string;promotion?:string}[];human_color:'w'|'b';level:number})=>{try{await playerRequest('/players/me/computer-games',game);await refresh();return true;}catch(e){setError(e instanceof Error?e.message:'Completed game could not be saved. Reconnect to retry.');return false;}},[refresh]);
 const logout=useCallback(async()=>{try{await playerRequest('/players/logout',{});authRevision.current++;setPlayer(null);setGames([]);setComputerGames([]);setRecoveryCode('');setError('');try{localStorage.removeItem('qk-player-token-v1');localStorage.removeItem('qk-player-profile-v1');localStorage.removeItem('qk-player-active-v1');}catch{}}catch(e){setError(e instanceof Error?e.message:'Could not log out. Please try again.');}},[]);
 const clearRecoveryCode=useCallback(()=>setRecoveryCode(''),[]);
 const playerAccount=player?.registered?player:null;
 return{player:playerAccount,profile:player,registered:player?.registered===true,games,computerGames,busy,error,recoveryCode,clearRecoveryCode,register,login,recover,claim,logout,refresh,recordComputer};
}

export function AccountGate({knight}:{knight:ReturnType<typeof useKnightId>}){
 const[view,setView]=useState<'choose'|'create'|'login'|'recover'|'claim'|'recovery'>('choose');
 const[handle,setHandle]=useState(''),[password,setPassword]=useState(''),[code,setCode]=useState('');
 async function submit(e:FormEvent){e.preventDefault();let ok=false;
  if(view==='create')ok=!!await knight.register(handle,password);
  else if(view==='login')ok=!!await knight.login(handle,password);
  else if(view==='recover')ok=!!await knight.recover(handle,code,password);
  else if(view==='claim')ok=!!await knight.claim(password);
  if(ok){if(['create','recover','claim'].includes(view))setView('recovery');else setView('choose');setPassword('');}
 }
 return <main className="account-gate"><section className="account-card"><p className="account-kicker">QUIET KNIGHT</p><h1>Every game belongs to you.</h1><p className="account-intro">Create or log in to a permanent Knight account to play on PC, Android, and iPhone.</p>
  {view==='choose'?<div className="account-actions"><button className="primary wide" onClick={()=>setView('create')}>Create Account</button><button className="secondary wide" onClick={()=>setView('login')}>Log In</button></div>:null}
  {view==='recovery'?<div role="status"><h2>Save your recovery code</h2><p>Your account is ready. Keep this code somewhere private so you can reset your password later.</p><code className="recovery-code">{knight.recoveryCode}</code><button className="primary wide" onClick={()=>{knight.clearRecoveryCode();setView('choose');}}>Continue to game</button></div>:null}
  {['create','login','recover','claim'].includes(view)?<form className="account-form" onSubmit={submit}>
    {view==='create'?<><h2>Create Account</h2><label htmlFor="account-handle">Knight ID</label><input id="account-handle" value={handle} onChange={e=>setHandle(e.target.value)} pattern="(?=(?:.*[A-Za-z]){3})[A-Za-z0-9_-]{3,20}" minLength={3} maxLength={20} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required/><small>Use at least 3 letters.</small></>:null}
    {view==='login'?<><h2>Log In</h2><label htmlFor="login-handle">Knight ID</label><input id="login-handle" value={handle} onChange={e=>setHandle(e.target.value)} autoComplete="username" autoCapitalize="none" required/></>:null}
    {view==='recover'?<><h2>Recover Account</h2><label htmlFor="recover-handle">Knight ID</label><input id="recover-handle" value={handle} onChange={e=>setHandle(e.target.value)} autoComplete="username" autoCapitalize="none" required/><label htmlFor="recovery-code">Recovery code</label><input id="recovery-code" value={code} onChange={e=>setCode(e.target.value)} autoComplete="off" required/></>:null}
    {view==='claim'?<><h2>Link your existing Knight ID</h2><p>This device has a verified legacy Knight ID. Linking keeps its UUID, Quiet Points, and recorded games.</p><label>Knight ID</label><strong>{knight.profile?.handle}</strong></>:null}
    {view==='create'||view==='login'||view==='recover'||view==='claim'?<><label htmlFor="account-password">Password</label><input id="account-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={view==='login'?undefined:8} maxLength={128} autoComplete={view==='login'?'current-password':'new-password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} required/>{view==='login'?null:<small>At least 8 characters.</small>}</>:null}
    {knight.error?<p role="alert">{knight.error}</p>:null}<button className="primary wide" disabled={knight.busy} type="submit">{knight.busy?'Please wait…':view==='create'?'Create Account':view==='login'?'Log In':view==='recover'?'Reset Password':'Link Account'}</button>
    <button className="text-button" type="button" onClick={()=>{setView('choose');setPassword('');setCode('');}}>Back</button>
  </form>:null}
  {view==='choose'&&knight.profile&&!knight.profile.registered?<button className="secondary wide" onClick={()=>setView('claim')}>Link this existing Knight ID</button>:null}
  {view==='login'?<button className="text-button" onClick={()=>setView('recover')}>Forgot password?</button>:null}
  {view==='choose'&&knight.error?<p role="alert">{knight.error}</p>:null}
 </section></main>;
}

export function KnightIdPanel({knight,onView}:{knight:ReturnType<typeof useKnightId>;onView?:(game:RememberedGame)=>void}){
 const p=knight.player;const history=p?knight.games.map(game=>({game,entry:historyEntry(game,p.id)})).filter(item=>item.entry!==null):[];
 return <div className="knight-panel">{p?<><p className="knight-name">{p.handle}</p><p className="quiet-points"><strong>{p.quiet_points}</strong> Quiet Points</p><p className="knight-record">Human: {p.human_wins} wins · {p.human_draws} draws · {p.human_losses} losses ({p.human_games} games)</p><p className="knight-record">Computer: {p.computer_wins} wins · {p.computer_draws} draws · {p.computer_losses} losses ({p.computer_games} games)</p><p className="settings-note">{p.scored_games} human games scored for Quiet Points<br/>Current streak {p.current_win_streak} · Best {p.best_win_streak}</p><button className="secondary wide" type="button" onClick={()=>void knight.logout()}>Log Out</button></>:null}{knight.error?<p role="alert">{knight.error}</p>:null}<details className="knight-details"><summary>About Quiet Points</summary><p>Win +3 · Draw +1 · Loss +0. Human games with two different Knight IDs only. The first three scored games between a pair within 24 hours award points; further rematches are casual. This is not a chess rating.</p></details>{p?<><section className="knight-history" aria-labelledby="knight-history-title"><h3 id="knight-history-title">Human game history</h3>{history.length?history.map(({game:g,entry:e})=>e?<button className="memory-game knight-history-game" type="button" key={g.id} onClick={()=>onView?.(g)} disabled={!onView}><span className="history-opponent">vs {e.opponent}</span><span className="history-result">{e.outcome} · {e.color}{g.scored?'':' · Casual'}</span><small className="history-meta"><span>{e.moves} moves · {e.pointsText}</span><time dateTime={g.ended_at}>{e.date}</time></small></button>:null):<p className="settings-note">No completed human games yet.</p>}</section><section className="knight-history" aria-labelledby="computer-history-title"><h3 id="computer-history-title">Computer game history</h3>{knight.computerGames.length?knight.computerGames.map(g=><div className="memory-game knight-history-game" key={g.id}><span>{g.result==='1/2-1/2'?'Draw':g.result==='1-0'?'White won':'Black won'} · Level {g.level}</span><time dateTime={g.ended_at}>{new Date(g.ended_at).toLocaleDateString()}</time></div>):<p className="settings-note">No completed computer games yet.</p>}</section></>:null}</div>;
}
