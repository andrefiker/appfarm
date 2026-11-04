import {BoardLock,FirstGameTips} from "./ux-tools";
import {pieceCaptureCounts} from "./piece-captures";
import {accountRequest} from "./account-api";
import {identityHeaders} from "./player-credential";
import { positionAtPly, reviewStillValid } from "./move-review";
import type { ReviewSelection } from "./move-review";
import { LOSS_MESSAGE } from "./post-game";
import {ChessClock} from './chess-clock';
import {enamelStyle} from './board-surface';
import type {ClockState} from './chess-clock';
import { GameSoFar } from "./table-atmosphere";
import * as React from "react";
import {createPortal} from "react-dom";
import { Piece, pieceNames } from "./pieces";
import type { Color, Kind } from "./pieces";
import type {BoardMotion} from './board-effects';
import {CaptureEffect, LandingEffect, usePieceEffects} from './piece-effects';
import {funDefaults} from './fun-options';
import type {FunOptions} from './fun-options';
import {usePersonalityAudio} from './fun-audio';
import {PawnDetails,MoveTrails,BoardWeather,useAudience,HomeKnight,useVisualPermission} from './extra-fun';
import type {Weather} from './extra-fun';
import type {SoundTheme} from './sound-themes';
import {GameMovie} from './game-movie';
import {CaptureFlight} from './capture-flight';
import {
  boardSquares,
  numberedMoves,
  materialTotals,
  materialValues,
} from "./chess-view-model";
import type { Losses } from "./chess-view-model";
export type Position = Record<string, { color: Color; type: Kind }>;
export type Motion = BoardMotion | null;
export type BoardProps = {
  position: Position;
  orientation: Color;
  selected: string | null;
  targets: string[];
  last: { from: string; to: string } | null;
  check: string | null;
  motion: Motion;
  motionSequence?: number;
  locked: boolean;
  onSquare: (square: string) => void;
  onMove?: (from:string,to:string) => void;
  drag?: boolean;
  dragTargets?: (from:string) => string[];
  playful?: boolean;
  winner?: Color | null;
  fun?: FunOptions;
  draw?: boolean;
  entrance?: number;
  soundEnabled?: boolean;
  soundVolume?: number;
  captureMarks?:Record<string,number>;
  replayMode?: boolean;
  replayInOptions?: boolean;
  replayHost?: HTMLElement | null;
  weather?: Weather;
};
export function Icon({
  name,
}: {
  name:
    | "back"
    | "settings"
    | "copy"
    | "flag"
    | "new"
    | "close"
    | "link"
    | "arrow"
    | "chevron";
}) {
  const paths: Record<string, React.ReactNode> = {
    back: <path d="m14 6-6 6 6 6" />,
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    copy: (
      <>
        <rect x="8" y="8" width="12" height="13" rx="2" />
        <path d="M16 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4" />
      </>
    ),
    flag: <path d="M5 21V3m0 1c5-4 9 4 15 0v11c-6 4-10-4-15 0" />,
    new: <path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    link: (
      <path d="m10 13 4-4m-6 5-2 2a3.5 3.5 0 0 0 5 5l4-4a3.5 3.5 0 0 0 0-5m1-2 2-2a3.5 3.5 0 0 0-5-5L9 7a3.5 3.5 0 0 0 0 5" />
    ),
    chevron: <path d="m6 9 6 6 6-6" />,
    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <rect x="8" y="4" width="4" height="6" rx="1" fill="currentColor" />
        <rect x="14" y="14" width="4" height="6" rx="1" fill="currentColor" />
      </>
    ),
  };
  return (
    <svg
      className="ui-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
export function ChessBoard({
  position,
  orientation,
  selected,
  targets,
  last,
  check,
  motion,
  locked,
  onSquare, onMove, drag=true, dragTargets, playful=false, winner=null, motionSequence=motion?.serial,
  fun=funDefaults, draw=false, entrance=0, soundEnabled=false, soundVolume=80, replayMode=false, weather='off', replayInOptions=false, replayHost=null, captureMarks={},
}: BoardProps) {
  const squares = boardSquares(orientation);
  const visualAllowed=useVisualPermission(playful);
  const pawnCounts={w:Object.values(position).filter(p=>p.color==='w'&&p.type==='p').length,b:Object.values(position).filter(p=>p.color==='b'&&p.type==='p').length};
  const {events, victory, handshake, arriving, allowed} = usePieceEffects(motion, visualAllowed, orientation, winner, motionSequence, draw, entrance);
  usePersonalityAudio(motion,allowed && soundEnabled && !replayMode,soundVolume,fun,motionSequence);
  const [captureReplay,setCaptureReplay]=React.useState<{position:Position;motion:BoardMotion;check:string|null}|null>(null);
  const [replaying,setReplaying]=React.useState(false),[replayNumber,setReplayNumber]=React.useState(0);
  const replayDialog=React.useRef<HTMLDialogElement>(null), seenReplay=React.useRef(motionSequence);
  React.useEffect(()=>{
    const fresh=motion && seenReplay.current!==motion.serial;seenReplay.current=motionSequence;
    setReplaying(false);
    if (!motion) setCaptureReplay(null);
    else if (fresh && motion.captured && !replayMode) setCaptureReplay({position:{...position},motion:{...motion},check});
  },[motionSequence,motion,orientation,replayMode]);
  React.useEffect(()=>{if (!allowed || !fun.replay)setReplaying(false);},[allowed,fun.replay]);
  React.useEffect(()=>{
    const dialog=replayDialog.current;if (!dialog)return;
    if(replaying && !dialog.open)dialog.showModal();else if(!replaying && dialog.open)dialog.close();
  },[replaying]);
  const gesture=React.useRef<{from:string;x:number;y:number}|null>(null);
  const suppressClick=React.useRef(false);
  const [dragPreview,setDragPreview]=React.useState<{from:string;to:string|null;legal:string[]}|null>(null);
  const cancelDrag=()=>{gesture.current=null;setDragPreview(null);};
  React.useEffect(()=>{cancelDrag();},[position,orientation,locked]);
  React.useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')cancelDrag();};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[]);
  function moveOrigin(square: string, movement: Motion): string | null {
    if (!movement) return null;
    if (movement.to === square) return movement.from;
    if (movement.rook?.to === square) return movement.rook.from;
    if (movement.actor) return null;
    const rank = movement.from[1];
    if (movement.san.startsWith("O-O-O") && square === `d${rank}`)
      return `a${rank}`;
    if (
      movement.san.startsWith("O-O") &&
      !movement.san.startsWith("O-O-O") &&
      square === `f${rank}`
    )
      return `h${rank}`;
    return null;
  }
  return (
    <><div className="board-frame">
      <div
        className="board"
        role="group"
        aria-label={`Chess board, ${orientation === "w" ? "White" : "Black"} at bottom`}
      >
        {squares.map((square, index) => {
          const piece = position[square];
          const target = targets.includes(square) || Boolean(dragPreview?.legal.includes(square));
          const dark =
            (square.charCodeAt(0) - 97 + Number(square[1])) % 2 === 1;
          const active = events.find(event => event.to === square || event.rook?.to === square) || null;
          const capture = events.find(event => event.captured?.square === square);
          const latest = events[events.length-1];
          const movement = playful ? active : motion;
          const origin = moveOrigin(square, movement);
          const landing = active?.to === square;
          const travel = active && origin ? active.san.startsWith('O-O') ? 'castle' : fun.sneak && active.captured && active.captured.square !== active.to ? 'sneak' : active.actor?.type === 'n' ? 'leap' : active.captured ? 'attack' : 'glide' : '';
          const gestureEffect = piece?.type === 'k' && handshake && fun.handshake ? 'handshake'
            : victory && fun.poses && motion?.san.endsWith('#') && motion.to === square && piece?.color === victory && piece.type !== 'k' ? `pose-${piece.type}`
            : piece?.type === 'k' && victory ? (piece.color === victory ? 'bow' : 'topple')
            : latest && check === square ? (fun.indignation?'indignant':'startle') : landing && active.escapedCheck && fun.dodge ? 'dodge' : landing && active.promotion ? 'promote'
            : landing && active.captured ? `hit-${active.actor?.type || 'p'}` : '';
          const originIndex = origin ? squares.indexOf(origin) : index;
          const style = origin
            ? ({
                "--move-x": `${((originIndex % 8) - (index % 8)) * 100}%`,
                "--move-y": `${(Math.floor(originIndex / 8) - Math.floor(index / 8)) * 100}%`,
              } as React.CSSProperties)
            : undefined;
          return (
            <button
              type="button"
              key={square}
              style={enamelStyle(square)}
              data-square={square}
              data-piece={piece ? `${piece.color}${piece.type}` : ""}
              className={`square ${dark ? "square-dark" : "square-light"}${last && (last.from === square || last.to === square) ? " square-last" : ""}${selected === square ? " square-selected" : ""}${check === square ? " square-check" : ""}${dragPreview?.to === square ? dragPreview.legal.includes(square) ? " square-drop-valid" : " square-drop-invalid" : ""}`}
              aria-label={`${square}, ${piece ? `${piece.color === "w" ? "White" : "Black"} ${pieceNames[piece.type]}` : "empty"}${target ? ", legal destination" : ""}${check === square ? ", in check" : ""}${captureMarks[square] ? `, ${captureMarks[square]} captures` : ""}`}
              aria-pressed={selected === square}
              aria-disabled={locked}
              onPointerDown={e=>{if(drag && onMove && !locked && piece && (!dragTargets || dragTargets(square).length)){gesture.current={from:square,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}}}
              onPointerMove={e=>{const start=gesture.current;if(!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)<12)return;const to=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-square]')?.dataset.square||null;setDragPreview({from:start.from,to,legal:dragTargets?.(start.from)||targets});}}
              onPointerUp={e=>{const start=gesture.current;cancelDrag();if(!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)<12)return;suppressClick.current=true;setTimeout(()=>{suppressClick.current=false;},0);const dest=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-square]')?.dataset.square;if(dest&&dest!==start.from&&!locked&&(!dragTargets||dragTargets(start.from).includes(dest)))onMove?.(start.from,dest);}}
              onPointerCancel={cancelDrag}
              onLostPointerCapture={cancelDrag}
              onClick={() => {if(!locked&&!suppressClick.current)onSquare(square);}}
              onKeyDown={(e) => {
                const delta = (
                  {
                    ArrowLeft: -1,
                    ArrowRight: 1,
                    ArrowUp: -8,
                    ArrowDown: 8,
                  } as Record<string, number>
                )[e.key];
                if (delta === undefined) return;
                e.preventDefault();
                const next = Math.max(0, Math.min(63, index + delta));
                e.currentTarget.parentElement
                  ?.querySelector<HTMLButtonElement>(
                    `[data-square='${squares[next]}']`,
                  )
                  ?.focus();
              }}
            >
              {piece ? (
                <span
                  key={`${square}-${piece.color}${piece.type}-${origin ? movement?.serial : "still"}`}
                  className={`art-cell${origin ? " art-moving" : ""}${travel ? ` playful-travel travel-${travel}` : ''}`}
                  style={style}
                >
                  <span key={`${active?.serial || (check === square ? latest?.serial : 'rest')}-${victory || ''}-${handshake}-${arriving}`} className={`piece-performance${gestureEffect ? ` perform-${gestureEffect}` : ''}${arriving && fun.entrance && !active ? ' perform-entrance' : ''}`} style={{'--entrance-y':`${index<32?-65:65}%`} as React.CSSProperties} data-effect={gestureEffect || (arriving && fun.entrance && !active ? 'entrance' : undefined)}>
                  <Piece
                    color={piece.color}
                    kind={piece.type}
                    scope={`board-${square}`}
                    fitToSquare
                  />
                  {allowed&&piece.type==='p'?<PawnDetails square={square} color={piece.color} last={pawnCounts[piece.color]===1} fun={fun}/>:null}
                  {gestureEffect==='indignant'?<span className="indignant-crown" aria-hidden="true">♛</span>:null}
                  </span>
                </span>
              ) : null}
              {piece && captureMarks[square] ? <span className="piece-capture-mark" aria-hidden="true" data-capture-count={captureMarks[square]}>{captureMarks[square]}</span> : null}
              {capture ? <CaptureEffect key={`capture-${capture.serial}`} motion={capture} sneak={fun.sneak && capture.captured?.square !== capture.to}/> : null}
              {landing ? <LandingEffect key={`landing-${active.serial}`} motion={active} fun={fun}/> : null}
              {index%8===0?<span className="square-coordinate rank-coordinate" aria-hidden="true">{square[1]}</span>:null}
              {index>=56?<span className="square-coordinate file-coordinate" aria-hidden="true">{square[0]}</span>:null}
              {check === square ? <span className="check-badge" aria-hidden="true">!</span> : null}
              {target ? (
                <span
                  className={piece ? "capture-ring" : "target-dot"}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
        {allowed?<MoveTrails events={events} orientation={orientation} fun={fun}/>:null}
      </div>
      <BoardWeather weather={weather} enabled={allowed&&!replayMode}/>
    </div>
    {!replayMode && allowed && fun.replay && captureReplay ? replayInOptions ? replayHost ? createPortal(<div className="capture-replay-action"><button type="button" className="secondary" onClick={()=>{setReplayNumber(n=>n+1);setReplaying(true);}}>Replay last capture</button></div>,replayHost) : null : <div className="capture-replay-action"><button type="button" className="secondary" onClick={()=>{setReplayNumber(n=>n+1);setReplaying(true);}}>Replay last capture</button></div> : null}
    {!replayMode ? <dialog ref={replayDialog} className="qk-dialog capture-replay-dialog" aria-labelledby="capture-replay-title" onCancel={()=>setReplaying(false)} onClose={()=>setReplaying(false)}>
      <div className="dialog-head"><h2 id="capture-replay-title">Capture replay</h2><button type="button" autoFocus onClick={()=>setReplaying(false)}>Close replay</button></div>
      <p>Historical capture · the match is unchanged. New moves close this preview.</p>
      {replaying && captureReplay ? <ChessBoard key={replayNumber} position={captureReplay.position} orientation={orientation} selected={null} targets={[]} last={null} check={captureReplay.check} motion={captureReplay.motion} locked onSquare={()=>{}} drag={false} playful fun={fun} replayMode /> : null}
      <button type="button" className="secondary" onClick={()=>setReplayNumber(n=>n+1)}>Replay again</button>
    </dialog> : null}</>
  );
}
export function MaterialScore({
  position,
  compact = false,
}: {
  position: Position;
  compact?: boolean;
}) {
  const total = materialTotals(position);
  const difference = total.w - total.b;
  if (compact) return <details className="material-summary"><summary>{difference===0?'Equal material':`${difference>0?'White':'Black'} +${Math.abs(difference)}`} · material</summary><p>White {total.w} pts · Black {total.b} pts. Piece value only, not a prediction of who will win.</p></details>;
  return (
    <section className="material-panel" aria-label="Material points">
      <div className="material-heading">
        <span className="material-label">Material</span>
        <span
          className="material-advantage"
          aria-live="polite"
          aria-atomic="true"
        >
          {difference === 0
            ? "Equal material"
            : `${difference > 0 ? "White" : "Black"} +${Math.abs(difference)}`}
        </span>
      </div>
      <div className="material-totals">
        {(["w", "b"] as Color[]).map((color) => (
          <div
            key={color}
            className="material-total"
            data-material-color={color}
          >
            <span>
              <i className={`color-dot dot-${color}`} />
              {color === "w" ? "White" : "Black"}
            </span>
            <strong>
              {total[color]}
              <small> pts</small>
            </strong>
          </div>
        ))}
      </div>
      <details className="material-values">
        <summary>
          Piece values
          <Icon name="chevron" />
        </summary>
        <div className="material-legend">
          {(["p", "n", "b", "r", "q"] as Kind[]).map((kind) => (
            <span
              key={kind}
              aria-label={`${pieceNames[kind]}: ${materialValues[kind]} points`}
              title={pieceNames[kind]}
            >
              <Piece color="w" kind={kind} scope={`value-${kind}`} />
              <b>{materialValues[kind]}</b>
            </span>
          ))}
        </div>
        <p>
          Pieces on the board. King excluded.
          <br />
          Material advantage, not a game result.
        </p>
      </details>
    </section>
  );
}
export function LostPieces({ losses, color, audience=false, grouped=false }: { losses: Losses | null; color: Color; audience?:boolean; grouped?:boolean }) {
  const reacting=useAudience(losses?.[color].length||0,audience);
  const name = color === "w" ? "White" : "Black";
  return (
    <div className="loss-row" data-lost-color={color}>
      <span className="loss-label">
        <i className={`color-dot dot-${color}`} aria-hidden="true" />
        {name} lost
      </span>
      <div className={`loss-tray tray-${color}`} role="list" aria-label={`${name} lost pieces`}>
        {!losses ? <span className="loss-empty">History unavailable</span> :
          losses[color].length ? (grouped ? [...new Set(losses[color])] : losses[color]).map((kind, i) => (
            <span key={`${kind}-${i}`} className={`captured-piece${reacting?' audience-react':''}`} data-effect={reacting?'audience':undefined} data-captured={kind}
              role="listitem" aria-label={`${name} ${pieceNames[kind]}${grouped ? ` ×${losses[color].filter(p=>p===kind).length}` : ""}`} title={pieceNames[kind]}>
              <Piece color={color} kind={kind} scope={`lost-${color}-${i}`} />
              {grouped && losses[color].filter(p=>p===kind).length>1 ? <b className="capture-count">×{losses[color].filter(p=>p===kind).length}</b> : null}
            </span>
          )) : <span className="loss-empty">None</span>}
      </div>
    </div>
  );
}
export function MoveHistory({ sans, cursor, available, onBrowse }: {
  sans: string[];
  cursor: number | null;
  available: boolean;
  onBrowse: (ply: number | null) => void;
}) {
  const rows = numberedMoves(sans);
  const latest = rows[rows.length - 1];
  const current = cursor ?? sans.length;
  const activeMove = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    // Keep long games usable without moving the page away from the board.
    const button = activeMove.current, list = button?.closest<HTMLOListElement>("ol");
    if (button && list) {
      const item = button.getBoundingClientRect(), viewport = list.getBoundingClientRect();
      if (item.top < viewport.top) list.scrollTop -= viewport.top - item.top;
      else if (item.bottom > viewport.bottom) list.scrollTop += item.bottom - viewport.bottom;
    }
  }, [cursor, sans.length]);
  return (
    <details className="move-history board-history" onToggle={e => {
      if (!e.currentTarget.open) onBrowse(null);
    }}>
      <summary>
        <span>Move history</span>
        <span className="latest-move">{latest ? `${latest.number}. ${latest.white} ${latest.black}` : "New game"}</span>
        <Icon name="chevron" />
      </summary>
      {rows.length ? <>
        <label className="review-timeline">Position {current} / {sans.length}
          <input type="range" aria-label="Review timeline" min="0" max={sans.length} value={current} disabled={!available} onChange={e=>onBrowse(Number(e.target.value))}/>
        </label>
        <nav className="review-navigation" aria-label="Review moves">
          <button type="button" disabled={!available || current === 0} onClick={() => onBrowse(0)}>First</button>
          <button type="button" disabled={!available || current === 0} onClick={() => onBrowse(current - 1)}>Previous</button>
          <button type="button" disabled={!available || current === sans.length} onClick={() => onBrowse(current + 1)}>Next</button>
          <button type="button" disabled={cursor === null} onClick={() => onBrowse(null)}>Return to game</button>
        </nav>
        <p className="review-description" role="status">
          {!available ? "Position review unavailable for this history." : cursor === null ? "Current position. Select a move to review it." :
            `Reviewing position ${cursor} of ${sans.length}${cursor === 0 ? " · Starting position" : ""}. Return to game to play.`}
        </p>
        <ol className="move-list" aria-label="Moves">
          {rows.map(row => (
            <li key={row.number}>
              <span className="move-number">{row.number}.</span>
              {[row.white, row.black].map((san, side) => {
                const ply = (row.number - 1) * 2 + side + 1;
                return san ? <button type="button" key={side} disabled={!available}
                  ref={cursor === ply ? activeMove : undefined}
                  aria-label={`${row.number}. ${side === 0 ? "White" : "Black"}: ${san}`}
                  aria-current={cursor === ply ? "step" : undefined} onClick={() => onBrowse(ply)}>{san}</button> : <span key={side}>—</span>;
              })}
            </li>
          ))}
        </ol>
      </> : <p className="history-empty">Your moves will appear here.</p>}
    </details>
  );
}
function PlayerBar({
  clock,
  color,
  name,
  active,
  yours,
  presence,
  detail,
  losses, audience=false, turnText,
}: {
  clock?: ClockState;
  color: Color;
  name: string;
  active: boolean;
  yours: boolean;
  presence?: string;
  detail?: string;
  losses: Losses | null; position:Position; audience?:boolean; turnText?:string;
}) {
  const capturedPoints=losses?.[color==='w'?'b':'w'].reduce((sum,kind)=>sum+materialValues[kind],0);
  const waitingForFriend = !yours && name === "Seat open";
  return (
    <div className={`player-strip${active ? " player-active" : ""}`} data-player-color={color}><div className={`player-bar${yours ? " player-yours" : ""}`}>
      <span className="player-identity">
        <i className={`color-dot dot-${color}`} aria-hidden="true" />
        <span className="player-copy">
          <strong className="player-handle">{name}</strong>
          <span className="player-meta">
            {color === "w" ? "White" : "Black"}
            {yours ? " · You" : ""}
            {detail ? ` · ${detail}` : ""}
          </span>
        </span>
      </span>
      <span className="player-signals">
        {waitingForFriend ? <span className="player-quip">vai logo Paloma</span> : null}
        {clock?.time_control ? <ChessClock state={clock} color={color} /> : null}
        {presence ? (
          <span
            className={`presence-mark${presence === "Opponent at the table" ? " present" : ""}`}
            role="img"
            aria-label={presence}
            title={presence}
          />
        ) : null}
        {active ? (
          <span className="turn-label">
            <i aria-hidden="true" />
            {turnText || (yours ? "Your turn" : "To move")}
          </span>
        ) : null}
      </span>
    </div><div className="player-material-row"><LostPieces color={color} losses={losses} audience={audience} grouped/>
      <span className="player-material" title="Points for pieces captured: pawn 1, knight and bishop 3, rook 5, queen 9" aria-label={`${color==='w'?'White':'Black'} captured ${capturedPoints === undefined ? 'unknown' : capturedPoints} points`}>
        {capturedPoints === undefined ? <span>—</span> : <strong>{capturedPoints} pts captured</strong>}
      </span></div></div>
  );
}
export type GameSurfaceProps = {
  gameId: string;
  onReviewStart: () => void;
  clock?: ClockState;
  pauseControls?: React.ReactNode;
  drawControls?: React.ReactNode;
  viewerLost?: boolean;
  tableSettings?: React.ReactNode;
  onCloseControls?: () => void;
  historyTools?: React.ReactNode;
  postGame?: React.ReactNode;
  zen?: boolean;
  controlsOpen?: boolean;
  onToggleControls?: () => void;
  idle?: boolean;
  presenceLabel?: string;
  canNudge?: boolean;
  onNudge?: () => void;
  players?: {
    w?: { handle: string; quiet_points: number } | null;
    b?: { handle: string; quiet_points: number } | null;
  };
  tableExtra?: React.ReactNode;
  animalReaction?: string;
  computerEngine?: string;
  pendingOnlineMove?:boolean;
  seriesScore?:{white:number;black:number;draws:number};
  seriesPlayers?:{whiteId:string;blackId:string;gameNumber:number;eventId?:string};
  drawPending?:boolean;
  onReviewGame:()=>void;
  onNewOpponent:()=>void;
  board: BoardProps;
  online: boolean;
  code?: string;
  connection: string;
  level: number;
  me: Color | null;
  opponentJoined: boolean;
  turn: Color;
  ended: boolean;
  waiting: boolean;
  spectator: boolean;
  status: string;
  hint: string;
  losses: Losses | null;
  sans: string[];
  busy: boolean;
  onBack: () => void;
  onSettings: () => void;
  onNew: () => void;
  onResign: () => void;
  onCopy: () => void;
  onShare?: () => void;
  onReconnect?: () => void;
  sound: boolean;
  onSound: () => void;
};
export function GameSurface(p: GameSurfaceProps) {
  const stage=React.useRef<HTMLElement>(null);
  const [pairRecord,setPairRecord]=React.useState<{white:number;black:number;draws:number}|null>(null);
  const whiteId=p.seriesPlayers?.whiteId,blackId=p.seriesPlayers?.blackId;
  React.useEffect(()=>{
    setPairRecord(null);if(!whiteId||!blackId||whiteId===blackId)return;
    let alive=true;
    void accountRequest<{wins:number;losses:number;draws:number}>(`/players/${encodeURIComponent(whiteId)}/head-to-head/${encodeURIComponent(blackId)}`,undefined,identityHeaders()).then(r=>{
      if(alive && [r.wins,r.losses,r.draws].every(n=>Number.isSafeInteger(n)&&n>=0))setPairRecord({white:r.wins,black:r.losses,draws:r.draws});
    }).catch(()=>{});return()=>{alive=false;};
  },[whiteId,blackId,p.seriesPlayers?.gameNumber,p.seriesPlayers?.eventId]);
  const scoreboard=pairRecord||p.seriesScore;
  const [replayHost,setReplayHost]=React.useState<HTMLDivElement|null>(null);
  React.useLayoutEffect(()=>{
    const el=stage.current;if(!el)return;
    const resize=()=>{
      if(!matchMedia('(max-width: 600px)').matches){el.style.removeProperty('--fit-board-size');return;}
      const panels=Array.from(el.querySelectorAll<HTMLElement>(':scope > .player-strip, :scope > .board-lock'));
      const reserved=panels.reduce((n,p)=>n+p.getBoundingClientRect().height,0)+panels.length*4;
      const side=Math.floor(Math.max(8,Math.min(el.clientWidth,el.clientHeight-reserved)));
      if(el.style.getPropertyValue('--fit-board-size')!==`${side}px`)el.style.setProperty('--fit-board-size',`${side}px`);
    };
    const observer=new ResizeObserver(resize);observer.observe(el);
    const children=new MutationObserver(resize);children.observe(el,{childList:true});
    for(const panel of el.querySelectorAll('.player-strip'))observer.observe(panel);
    window.addEventListener('resize',resize);resize();
    return()=>{observer.disconnect();children.disconnect();window.removeEventListener('resize',resize);};
  },[]);
  const [boardLocked,setBoardLocked]=React.useState(false);
  React.useEffect(()=>setBoardLocked(false),[p.gameId]);
  const [selection, setSelection] = React.useState<ReviewSelection | null>(null);
  const validSelection = selection && reviewStillValid(selection, p.gameId, p.sans) ? selection : null;
  const review = React.useMemo(() => validSelection ? positionAtPly(validSelection.line, validSelection.ply) : null, [validSelection]);
  const reviewing = review !== null;
  const shownLosses = review ? review.losses : p.losses;
  React.useEffect(() => {
    if (selection && !validSelection) setSelection(null);
  }, [selection, validSelection]);
  function browse(ply: number | null) {
    if (ply !== null) p.onReviewStart();
    setSelection(ply === null ? null : { gameId: p.gameId, line: [...p.sans], ply });
  }
  const shownBoard: BoardProps = review ? {
    ...p.board, position: review.position, last: review.last, check: review.check,
    selected: null, targets: [], motion: null, motionSequence:p.board.motionSequence ?? p.board.motion?.serial, locked: true, drag: false,
    onSquare: () => {}, onMove: undefined, dragTargets:undefined, playful: false,
  } : p.board;
  const captureMarks=React.useMemo(()=>pieceCaptureCounts(reviewing ? validSelection!.line.slice(0,validSelection!.ply) : p.sans, shownBoard.position),[reviewing,validSelection,p.sans,shownBoard.position]);
  const bottom = p.board.orientation;
  const top = bottom === "w" ? "b" : "w";
  const sheet = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    const dialog = sheet.current;
    if (!dialog) return;
    if (p.controlsOpen && !dialog.open) dialog.showModal();
    else if (!p.controlsOpen && dialog.open) dialog.close();
  }, [p.controlsOpen]);
  const playerName = (color: Color) =>
    p.players?.[color]?.handle ||
    (p.online
      ? color === p.me
        ? "You"
        : p.opponentJoined
          ? "Opponent"
          : "Seat open"
      : color === p.me
        ? "You"
        : "Computer");
  const detail = (color: Color) =>
    !p.online && color !== p.me
      ? `Level ${p.level}`
      : undefined;
  const contextual = p.online ? (
    p.waiting ? (
      <button type="button" className="primary" onClick={p.onShare || p.onCopy}>
        <Icon name={p.onShare ? "link" : "copy"} />
        {p.onShare ? "Share invite" : "Copy invite"}
      </button>
    ) : p.spectator ? null : p.ended ? (
      <button
        type="button"
        className="primary"
        disabled={p.busy}
        onClick={p.onNew}
      >
        <Icon name="new" />
        Rematch
      </button>
    ) : (
      <button
        type="button"
        className="table-resign"
        onClick={p.onResign}
        disabled={p.busy}
      >
        <Icon name="flag" />
        Resign
      </button>
    )
  ) : (
    <button
      type="button"
      className={p.ended ? "primary" : "table-new"}
      disabled={p.busy}
      onClick={p.onNew}
    >
      <Icon name="new" />
      {p.ended ? "Rematch" : "New game"}
    </button>
  );
  return (
    <main
      className={`qk game-shell mobile-table${p.zen ? " zen-table" : ""}${p.idle ? " quiet-idle" : ""}`}
    >
      <header className="game-header">
        <button
          type="button"
          className="icon-button"
          aria-label="Leave game"
          onClick={p.onBack}
        >
          <Icon name="back" />
        </button>
        <div className="game-title">
          <h1>
            Quiet Knight<span>.</span>
          </h1>
          {p.online ? (
            <button
              type="button"
              className={`connection ${p.connection === "Live" ? "connection-live" : ""}`}
              onClick={p.onReconnect}
              title="Reconnect to this room"
              aria-label={`Connection: ${p.connection}. Reconnect`}
            >
              <i />
              {p.connection}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Open table controls"
          aria-haspopup="dialog"
          aria-expanded={p.controlsOpen === true}
          onClick={p.onToggleControls}
        >
          <Icon name="settings" />
        </button>
      </header>
      <div className="game-layout">
        <section ref={stage} className="board-stage" aria-label="Playing area">
          <PlayerBar
            color={top}
            losses={shownLosses} position={shownBoard.position} audience={Boolean(!reviewing&&p.board.playful&&p.board.fun?.audience)}
            turnText={!p.online && top!==p.me ? p.status.includes("paused")?"Paused":p.status.includes("unavailable")?"Unavailable":"Thinking" : undefined}
            clock={p.clock}
            name={playerName(top)}
            detail={detail(top)}
            presence={top !== p.me ? p.presenceLabel : undefined}
            active={!reviewing && !p.ended && !p.waiting && !p.clock?.clock_paused && p.turn === top}
            yours={top === p.me}
          />
          <ChessBoard {...shownBoard} captureMarks={captureMarks} replayInOptions replayHost={replayHost} locked={shownBoard.locked||boardLocked} onSquare={s=>{if(!boardLocked)shownBoard.onSquare(s);}} onMove={boardLocked?undefined:shownBoard.onMove}/>
          {boardLocked?<BoardLock locked onChange={setBoardLocked}/>:null}
          <CaptureFlight stage={stage} motion={reviewing ? null : p.board.motion} observedSerial={p.board.motionSequence ?? p.board.motion?.serial} enabled={Boolean(!reviewing && p.board.playful && p.board.fun?.tray)} orientation={p.board.orientation}/>
          <PlayerBar
            color={bottom}
            losses={shownLosses} position={shownBoard.position} audience={Boolean(!reviewing&&p.board.playful&&p.board.fun?.audience)}
            turnText={!p.online && bottom!==p.me ? p.status.includes("paused")?"Paused":p.status.includes("unavailable")?"Unavailable":"Thinking" : undefined}
            clock={p.clock}
            name={playerName(bottom)}
            detail={detail(bottom)}
            active={!reviewing && !p.ended && !p.waiting && !p.clock?.clock_paused && p.turn === bottom}
            yours={bottom === p.me}
          />
        </section>
        <section className="table-below" aria-label="Current game">

          {reviewing ? <div className="review-banner" role="status">
            <span>Review · Position {validSelection!.ply} of {p.sans.length}</span>
            <button type="button" disabled={validSelection!.ply===0} onClick={()=>browse(validSelection!.ply-1)}>Previous</button>
            <button type="button" disabled={validSelection!.ply===validSelection!.line.length} onClick={()=>browse(validSelection!.ply+1)}>Next</button>
            <button type="button" onClick={() => browse(null)}>Return to game</button>
          </div> : null}
          <div
            className={`game-status${p.board.check ? " status-check" : ""}${!reviewing && !p.ended && !p.waiting && !p.spectator && p.turn===p.me ? " status-your-turn" : ""}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="state-dot" aria-hidden="true" />
            <h2>{reviewing ? `Live game: ${p.status}` : p.status}</h2>
            {p.ended ? <span className="end-reason">{p.hint}</span> : null}
          </div>
          {scoreboard ? <div className="series-score" aria-label={pairRecord?"Wins together":"Wins at this table"} title={pairRecord?"Recorded games between these accounts":"Counts this table's games since the score feature was added"}><span>{playerName(top)} {top==='w'?scoreboard.white:scoreboard.black}</span><span>Draws {scoreboard.draws}</span><span>{playerName(bottom)} {bottom==='w'?scoreboard.white:scoreboard.black}</span><small>{pairRecord?'All recorded games':'This table · since update'}</small></div> : null}
          {!p.ended && !p.spectator ? <div className="main-game-actions"><button type="button" className="secondary" disabled={p.busy} onClick={p.online?p.onBack:p.onNew}><Icon name="new"/> New game</button></div> : null}
          {p.online && (p.connection !== 'Live' || p.pendingOnlineMove) ? <p className="connection-notice" role="status">{p.pendingOnlineMove ? 'Sending move · waiting for server confirmation' : `${p.connection} · Showing the last confirmed position. Moves are paused until reconnected.`}</p> : null}

          {p.ended ? <div className="game-end-actions" aria-label="Game finished">{!p.spectator ? contextual : null}<button className="secondary" onClick={p.onReviewGame}>Review game</button><button className="secondary" onClick={p.onNewOpponent}>New opponent</button></div> : null}
          {p.animalReaction ? <p className="animal-reaction" role="status" aria-live="polite" aria-atomic="true">{p.animalReaction}</p> : null}
          {p.ended && !p.spectator && !p.waiting && p.viewerLost ? (
            <p className="loss-message">{LOSS_MESSAGE}</p>
          ) : null}

          {p.drawPending && !p.controlsOpen ? p.drawControls : null}


        </section>
      </div>
      <dialog
        ref={sheet}
        className="qk-dialog table-sheet"
        aria-labelledby="table-controls-title"
        onClose={e=>{if(e.target===e.currentTarget)p.onCloseControls?.();}}
        onCancel={(e) => {
          if(e.target!==e.currentTarget)return;
          e.preventDefault();
          p.onCloseControls?.();
        }}
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            p.onCloseControls?.();
        }}
      >
        <div className="dialog-head">
          <div>
            <h2 id="table-controls-title">Table controls</h2>
            <p>{p.online ? `Room ${p.code}` : `Computer · Level ${p.level}`}</p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close table controls"
            autoFocus
            onClick={p.onCloseControls}
          >
            <Icon name="close" />
          </button>
        </div>
        {p.controlsOpen ? (
          <div className="dialog-body table-sheet-body">
            {p.online ? (
              <div className="sheet-invite">
                <button
                  type="button"
                  className="secondary"
                  onClick={p.onShare || p.onCopy}
                >
                  <Icon name="link" />
                  {p.onShare ? "Share invite" : "Copy invite"}
                </button>
                {p.onShare ? (
                  <button
                    type="button"
                    className="copy-invite-link"
                    onClick={p.onCopy}
                  >
                    Copy invite
                  </button>
                ) : null}
              </div>
            ) : null}
            {p.presenceLabel ? (
              <p className="table-presence">{p.presenceLabel}</p>
            ) : null}
            {p.canNudge ? (
              <button
                type="button"
                className="secondary wide table-nudge"
                disabled={p.busy}
                onClick={p.onNudge}
              >
                Nudge
              </button>
            ) : null}
            {p.players?.w || p.players?.b ? (
              <div className="sheet-players">
                {(["w", "b"] as Color[]).map((color) =>
                  p.players?.[color] ? (
                    <p key={color}>
                      {p.players[color]!.handle} ·{" "}
                      {p.players[color]!.quiet_points} Quiet Points
                    </p>
                  ) : null,
                )}
              </div>
            ) : null}
            <section className="sheet-section" aria-label="Game actions"><h3>Game actions</h3><BoardLock locked={boardLocked} onChange={locked=>{setBoardLocked(locked);if(locked){p.onReviewStart();p.onCloseControls?.();}}}/>
              {!p.ended && !p.waiting ? contextual : null}{p.drawControls}
              <button className="secondary" onClick={p.onSound}>{p.sound?'Mute move sounds':'Enable move sounds'}</button>
            </section>
            <FirstGameTips/>
            <div ref={setReplayHost}/>
          {!p.online ? <p className="engine-status" role="status">{p.computerEngine || 'Computer'} · Level {p.level}{!p.ended && p.turn!==p.me ? ` · ${p.status}` : ''}</p> : null}
            {p.pauseControls}
            {p.ended?p.postGame:null}
            {p.waiting?contextual:null}
            {p.tableExtra}
            <MoveHistory sans={p.sans} cursor={reviewing ? validSelection!.ply : null}
              available={p.losses !== null} onBrowse={ply=>{browse(ply);if(ply!==null)p.onCloseControls?.();}} />
            {p.board.fun?.movie&&p.sans.length>0?<GameMovie gameId={p.gameId} sans={p.sans} orientation={p.board.orientation} motionAllowed={p.board.playful}/>:null}
            <MaterialScore position={shownBoard.position} />
            {p.historyTools}
            <GameSoFar
              position={p.board.position}
              sans={p.sans}
              losses={p.losses}
            />
            <details className="table-preferences">
              <summary>
                Preferences & diagnostics
                <Icon name="chevron" />
              </summary>
              {p.tableSettings}
            </details>
            <p className="table-note">
              {p.online
                ? p.spectator
                  ? "You are watching this table."
                  : "Your seat stays with this room on this device."
                : `${p.computerEngine || "Computer"} · Saved on this device`}
            </p>
          </div>
        ) : null}
      </dialog>
    </main>
  );
}
export function HomeSurface({
  identity, extras, mascotEnabled=false, sound=false, volume=80, soundTheme='classic',
  level,
  joinCode,
  busy,
  onLevel,
  onCode,
  onCreate,
  onJoin,
  onComputer,
  onSettings,
  resumeLive,
  onResumeLive,
}: {
  mascotEnabled?:boolean; sound?:boolean; volume?:number; soundTheme?:SoundTheme;
  identity?: React.ReactNode;
  extras?: React.ReactNode;
  resumeLive?: string | null;
  onResumeLive?: () => void;
  level: number;
  joinCode: string;
  busy: boolean;
  onLevel: (n: number) => void;
  onCode: (s: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  onComputer: (color: Color) => void;
  onSettings: () => void;
}) {
  return (
    <main className="qk home-shell">
      <header className="home-header">
        <div className="wordmark">
          <HomeKnight enabled={mascotEnabled} sound={sound} volume={volume} theme={soundTheme}/>
          <a href="./" aria-label="Quiet Knight home">Quiet Knight<span className="brand-stop">.</span></a>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Open settings"
          onClick={onSettings}
        >
          <Icon name="settings" />
        </button>
      </header>
      <div className="home-layout">
        <section className="home-intro">
          <p className="intro-caption">CHESS, AT YOUR PACE</p>
          <h1>
            Your next
            <br />
            <em>good move.</em>
          </h1>
          <p className="intro-description">
            A friend across the table. Or a game of your own.
            <br />Settle in. Play beautifully.
          </p>
          <div className="home-art" aria-hidden="true">
            <div className="display-board">
              {Array.from({ length: 12 }, (_, i) => (
                <span
                  key={i}
                  className={
                    ((i % 4) + Math.floor(i / 4)) % 2
                      ? "display-dark"
                      : "display-light"
                  }
                />
              ))}
            </div>
            <div className="hero-piece hero-knight">
              <Piece color="w" kind="n" scope="hero-knight" />
            </div>
            <div className="hero-piece hero-king">
              <Piece color="b" kind="k" scope="hero-king" />
            </div>
            <span className="art-signature">The quiet is yours.</span>
          </div>
        </section>
        <div className="home-play">
          {identity}
          <section className="home-section friend-section">
            <div className="section-heading">
              <h2>Play a friend</h2>
              <span className="mode-mark">
                <i />
                Friend game
              </span>
            </div>
            <p>Untimed friend play requires a compatible server. Existing timed tables keep their clocks.</p>
            <button
              type="button"
              className="primary wide"
              onClick={onCreate}
              disabled={busy}
            >
              {busy ? "Please wait…" : "Create live game"}
              <Icon name="arrow" />
            </button>
            {resumeLive ? (
              <button
                type="button"
                className="secondary wide"
                style={{ marginTop: 10 }}
                onClick={onResumeLive}
                disabled={busy}
              >
                Resume live game <small>{resumeLive}</small>
                <Icon name="arrow" />
              </button>
            ) : null}
            <div className="join-label">Have an invite code?</div>
            <form
              className="join-row"
              onSubmit={(e) => {
                e.preventDefault();
                onJoin();
              }}
            >
              <input
                aria-label="Room code"
                autoComplete="off"
                spellCheck={false}
                placeholder="Room code"
                maxLength={6}
                value={joinCode}
                onChange={(e) =>
                  onCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
              />
              <button className="secondary" type="submit" disabled={busy}>
                Join
                <Icon name="arrow" />
              </button>
            </form>
          </section>
          <section className="home-section computer-section">
            <div className="section-heading">
              <h2>Play the computer</h2>
              <span className="mode-mark">Computer</span>
            </div>
            <p>Stockfish 18 Lite, bundled for offline play. Choose your strength and side.</p>
            <div className="study-actions" aria-label="Difficulty presets">{([['Beginner',1],['Casual',3],['Club',5],['Strong',9]] as const).map(([name,n])=><button className="secondary" type="button" key={n} aria-pressed={level===n} onClick={()=>onLevel(n)}>{name}</button>)}</div>
            <div className="level-heading">
              <label htmlFor="qk-level">Difficulty</label>
              <span>
                Level <strong>{level}</strong>
                <span className="level-total"> / 10</span>
              </span>
            </div>
            <input
              id="qk-level"
              aria-label="Computer level"
              className="level-range"
              type="range"
              min="1"
              max="10"
              value={level}
              onChange={(e) => onLevel(Number(e.target.value))}
            />
            <div className="color-choice">
              {(["w", "b"] as Color[]).map((c) => (
                <button
                  className={`color-button choice-${c}`}
                  key={c}
                  type="button"
                  aria-label={`Play ${c === "w" ? "White" : "Black"}`}
                  onClick={() => onComputer(c)}
                  disabled={busy}
                >
                  <span className="choice-piece">
                    <Piece color={c} kind="k" scope={`choose-${c}`} />
                  </span>
                  <span className="choice-label">
                    Play {c === "w" ? "White" : "Black"}
                    <small>
                      {c === "w"
                        ? "Make the first move"
                        : "Let the game come to you"}
                    </small>
                  </span>
                </button>
              ))}
            </div>
            <p className="computer-footnote">
              Offline Stockfish · Saved on this device
            </p>
          </section>
          {extras}
        </div>
      </div>
      <footer className="home-footer">
        <span>Play freely. No account required.</span>
        <span>Take your time.</span>
      </footer>
    </main>
  );
}
export function PromotionChoices({color,onChoose}:{color:Color;onChoose:(kind:Kind)=>void}) {
 const [preview,setPreview]=React.useState<Kind|null>(null);
 const description:Record<string,string>={q:'Moves along ranks, files and diagonals.',r:'Moves along ranks and files.',b:'Moves diagonally.',n:'Jumps in an L shape; can fork pieces.'};
 return <><p>Preview the piece your pawn becomes, then confirm.</p><div className="promotion-options">
 {(['q','r','b','n'] as Kind[]).map(kind=><button type="button" key={kind} data-autofocus={kind==='q'?true:undefined} aria-label={`Promote to ${pieceNames[kind]}`} aria-pressed={preview===kind} onClick={()=>setPreview(kind)}><Piece color={color} kind={kind} scope={`promotion-${kind}`}/><span>{pieceNames[kind]}</span></button>)}
 </div>{preview?<section className="promotion-preview" aria-label="Promotion preview"><div><Piece color={color} kind={preview} scope="promotion-preview"/></div><p><strong>{pieceNames[preview]}</strong> · {description[preview]}</p><button className="primary" type="button" onClick={()=>onChoose(preview)}>Confirm promotion</button></section>:null}</>;
}
