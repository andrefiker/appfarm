import {adaptiveLevel} from './review-assessment';
import {InviteQR,parseInvitation} from './invitation';
import {About} from './about';
import {StudyRoom} from './StudyRoom';
import type {StudySeed} from './StudyRoom';
import {useServerCapabilities} from './server-capabilities';
import {usePlayPreferences,PlaySettings} from './play-preferences';
import { viewerLost } from "./post-game";
import type {ClockState} from './chess-clock';
import { ClockControls } from './clock-controls';
import type { PauseAction } from './clock-controls';
import { GameExports, GamePostcard, FinalPosition } from "./game-keepsake";
import { recentTables, rememberTable } from "./game-record";
import type { GameRecord } from "./game-record";
import {
  useTablePreferences,
  useQuietIdle,
  atmospheres,
} from "./table-atmosphere";
import type { Atmosphere } from "./table-atmosphere";
import { HeadToHead } from "./head-to-head";
import { useKnightId, KnightIdPanel, AccountGate } from "./knight-id";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { api, joinRequestKey, RequestTimeout, isQuota } from "./network";
import { loadLocal, saveLocal, useOfflineFiles } from "./offline";
import { shareInvite } from "./invite-share";
import { diagnosticReport } from "./diagnostics";
import { lastLiveRoom, rememberLiveRoom, forgetLiveRoom } from "./live-resume";
import { useChessAudio } from "./chess-audio";
import { GameSurface, HomeSurface, Icon, PromotionChoices } from "./chess-ui";
import { useRoomRealtime } from "./use-room-realtime";
import { useMoveNotifications } from "./push-notifications";
import type { Position, Motion } from "./chess-ui";
import type { Color } from "./pieces";
import { lossesFromHistory } from "./chess-view-model";
import { buildGame } from "./computer";
import { animalReactionForMove } from "./animal-reactions";
import { useComputerOpponent } from "./use-computer-opponent";
import type { LocalMove } from "./computer";
type Role = "white" | "black" | "spectator";
type RoomState = ClockState & {
  game_number?: number;
  kind?:string;white_nickname?:string;black_nickname?:string;
  rematch_proposal?:{id:string;by:Color;colors:"same"|"swap"}|null;
  proposal?:{id:string;kind:"draw"|"takeback";by:Color}|null;
  reaction?:{kind:string;by:Color;at:number}|null;
  white_player?: { id: string; handle: string; quiet_points: number } | null;
  black_player?: { id: string; handle: string; quiet_points: number } | null;
  points_policy?: { eligible: boolean; reason: string; remaining: number };
  score_event?: {
    id: string;
    scored: boolean;
    reason: string;
    white_points: number;
    black_points: number;
    result: string;
  } | null;
  code: string;
  fen: string;
  turn: Color;
  status: "waiting" | "active" | "checkmate" | "draw" | "resigned" | "timeout" | "timeout_draw";
  winner: Color | null;
  version: number;
  created_at: number;
  white_joined: boolean;
  black_joined: boolean;
  moves: string[];
  last_move: { from: string; to: string; san: string } | null;
};
type Modal =
  | "memory"
  | "rematch"
  | "identity"
  | "settings"
  | "leave"
  | "restart"
  | "resign"
  | "invite"
  | null;
const REACTIONS:Record<string,string>={hello:"👋", "well-played":"👏",thanks:"🙏",fox:"🦊",owl:"🦉",tortoise:"🐢"};
const BUILD = "Quiet Knight 1.1.2 · wood table";
function roleColor(role: Role | null): Color | null {
  return role === "white" ? "w" : role === "black" ? "b" : null;
}
function roomLink(code: string) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("room", code);
  return url.toString();
}
function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
const localGameIdKey = (playerId?: string) => playerId ? `qk-local-table-id-v1:${playerId}` : "qk-local-table-id-v1";
function limited(err: unknown) {
  return isQuota(err);
}
function failureText(err: unknown, fallback: string) {
  if (err instanceof RequestTimeout)
    return "The server response timed out. Your last action may have arrived; reconnect before repeating a move.";
  return limited(err)
    ? "The service limit has been reached. Please wait before trying again."
    : fallback;
}
export default function GameApp() {
  const knight = useKnightId();
  const compatibility=useServerCapabilities();
  const {prefs,update:updatePrefs}=usePlayPreferences();
  const [studySeed,setStudySeed]=useState<StudySeed|undefined>();
  const [flipped,setFlipped]=useState(false);
  const [pendingMove,setPendingMove]=useState<{from:string;to:string;promotion:string}|null>(null);
  const [enginePaused,setEnginePaused]=useState(false);
  const [redoMoves,setRedoMoves]=useState<LocalMove[]>([]);
  const [memories, setMemories] = useState(() => recentTables("guest"));
  const [viewedGame, setViewedGame] = useState<GameRecord | null>(null);
  const [localTableId, setLocalTableId] = useState(() => {
    const id = stored(localGameIdKey("guest")) || crypto.randomUUID();
    remember(localGameIdKey("guest"), id);
    return id;
  });
  const table = useTablePreferences();
  const [tableControls, setTableControls] = useState(false);
  const [initialLocal] = useState(() => loadLocal("guest"));
  const [resumeLive, setResumeLive] = useState(lastLiveRoom);
  const [diagnostics, setDiagnostics] = useState("");
  const [diagnosing, setDiagnosing] = useState(false);
  const offlineStatus = useOfflineFiles();
  const [screen, setScreen] = useState<"home" | "game" | "study">("home");
  const [mode, setMode] = useState<"local" | "online">("local");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [roleGame, setRoleGame] = useState(1);
  const [presence, setPresence] = useState<{
    white: boolean;
    black: boolean; spectators?:number;
  } | null>(null);
  const [seatToken, setSeatToken] = useState<string | null>(null);
  const notifications = useMoveNotifications(room?.code || null, seatToken);
  const [friendSide,setFriendSide]=useState("white");
  const [friendKind,setFriendKind]=useState("live");
  const [inviteInput,setInviteInput]=useState("");
  const [joinCode, setJoinCode] = useState("");
  const [localMoves, setLocalMoves] = useState<LocalMove[]>(initialLocal.moves);
  const [humanColor, setHumanColor] = useState<Color>(initialLocal.color);
  const [level, setLevel] = useState(initialLocal.level);
  const [selected, setSelected] = useState<string | null>(null);
  const [promotion, setPromotion] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [sound, setSound] = useState(() => stored("qk-sound") === "true");
  const [unquiet, setUnquiet] = useState(() => stored("qk-unquiet-mode-v1") === "true");
  const [animalReaction, setAnimalReaction] = useState("");
  const lastAnimalReaction = useRef(0);
  const animalReactionTimer = useRef<number | null>(null);
  const [haptics, setHaptics] = useState(
    () => stored("qk-haptics") === "true",
  );
  const [volume, setVolume] = useState(() => {
    const saved = Number(stored("qk-volume") || "80");
    return Number.isFinite(saved) ? Math.max(20, Math.min(100, saved)) : 80;
  });
  const chessAudio = useChessAudio(sound, volume);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [motion, setMotion] = useState<Motion>(null);
  const roomCodeRef = useRef<string | null>(null);
  const requestLock = useRef(false);
  const requestGeneration = useRef(0);
  const resumeStarted = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const preferences = useRef({ sound, haptics });
  preferences.current = { sound, haptics };
  const accountId = knight.player?.id ?? "guest";
  const activeAccount = useRef<string>("guest");
  const [gameOwner, setGameOwner] = useState<string>("guest");
  const savedComputerGames = useRef(new Set<string>());
  const [onlineRetry, setOnlineRetry] = useState(0);
  const acceptRoom = useCallback((next: RoomState) => {
    if (
      !next ||
      roomCodeRef.current !== next.code ||
      !Number.isFinite(next.version)
    )
      return;
    setRoom((previous) =>
      previous?.code === next.code && (previous.version > next.version || (previous.version === next.version && (previous.server_now??0)>=(next.server_now??0)))
        ? previous
        : next,
    );
  }, []);
  useEffect(()=>{requestGeneration.current++;setPendingMove(null);},[room?.code,room?.game_number]);
  const { connection, connectionId, detail, reconnect, getDiagnostics } =
    useRoomRealtime<RoomState>(room?.code || null, acceptRoom, {
      seatToken,
      onPresence: setPresence,
      onRole: (nextRole, number) => {
        setRole(nextRole);
        setRoleGame(number);
      },
      onNudge: () => {
        if (document.visibilityState === "visible")
          setMessage("Your opponent nudged you.");
      },
    });
  useEffect(() => {
    const previous = activeAccount.current;
    if (previous === accountId) return;
    activeAccount.current = accountId;
    requestGeneration.current++;
    roomCodeRef.current = null;
    if (resumeLive) forgetLiveRoom(resumeLive);
    setResumeLive(null);
    setRoom(null); setRole(null); setRoleGame(1); setPresence(null); setSeatToken(null);
    setJoinCode(""); setMode("local"); setScreen("home"); setSelected(null);
    setPromotion(null); setModal(current => current === "identity" ? current : null); setViewedGame(null); setMessage("");
    const saved = loadLocal(accountId);
    setLocalMoves(saved.moves); setHumanColor(saved.color); setLevel(saved.level);
    const id = stored(localGameIdKey(accountId)) || crypto.randomUUID();
    setLocalTableId(id); remember(localGameIdKey(accountId), id);
    setMemories(recentTables(accountId));
    endReactionKey.current = "";
    setGameOwner(accountId);
  }, [accountId]);
  useEffect(() => {
    if (mode === "local" && gameOwner === accountId)
      if(!saveLocal({ moves: localMoves, color: humanColor, level }, accountId))setMessage("Your game could not be saved. Export it before closing; existing recovery data has been kept.");
  }, [localMoves, humanColor, level, mode, accountId, gameOwner]);
  useEffect(() => {
    const retry = () => setOnlineRetry(value => value + 1);
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);
  const localGame = useMemo(() => buildGame(localMoves), [localMoves]);
  const game = useMemo(
    () => (room ? new Chess(room.fen) : localGame),
    [room?.fen, localGame],
  );
  const me = room ? roleColor(role) : humanColor;
  const orientation = flipped ? (me === "b" ? "w" : "b") : me || "w";
  const turn = room ? room.turn : localGame.turn();
  const ended = room
    ? !["waiting", "active"].includes(room.status)
    : localGame.isGameOver();
  const endReactionKey = useRef("");
  useEffect(() => {
    if (!ended || screen !== "game" || !unquiet || table.pieceSet !== "animal-kingdom") return;
    const key = room ? `${room.code}:${room.game_number || 1}:${room.status}` : `${localTableId}:${localMoves.length}:finished`;
    if (endReactionKey.current === key) return;
    endReactionKey.current = key;
    const winner = room?.winner || (localGame.isCheckmate() ? (localGame.turn() === "w" ? "b" : "w") : null);
    setAnimalReaction(winner && winner === me ? "The kingdom survives." : winner ? "The kingdom requests an investigation." : "The kingdom survives.");
  }, [ended, screen, unquiet, table.pieceSet, room?.code, room?.game_number, room?.status, room?.winner, localTableId, localMoves.length, localGame, me]);
  const waiting = room?.status === "waiting";
  const history = useMemo(() => {
    if (!room) return localGame.history({ verbose: true });
    try {
      const replay = new Chess();
      for (const san of room.moves) replay.move(san);
      return replay.history({ verbose: true });
    } catch {
      return null;
    }
  }, [room?.moves, localGame]);
  const losses = useMemo(
    () => (history ? lossesFromHistory(history) : null),
    [history],
  );
  const sans = room?.moves || localMoves.map((m) => m.san || "");
  const last =
    room?.last_move ||
    (localMoves.length ? localMoves[localMoves.length - 1] : null);
  const position = useMemo(() => {
    const out: Position = {};
    for (const row of game.board())
      for (const piece of row)
        if (piece) out[piece.square] = { color: piece.color, type: piece.type };
    return out;
  }, [game]);
  const check = game.inCheck()
    ? Object.keys(position).find(
        (s) => position[s].type === "k" && position[s].color === turn,
      ) || null
    : null;
  const targets =
    selected && !ended
      ? game
          .moves({ square: selected as Square, verbose: true })
          .map((m) => m.to)
      : [];
  const quietIdle = useQuietIdle(
    screen === "game",
    `${room?.code || "local"}:${sans.length}:${presence?.white}:${presence?.black}`,
    Boolean(message) || (Boolean(room) && connection !== "Live"),
  );
  const locked =
    busy ||
    Boolean(room?.clock_paused) ||
    ended ||
    Boolean(
      room && role !== "spectator" && roleGame !== (room.game_number || 1),
    ) ||
    (room
      ? connection !== "Live" || waiting || !me || turn !== me
      : turn !== humanColor);
  const canNudge = Boolean(
    room &&
      seatToken &&
      me &&
      role !== "spectator" &&
      room.status === "active" &&
      !room.clock_paused &&
      room.black_joined &&
      room.turn !== me,
  );
  useEffect(() => {
    remember("qk-sound", String(sound));
    remember("qk-haptics", String(haptics));
    remember("qk-volume", String(volume));
  }, [sound, haptics, volume]);
  useEffect(() => { remember("qk-unquiet-mode-v1", String(unquiet)); }, [unquiet]);
  useEffect(() => () => { if (animalReactionTimer.current !== null) window.clearTimeout(animalReactionTimer.current); }, []);
  const reactToAnimalMove = useCallback((made: { piece: string; captured?: string; promotion?: string; san: string }, after: Chess) => {
    if (!unquiet || table.pieceSet !== "animal-kingdom") return;
    const now = Date.now();
    if (now - lastAnimalReaction.current < 35_000) return;
    const line = animalReactionForMove(made, after.isCheck());
    if (!line) return;
    lastAnimalReaction.current = now;
    setAnimalReaction(line);
    if (animalReactionTimer.current !== null) window.clearTimeout(animalReactionTimer.current);
    animalReactionTimer.current = window.setTimeout(() => setAnimalReaction(""), 3600);
  }, [table.pieceSet, unquiet]);
  useEffect(() => {
    setSelected(null);
    setPromotion(null);setPendingMove(null);
  }, [room?.code, room?.version]);
  useEffect(() => {
    // Account restoration clears the previous room view. Join only after that
    // reset has completed, so a fast invite response cannot be discarded.
    if (gameOwner !== accountId || resumeStarted.current) return;
    resumeStarted.current = true;
    const code = new URL(window.location.href).searchParams.get("room");
    if (code) {
      const normalized = code
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);
      setJoinCode(normalized);
      void joinRoom(normalized, stored(`qk-seat-${normalized}`));
    }
  }, [accountId, gameOwner]);
  const previousMove = useRef<{ key: string; count: number } | null>(null);
  const gameKey = room
    ? `room-${room.code}-${room.game_number || 1}`
    : `local-${humanColor}`;
  useEffect(() => {
    const previous = previousMove.current;
    const count = sans.length;
    previousMove.current = { key: gameKey, count };
    if (previous?.key !== gameKey || count !== previous.count + 1 || !last) {
      setMotion(null);
      return;
    }
    setMotion({
      from: last.from,
      to: last.to,
      san: sans[count - 1] || "",
      serial: Date.now(),
    });
    if (preferences.current.haptics && "vibrate" in navigator)
      navigator.vibrate(18);
    if (preferences.current.sound)
      void chessAudio.play(
        Boolean(history?.[count - 1]?.captured),
        Boolean(check),
        false,
        history?.[count - 1]?.color === me,
      );
  }, [gameKey, sans.length]);
  useEffect(() => {
    if (knight.player && room?.score_event?.id) void knight.refresh();
  }, [room?.score_event?.id, knight.player?.id, knight.refresh]);
  const arrival = useRef<{ key: string; present: boolean; at: number } | null>(
    null,
  );
  useEffect(() => {
    if (!room || !me || !presence) return;
    const key = room.code + ":" + (room.game_number || 1);
    const present = presence[me === "w" ? "black" : "white"];
    const old = arrival.current;
    const now = Date.now();
    if (old?.key === key && !old.present && present && now - old.at > 30000) {
      void chessAudio.knock();
      if (preferences.current.haptics && "vibrate" in navigator)
        navigator.vibrate(10);
      arrival.current = { key, present, at: now };
    } else
      arrival.current = { key, present, at: old?.key === key ? old.at : 0 };
  }, [room?.code, room?.game_number, me, presence, chessAudio.knock]);
  const computerEngine = useComputerOpponent(
    screen === "game" &&
      mode === "local" &&
      !enginePaused &&
      !localGame.isGameOver() &&
      localGame.turn() !== humanColor,
    localMoves,
    level,
    setLocalMoves,
    setMessage,
    {style:prefs.style,think:prefs.think},
  );
  useEffect(() => {
    if (!knight.player || gameOwner !== accountId || room || mode !== "local" || !localGame.isGameOver()) return;
    const key = `${knight.player.id}:${localTableId}`;
    if (savedComputerGames.current.has(key)) return;
    savedComputerGames.current.add(key);
    void knight.recordComputer({
      client_game_id: localTableId,
      moves: localMoves.map(({ from, to, promotion }) => ({ from, to, promotion })),
      human_color: humanColor,
      level,
    }).then(ok => { if (!ok) savedComputerGames.current.delete(key); });
  }, [knight.player?.id, knight.recordComputer, gameOwner, accountId, room, mode, localGame, localTableId, localMoves, humanColor, level, onlineRetry]);
  const record: GameRecord = {
    id: room ? room.code + ":" + (room.game_number || 1) : localTableId,
    white:
      room?.white_player?.handle ||
      (room ? "White" : humanColor === "w" ? "You" : computerEngine),
    black:
      room?.black_player?.handle ||
      (room ? "Black" : humanColor === "b" ? "You" : computerEngine),
    result: ended
      ? room?.winner === "w"
        ? "1-0"
        : room?.winner === "b"
          ? "0-1"
          : game.isCheckmate()
            ? turn === "w"
              ? "0-1"
              : "1-0"
            : "1/2-1/2"
      : "*",
    fen: game.fen(),
    sans,
    date: new Date(room?.created_at || Date.now()).toISOString(),
    mode: room ? "human" : "computer",
    timeControl:room?.time_control?"600+0":"-",
    points: room?.score_event?.scored
      ? `${room.white_player?.handle || "White"} +${room.score_event.white_points} · ${room.black_player?.handle || "Black"} +${room.score_event.black_points} Quiet Points`
      : room
        ? "Casual game · No Quiet Points"
        : undefined,
  };
  useEffect(() => {
    if (ended && gameOwner === accountId && (mode === "local" || role !== "spectator")) {
      rememberTable(record, accountId);
      setMemories(recentTables(accountId));
    }
  }, [ended, record.id, room?.score_event?.id, accountId, gameOwner]);
  const dialogOpen = Boolean(modal || promotion);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (dialogOpen && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!dialogOpen && dialog.open) dialog.close();
  }, [dialogOpen, gameOwner]);
  function closeModal() {
    setModal(null);
    setPromotion(null);
  }
  function enableSound() {
    setSound(true);
    void chessAudio.test();
  }
  function beginRequest() {
    if (requestLock.current) return false;
    requestLock.current = true;
    setBusy(true);
    setMessage("");
    return true;
  }
  function endRequest() {
    requestLock.current = false;
    setBusy(false);
  }
  function useRoom(next: RoomState, token: string | null, nextRole: Role) {
    setMessage("");
    roomCodeRef.current = next.code;
    setRoom(next);
    setRole(nextRole);
    setRoleGame(next.game_number || 1);
    setPresence(null);
    setSeatToken(token);
    setMotion(null);
    if (token && !remember(`qk-seat-${next.code}`, token))
      setMessage("This browser cannot save your seat. Keep this tab open.");
    rememberLiveRoom(next.code, nextRole || "", token);
    if (nextRole === "spectator") forgetLiveRoom(next.code);
    setResumeLive(lastLiveRoom());
    setMode("online");
    setScreen("game");
    setSelected(null);
    const url = new URL(window.location.href);
    url.searchParams.set("room", next.code);
    window.history.replaceState({}, "", url);
  }
  async function createRoom() {
    if(compatibility.state!=="compatible"){setMessage(compatibility.message);return;}
    if (!navigator.onLine) {
      setMessage(
        "Connect to the internet to create a shared room. Computer play is available offline after loading.",
      );
      return;
    }
    if (!beginRequest()) return;
    try {
      const { data } = await api.post("/api/rooms",{nickname:prefs.nickname,side:friendSide,kind:friendKind,variant:"standard",require_untimed:true});
      useRoom(data.room as RoomState, data.seat_token as string, data.role as Role);
    } catch (err) {
      setMessage(
        failureText(err, "Could not create a room. Please try again."),
      );
    } finally {
      endRequest();
    }
  }
  async function joinRoom(input = joinCode, savedToken: string | null = null) {
    const code = input
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    if (code.length !== 6) {
      setMessage("Enter the six-character room code.");
      return;
    }
    if (!navigator.onLine) {
      setMessage(
        "Connect to the internet to join this room. Your room code is kept.",
      );
      return;
    }
    if (!beginRequest()) return;
    setMessage(`Joining room ${code}…`);
    try {
      const token = savedToken || stored(`qk-seat-${code}`);
      const join_key = joinRequestKey(code);
      const join = () =>
        api.post(`/api/rooms/${code}/join`, {
          ...(token ? { seat_token: token } : {}),
          join_key, nickname:prefs.nickname,
        });
      let result;
      try {
        result = await join();
      } catch (error) {
        if (
          (error as { response?: { status: number } })?.response?.status !== 409
        )
          throw error;
        result = await join();
      }
      const { data } = result;
      useRoom(
        data.room as RoomState,
        (data.seat_token as string | null) || null,
        data.role as Role,
      );
    } catch (err) {
      if (
        (err as { response?: { status?: number } })?.response?.status === 404
      ) {
        forgetLiveRoom(code);
        setResumeLive(lastLiveRoom());
        setMessage(
          "This room has expired or could not be found. You can start a new live game.",
        );
        return;
      }
      setMessage(
        err instanceof RequestTimeout
          ? "Joining timed out after 15 seconds. Press Join again: the saved seat request will be reused."
          : failureText(
              err,
              "Could not join this room. Check the code and connection, then press Join to retry.",
            ),
      );
    } finally {
      endRequest();
    }
  }
  function newLocalTable() {
    const id = crypto.randomUUID();
    setLocalTableId(id);
    remember(localGameIdKey(accountId), id);
  }
  function startComputer(color: Color) {
    const adjusted=localGame.isGameOver()?adaptiveLevel(level,localGame.isCheckmate()?(localGame.turn()!==humanColor?'win':'loss'):'draw',prefs.adaptive):level;
    if(adjusted!==level)setLevel(adjusted);
    newLocalTable();
    setEnginePaused(false);setRedoMoves([]);setFlipped(false);
    requestGeneration.current++;
    roomCodeRef.current = null;
    setRoom(null);
    setRole(null);
    setSeatToken(null);
    setLocalMoves([]);
    setHumanColor(color);
    setMode("local");
    setScreen("game");
    setSelected(null);
    setMotion(null);
    setMessage("");
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url);
  }
  async function sendOnlineMove(
    from: string,
    to: string,
    promotionPiece: string,
  ) {
    if (!room || !seatToken || !beginRequest()) return;
    const generation = requestGeneration.current;
    try {
      const { data } = await api.post(`/api/rooms/${room.code}/move`, {
        seat_token: seatToken,
        from,
        to,
        promotion: promotionPiece,
        expected_fen: room.fen, expected_version:room.version, game_number:room.game_number||1, request_id:crypto.randomUUID(),
        connection_id: connectionId || undefined,
      });
      if (generation === requestGeneration.current) {
        try {
          const next = new Chess(room.fen);
          const made = next.move({ from, to, promotion: promotionPiece });
          next.load((data.room as RoomState).fen);
          reactToAnimalMove(made, next);
        } catch { /* A server-confirmed move remains authoritative if presentation cannot classify it. */ }
        acceptRoom(data.room as RoomState);
      }
    } catch (err) {
      setMessage(
        failureText(
          err,
          "Move not accepted. The shared position may have changed.",
        ),
      );
      if (!limited(err)) {
        try {
          const { data } = await api.get(`/api/rooms/${room.code}`);
          acceptRoom(data.room as RoomState);
        } catch (readErr) {
          setMessage(
            failureText(
              readErr,
              "Could not refresh the shared position. Your move was not confirmed.",
            ),
          );
        }
      }
    } finally {
      endRequest();
    }
  }
  function proposeMove(from:string,to:string,promotionPiece="q"){closeModal();if(prefs.confirm)setPendingMove({from,to,promotion:promotionPiece});else performMove(from,to,promotionPiece);}
  function performMove(from: string, to: string, promotionPiece = "q") {
    closeModal();
    setPendingMove(null);setEnginePaused(false);setRedoMoves([]);
    setSelected(null);
    setMessage("");
    if (mode === "online") {
      void sendOnlineMove(from, to, promotionPiece);
      return;
    }
    try {
      const next = buildGame(localMoves);
      const made = next.move({ from, to, promotion: promotionPiece });
      reactToAnimalMove(made, next);
      setLocalMoves((prev) => [
        ...prev,
        {
          from: made.from,
          to: made.to,
          promotion: made.promotion,
          san: made.san,
        },
      ]);
    } catch {
      setMessage("That move is not legal.");
    }
  }
  function onSquare(square: string) {
    if (locked) return;
    const piece = game.get(square as Square);
    if (piece && piece.color === me) {
      if (preferences.current.haptics && "vibrate" in navigator)
        navigator.vibrate(7);
      setSelected((previous) => (previous === square ? null : square));
      return;
    }
    if (!selected) return;
    const legal = game
      .moves({ square: selected as Square, verbose: true })
      .filter((m) => m.to === square);
    if (!legal.length) {
      setSelected(null);
      return;
    }
    if (legal.some((m) => m.promotion)) {
      setPromotion({ from: selected, to: square });
      return;
    }
    proposeMove(selected, square);
  }
  async function copyDiagnostics() {
    if (diagnosing) return;
    setDiagnosing(true);
    try {
      const report = await diagnosticReport({
        player: knight.player,
        computerEngine,
        build: BUILD,
        mode: screen === "home" ? "Home" : mode,
        room: room
          ? {
              code: room.code,
              version: room.version,
              game_number: room.game_number || 1,
              score_event: room.score_event?.id,
            }
          : null,
        presence,
        offlineStatus,
        realtime: getDiagnostics,
        push: notifications.diagnostics,
      });
      setDiagnostics(report);
      try {
        await navigator.clipboard.writeText(report);
        setMessage("Diagnostics copied. You can paste them into ChatGPT.");
      } catch {
        setMessage("Select and copy the diagnostic report below.");
      }
    } finally {
      setDiagnosing(false);
    }
  }
  async function nativeShare() {
    if (!room) return;
    const result = await shareInvite(room.code, roomLink(room.code));
    if (result === "copy") await copyInvite();
  }
  async function copyInvite() {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(roomLink(room.code));
      setMessage("Invite copied. Send it to your friend.");
    } catch {
      setModal("invite");
    }
  }
  async function consent(action:string,kind?:string){
    if(!room||!seatToken||!beginRequest())return;
    try{const{data}=await api.post(`/api/rooms/${room.code}/consent`,{seat_token:seatToken,game_number:room.game_number||1,expected_version:room.version,action,kind,proposal_id:room.proposal?.id});acceptRoom(data.room as RoomState);}
    catch{setMessage("The proposal changed or is unavailable. Reconnect and try again.");}finally{endRequest();}
  }
  async function reaction(kind:string){if(!prefs.reactions||!room||!seatToken||!beginRequest())return;try{const{data}=await api.post(`/api/rooms/${room.code}/reaction`,{seat_token:seatToken,game_number:room.game_number||1,kind});acceptRoom(data.room as RoomState);}catch{setMessage("Reaction unavailable. Give the table a quiet moment.");}finally{endRequest();}}
  async function nudge() {
    if (!room || !seatToken || !canNudge || !beginRequest()) return;
    try {
      const { data } = await api.post(`/api/rooms/${room.code}/nudge`, {
        seat_token: seatToken,
        request_id: crypto.randomUUID(),
      });
      setMessage(data?.delivered && data?.delivery === 'table' ? 'Delivered at table.' : data?.delivered && data?.delivery === 'push' ? 'Notification sent.' : data?.message || 'Notifications unavailable.');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      setMessage(
        status === 429
          ? "Give them a minute."
          : failureText(err, "The nudge could not be sent."),
      );
    } finally {
      endRequest();
    }
  }
  async function changePause(action: PauseAction) {
    if (!room || !seatToken || !beginRequest()) return;
    const generation = requestGeneration.current;
    try {
      const { data } = await api.post(`/api/rooms/${room.code}/pause`, {
        action, seat_token: seatToken, game_number: room.game_number || 1,
        expected_version: room.version, request_id: room.pause_request?.id,
        pause_id: room.pause_id,
      });
      if (generation === requestGeneration.current) acceptRoom(data.room as RoomState);
    } catch (error) {
      setMessage(failureText(error, 'The pause could not be changed. Please try again.'));
      try {
        const { data } = await api.get(`/api/rooms/${room.code}`);
        if (generation === requestGeneration.current) acceptRoom(data.room as RoomState);
      } catch { /* Realtime recovery remains available. */ }
    } finally { endRequest(); }
  }
  async function resign() {
    if (!room || !seatToken || room.status !== "active" || !beginRequest())
      return;
    closeModal();
    try {
      const { data } = await api.post(`/api/rooms/${room.code}/resign`, {
        seat_token: seatToken,
        connection_id: connectionId || undefined,
      });
      acceptRoom(data.room as RoomState);
    } catch (err) {
      setMessage(
        failureText(
          err,
          "Could not confirm resignation. The game has not been changed here.",
        ),
      );
    } finally {
      endRequest();
    }
  }
  async function rematch(colors: "same" | "swap" = "same",action="request") {
    closeModal();
    setSelected(null);
    setMotion(null);
    if (mode === "local") {
      newLocalTable();
      setLocalMoves([]);
      return;
    }
    if (!room || !seatToken || !beginRequest()) return;
    try {
      const { data } = await api.post(`/api/rooms/${room.code}/rematch`, {
        colors, action, proposal_id:room.rematch_proposal?.id,
        game_number: room.game_number || 1,
        seat_token: seatToken,
        connection_id: connectionId || undefined,
      });
      acceptRoom(data.room as RoomState);
    } catch (err) {
      setMessage(
        failureText(err, "Could not start the rematch. Please try again."),
      );
    } finally {
      endRequest();
    }
  }
  function leaveGame() {
    requestGeneration.current++;
    closeModal();
    roomCodeRef.current = null;
    setScreen("home");
    setRoom(null);
    setRole(null);
    setSeatToken(null);
    setSelected(null);
    setMotion(null);
    setMessage("");
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url);
  }
  const status = waiting
    ? "Waiting for a friend"
    : room?.clock_paused
      ? "Game paused"
    : room?.status === "timeout"
      ? `${room.winner === "w" ? "White" : "Black"} wins on time`
    : room?.status === "resigned"
      ? `${room.winner === "w" ? "White" : "Black"} wins`
      : game.isCheckmate()
        ? `${turn === "w" ? "Black" : "White"} wins`
        : ended
          ? "Drawn game"
          : check
            ? me === turn
              ? "You are in check"
              : "Check"
            : me === turn
              ? "Your move"
              : !me
                ? `${turn === "w" ? "White" : "Black"} to move`
                : room
                  ? "Opponent’s move"
                  : "Computer thinking";
  const hint = waiting
    ? "Copy the invite to bring your opponent in."
    : room?.status === "timeout_draw"
      ? "Time expired · opponent has insufficient mating material."
    : room?.status === "timeout"
      ? "Game ended on time."
    : room?.status === "resigned"
      ? "Game ended by resignation."
      : game.isCheckmate()
        ? "Checkmate. Well played."
        : ended
          ? "The game has finished."
          : check
            ? "The king must get out of check."
            : me === turn
              ? selected
                ? "Choose a highlighted destination."
                : "Choose a piece to move."
              : !me
                ? "You are watching the shared table."
                : room
                  ? "The other player is choosing a move."
                  : `${computerEngine} · Level ${level} is choosing a move.`;
  function openStudy(seed?:StudySeed){setStudySeed(seed);setModal(null);setTableControls(false);setScreen("study");}
  const tableSettings = (
    <>
      <PlaySettings prefs={prefs} update={updatePrefs}/>
      <About compatibility={compatibility}/>
      <p className="server-compatibility">{compatibility.message}</p>
      <button
        type="button"
        className="secondary wide"
        onClick={() => {
          void knight.refresh();
          setModal("identity");
        }}
      >
        Knight ID{knight.player ? ` · ${knight.player.handle}` : ""}
      </button>
      <section className="notification-setting" aria-label="Move notifications">
        <div>
          <strong>Move notifications</strong>
          <span>
            {notifications.state === "on"
              ? "On"
              : notifications.state === "unsupported"
                ? "Unsupported"
                : notifications.state === "blocked"
                  ? "Permission blocked"
                  : "Off"}
          </span>
        </div>
        <p>
          Enable move alerts where this browser supports notifications. Playing
          and live nudges work without installation or notification permission.
        </p>
        {notifications.iosInstallRequired ? (
          <small>
            On iPhone and iPad, install Quiet Knight to your Home Screen first.
          </small>
        ) : null}
        {notifications.detail ? (
          <small role="status">{notifications.detail}</small>
        ) : null}
        {notifications.state === "on" ? (
          <button
            type="button"
            className="secondary wide"
            onClick={() => void notifications.disable()}
          >
            Turn off move notifications
          </button>
        ) : (
          <button
            type="button"
            className="secondary wide"
            disabled={
              !room ||
              !seatToken ||
              notifications.state === "working" ||
              notifications.state === "unsupported" ||
              notifications.state === "blocked"
            }
            onClick={() => void notifications.enable()}
          >
            {notifications.state === "working"
              ? "Enabling…"
              : "Enable move notifications"}
          </button>
        )}
      </section>
      <label className="preference-row">
        <span>Zen Table</span>
        <input
          type="checkbox"
          checked={table.zen}
          onChange={(e) => {
            table.setZen(e.target.checked);
            setTableControls(false);
          }}
        />
      </label>
      <button type="button" className="secondary wide" onClick={() => {table.applyReferenceTable();updatePrefs({quiet:false});setMessage("Wood table and carved pieces restored.");}}>Use pictured wood table</button>
      <label className="preference-row">
        <span>Board style</span>
        <select
          aria-label="Table atmosphere"
          value={table.atmosphere}
          onChange={(e) => table.setAtmosphere(e.target.value as Atmosphere)}
        >
          {atmospheres.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <label className="preference-row">
        <span>Chess pieces</span>
        <select aria-label="Chess piece set" value={table.pieceSet} onChange={(e) => table.setPieceSet(e.target.value as "classic" | "kawaii-faces" | "animal-kingdom")}>
          <option value="classic">Classic / Staunton</option>
          <option value="kawaii-faces">Kawaii Faces</option>
          <option value="animal-kingdom">Animal Kingdom</option>
        </select>
      </label>
      <label className="preference-row">
        <span>Unquiet Mode</span>
        <input type="checkbox" checked={unquiet} onChange={(e) => setUnquiet(e.target.checked)} />
      </label>
      <label className="preference-row">
        <span>Move sounds</span>
        <input
          type="checkbox"
          checked={sound}
          onChange={(e) => {
            if (e.target.checked) enableSound();
            else setSound(false);
          }}
        />
      </label>
      <div className="audio-controls">
        <label htmlFor="qk-volume">
          Sound volume <strong>{volume}%</strong>
        </label>
        <input
          id="qk-volume"
          aria-label="Sound volume"
          type="range"
          min="20"
          max="100"
          step="5"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
        <button type="button" className="secondary" onClick={enableSound}>
          Test sound
        </button>
        <p role="status">{chessAudio.status}</p>
        <small>
          If silent, raise your phone’s media volume and check whether this site
          is muted.
        </small>
      </div>
      <label className="preference-row">
        <span>Haptic feedback</span>
        <input
          type="checkbox"
          checked={haptics}
          onChange={(e) => setHaptics(e.target.checked)}
        />
      </label>
      <p className="settings-note">
        Tap a piece, then its destination. Arrow keys move focus; Enter selects.
        Motion follows your device’s reduced-motion preference.
      </p>
      <p className="settings-note">
        Computer play uses bundled Stockfish 18 Lite WebAssembly, with ten strength levels.
        If it cannot load, the lighter local engine is explicitly identified; the active engine is shown
        at the table. Games and seats are saved on this device when storage is
        available.
      </p>
      {room ? (
        <div className="connection-details">
          <p>
            {connection}: {detail || "Connecting to the shared game."}
          </p>
          <button type="button" className="secondary" onClick={reconnect}>
            Reconnect now
          </button>
        </div>
      ) : null}
      <div className="diagnostic-controls">
        <button
          type="button"
          className="secondary"
          disabled={diagnosing}
          onClick={() => void copyDiagnostics()}
        >
          {diagnosing ? "Preparing diagnostics…" : "Copy diagnostics"}
        </button>
        {diagnostics ? (
          <textarea
            aria-label="Diagnostic report"
            readOnly
            rows={10}
            value={diagnostics}
            onFocus={(e) => e.target.select()}
            style={{ width: "100%", marginTop: 12, fontSize: 12 }}
          />
        ) : null}
      </div>
      <p className="settings-note">
        Computer: {computerEngine}.{" "}
        <a href="https://stockfishchess.org/" target="_blank" rel="noreferrer">
          Stockfish
        </a>{" "}
        by the Stockfish developers · GPLv3 ·{" "}
        <a
          href="https://github.com/official-stockfish/Stockfish/tree/sf_18"
          target="_blank"
          rel="noreferrer"
        >
          Source
        </a>
        .
      </p>
      <span className="build-label">
        {BUILD}
        <br />
        {offlineStatus}
        <br />
        Shared matches require internet.
      </span>
    </>
  );
  const modalTitle = promotion
    ? "Promote your pawn"
    : modal === "memory"
      ? "The final position"
      : modal === "rematch"
        ? "Another game?"
        : modal === "identity"
          ? "Knight ID"
          : modal === "settings"
            ? "At your table"
            : modal === "leave"
              ? "Leave this game?"
              : modal === "restart"
                ? "Start a new game?"
                : modal === "resign"
                  ? "Resign this game?"
                  : "Your invite";
  if (gameOwner !== accountId) return <main className="account-gate"><section className="account-card" role="status"><p className="account-kicker">QUIET KNIGHT</p><h1>Loading your account</h1><p className="account-intro">Preparing your saved games.</p></section></main>;
  return (
    <>
      {screen === "study" ? <StudyRoom key={accountId} owner={accountId} prefs={prefs} seed={studySeed} onBack={()=>setScreen(room?"game":"home")}/> : null}

      {screen === "home" && localMoves.length > 0 ? (
        <div className="resume-local">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => {
              roomCodeRef.current = null;
              setRoom(null);
              setRole(null);
              setSeatToken(null);
              setMode("local");
              setScreen("game");
              setSelected(null);
              setMessage("");
              const url = new URL(window.location.href);
              url.search = "";
              window.history.replaceState({}, "", url);
            }}
          >
            Resume saved computer game
          </button>
        </div>
      ) : null}
      {screen === "home" ? (
        <HomeSurface
          extras={<section className="studio-entry"><h2>Continue the position</h2><button className="secondary" onClick={()=>openStudy(localMoves.length?{sans:localMoves.map(m=>m.san||"")}:undefined)}>Continue the position · analyse</button><button className="secondary" onClick={()=>openStudy({mode:"pass"})}>Pass and play · offline</button><button className="secondary" onClick={()=>openStudy()}>Study, puzzles & Chess960</button><p role="status" className="server-compatibility">{compatibility.message}</p><details className="friend-setup"><summary>Friend options & invite link</summary><label>Friend-game side<select aria-label="Friend-game side" value={friendSide} onChange={e=>setFriendSide(e.target.value)}><option value="white">White</option><option value="black">Black</option></select></label><label>Friend-game style<select aria-label="Friend-game style" value={friendKind} onChange={e=>setFriendKind(e.target.value)}><option value="live">Live · untimed</option><option value="correspondence">Correspondence · no deadlines</option></select></label><label>Paste invite link<input aria-label="Paste invite link" value={inviteInput} maxLength={1000} onChange={e=>setInviteInput(e.target.value)}/></label><button className="secondary" onClick={()=>{const code=parseInvitation(inviteInput);if(code)void joinRoom(code);else setMessage("Paste a valid room link or six-character code.");}}>Open invitation</button></details></section>}
          identity={
            <>
              <button
                type="button"
                className="knight-chip"
                onClick={() => {
                  void knight.refresh();
                  setModal("identity");
                }}
              >
                {knight.player
                  ? `${knight.player.handle} · ${knight.player.quiet_points} Quiet Points`
                  : knight.profile
                    ? "Link this existing Knight ID"
                    : "Account (optional)"}
              </button>
              {!knight.player && memories[0] ? (
                <button
                  type="button"
                  className="last-table"
                  onClick={() => {
                    setViewedGame(memories[0]);
                    setModal("memory");
                  }}
                >
                  <span>Last game · {memories[0].result}</span>
                  <small>
                    {memories[0].white} vs {memories[0].black} ·{" "}
                    {Math.ceil(memories[0].sans.length / 2)} moves
                  </small>
                </button>
              ) : null}
            </>
          }
          level={level}
          joinCode={joinCode}
          busy={busy}
          onLevel={setLevel}
          onCode={setJoinCode}
          onCreate={() => void createRoom()}
          onJoin={() => void joinRoom()}
          onComputer={startComputer}
          resumeLive={resumeLive}
          onResumeLive={() => {
            if (resumeLive) void joinRoom(resumeLive);
          }}
          onSettings={() => setModal("settings")}
        />
      ) : screen === "game" ? (
        <GameSurface
          clock={room||undefined}
          pauseControls={room && room.status === 'active' ? <ClockControls state={room} me={me} busy={busy || connection !== 'Live'} onAction={(action) => void changePause(action)} /> : null}
          viewerLost={viewerLost(
            me,
            room
              ? room.winner
              : game.isCheckmate()
                ? turn === "w"
                  ? "b"
                  : "w"
                : null,
            ended,
            room ? room.black_joined : true,
          )}
          historyTools={<><GameExports key={record.id} record={record} /><button className="secondary" onClick={()=>openStudy({sans:[...sans]})}>Review / analyse game</button><button className="secondary" onClick={()=>setFlipped(v=>!v)}>Flip board</button>{!room?<div className="study-actions"><button disabled={!localMoves.length} onClick={()=>{setEnginePaused(true);const cut=localGame.turn()===humanColor?2:1;setRedoMoves(localMoves.slice(-cut));setLocalMoves(v=>v.slice(0,-cut));}}>Undo computer turn</button><button disabled={!redoMoves.length} onClick={()=>{setLocalMoves(v=>[...v,...redoMoves]);setRedoMoves([]);setEnginePaused(false);}}>Redo computer turn</button>{enginePaused?<button onClick={()=>setEnginePaused(false)}>Resume computer</button>:null}</div>:null}</>}
          postGame={
            ended ? <GamePostcard key={record.id} record={record} /> : null
          }
          zen={table.zen}
          tableSettings={tableSettings}
          controlsOpen={tableControls && !dialogOpen}
          onCloseControls={() => setTableControls(false)}
          onToggleControls={() => setTableControls((value) => !value)}
          idle={quietIdle.idle}
          presenceLabel={
            room?.black_joined && me
              ? connection !== "Live"
                ? "Presence unavailable"
                : presence
                  ? presence[me === "w" ? "black" : "white"]
                    ? "Opponent at the table"
                    : "Opponent stepped away"
                  : "Checking the table…"
              : undefined
          }
          canNudge={canNudge}
          onNudge={() => void nudge()}
          players={
            room ? { w: room.white_player||(room.white_nickname?{handle:room.white_nickname,quiet_points:0}:null), b:room.black_player||(room.black_nickname?{handle:room.black_nickname,quiet_points:0}:null) } : undefined
          }
          tableExtra={
            <>
            {room?<section className="room-lobby" aria-label="Game lobby"><p>Room {room.code} · {room.kind==='correspondence'?'Correspondence · no deadlines':'Live'} · {room.time_control?'Historical 10+0':'Untimed'} · Standard · {presence?.spectators??0} spectators</p><button className="secondary" onClick={()=>{setTableControls(false);setModal('invite');}}>Show invitation QR</button>{role!=='spectator'&&room.status==='active'?<><div className="study-actions"><button disabled={busy||Boolean(room.proposal)} onClick={()=>void consent('request','draw')}>Offer draw</button>{!room.time_control&&!room.points_policy?.eligible?<button disabled={busy||Boolean(room.proposal)||!room.moves.length} onClick={()=>void consent('request','takeback')}>Request takeback</button>:null}</div>{room.proposal?<div role="status"><p>{room.proposal.kind} requested by {room.proposal.by==='w'?'White':'Black'}</p>{room.proposal.by===me?<button onClick={()=>void consent('cancel')}>Cancel proposal</button>:<><button onClick={()=>void consent('accept')}>Accept proposal</button><button onClick={()=>void consent('decline')}>Decline proposal</button></>}</div>:null}{prefs.reactions?<div className="study-actions" aria-label="Quiet reactions">{['hello','well-played','thanks','fox','owl','tortoise'].map(kind=><button key={kind} aria-label={kind} title={kind} disabled={busy} onClick={()=>void reaction(kind)}>{REACTIONS[kind]}</button>)}</div>:null}</>:null}{prefs.reactions&&room.reaction&&Date.now()-room.reaction.at<15000?<p role="status">{room.reaction.by==='w'?'White':'Black'}: {REACTIONS[room.reaction.kind]||'•'}</p>:null}</section>:null}
            {room && (room.white_player || room.black_player) ? (
              <div className="quiet-score" aria-label="Quiet Points">
                {ended ? (
                  <>
                    {room.score_event ? (
                      <>
                        <strong>
                          {room.score_event.scored
                            ? "Quiet Points"
                            : "Casual game"}
                        </strong>
                        <p>
                          {room.score_event.scored
                            ? `${room.white_player?.handle || "White"} +${room.score_event.white_points} · ${room.black_player?.handle || "Black"} +${room.score_event.black_points}`
                            : "No Quiet Points awarded"}
                        </p>
                        {!room.score_event.scored ? (
                          <small>{room.score_event.reason}</small>
                        ) : null}
                      </>
                    ) : (
                      <p>Recording the result…</p>
                    )}
                  </>
                ) : (
                  <small>
                    {waiting
                      ? "Two Knight IDs make this a points game."
                      : room.points_policy?.eligible
                        ? "Quiet Points game"
                        : room.points_policy?.reason ||
                          "Waiting for your friend"}
                  </small>
                )}
                {ended &&
                room.white_player &&
                room.black_player &&
                room.white_player.id !== room.black_player.id ? (
                  <HeadToHead
                    white={room.white_player}
                    black={room.black_player}
                    gameNumber={room.game_number || 1}
                  />
                ) : null}
              </div>
            ) : null}
            </>
          }
          animalReaction={animalReaction}
          computerEngine={computerEngine}
          board={{
            position,
            orientation,
            selected,
            targets:prefs.hints?targets:[],
            last,
            check,
            motion:prefs.animate?motion:null,
            locked,
            onSquare, drag:prefs.drag,
            onMove:(from,to)=>{if(locked||game.get(from as Square)?.color!==me)return;const moves=game.moves({square:from as Square,verbose:true}).filter(m=>m.to===to);if(!moves.length)return;if(moves.some(m=>m.promotion))setPromotion({from,to});else proposeMove(from,to);},
          }}
          online={mode === "online"}
          code={room?.code}
          connection={connection}
          level={level}
          me={me}
          opponentJoined={Boolean(me==="b"?room?.white_joined:room?.black_joined)}
          turn={turn}
          ended={ended}
          waiting={waiting}
          spectator={role === "spectator"}
          status={status}
          hint={hint}
          losses={losses}
          sans={sans}
          busy={busy}
          onBack={() => setModal("leave")}
          onSettings={() => setModal("settings")}
          onNew={() => {
            if (room) setModal("rematch");
            else if (localMoves.length === 0) void rematch();
            else setModal("restart");
          }}
          onResign={() => setModal("resign")}
          onCopy={() => void copyInvite()}
          onShare={
            typeof navigator.share === "function"
              ? () => void nativeShare()
              : undefined
          }
          onReconnect={reconnect}
          sound={sound}
          onSound={() => {
            if (sound) setSound(false);
            else enableSound();
          }}
        />
      ) : null}
      {screen==='game'&&room?.rematch_proposal?<section className="rematch-consent" aria-label="Rematch request"><p>{room.rematch_proposal.by===me?'Your opponent is considering the rematch.':'Your opponent offers a rematch.'} {room.rematch_proposal.colors==='swap'?'Swap colors.':'Same colors.'}</p>{room.rematch_proposal.by===me?<button className="secondary" onClick={()=>void rematch('same','cancel')}>Cancel rematch request</button>:role!=='spectator'?<><button className="primary" onClick={()=>void rematch('same','accept')}>Accept rematch</button><button className="secondary" onClick={()=>void rematch('same','decline')}>Decline rematch</button></>:null}</section>:null}
      {pendingMove?<section className="move-confirmation" role="dialog" aria-label="Confirm move"><p>{pendingMove.from} → {pendingMove.to}</p><button onClick={()=>performMove(pendingMove.from,pendingMove.to,pendingMove.promotion)}>Confirm move</button><button onClick={()=>setPendingMove(null)}>Cancel move</button></section>:null}
      {screen === "home" ? (
        <p className="network-build">
          {BUILD}
          <br />
          {offlineStatus}
        </p>
      ) : null}
      <dialog
        ref={dialogRef}
        className="qk-dialog"
        aria-labelledby="qk-dialog-title"
        onCancel={(e) => {
          e.preventDefault();
          closeModal();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        {dialogOpen ? (
          <>
            <div className="dialog-head">
              <h2 id="qk-dialog-title">{modalTitle}</h2>
              <button
                className="icon-button"
                type="button"
                aria-label="Close dialog"
                onClick={closeModal}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="dialog-body">
              {promotion ? (
                <PromotionChoices
                  color={me || "w"}
                  onChoose={(kind) =>
                    proposeMove(promotion.from, promotion.to, kind)
                  }
                />
              ) : modal === "memory" && viewedGame ? (
                <FinalPosition record={viewedGame} />
              ) : modal === "rematch" ? (
                <>
                  <p>Same table, a fresh position.</p>
                  {room?.white_player && room?.black_player ? (
                    <p className="settings-note">
                      {room.score_event?.scored &&
                      room.points_policy?.remaining === 1
                        ? "Today’s points between you two are complete. Rematches are now casual."
                        : room.points_policy?.reason}
                    </p>
                  ) : null}
                  <div className="dialog-actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => void rematch("swap")}
                    >
                      Swap colors
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void rematch("same")}
                    >
                      Same colors
                    </button>
                  </div>
                </>
              ) : modal === "identity" && (!knight.player || knight.recoveryCode) ? (
                <AccountGate knight={knight} embedded onContinue={closeModal} />
              ) : modal === "identity" ? (
                <KnightIdPanel
                  knight={knight}
                  onView={(g) => {
                    setViewedGame({
                      id: g.id,
                      white: g.white_handle,
                      black: g.black_handle,
                      result: g.result as GameRecord["result"],
                      fen: g.final_fen,
                      sans: g.moves.map((m) => m.san),
                      date: g.ended_at,
                      mode: "human",
                      points: g.scored
                        ? "Quiet Points game"
                        : "Casual game · No Quiet Points",
                    });
                    setModal("memory");
                  }}
                />
              ) : modal === "settings" ? (
                tableSettings
              ) : modal === "invite" && room ? (
                <>
                  <InviteQR url={roomLink(room.code)} code={room.code}/><a href={`quietknight://join/${room.code}`}>Open in installed Quiet Knight</a>
                  <p>Copy this link and send it to your friend.</p>
                  <input
                    className="invite-field"
                    readOnly
                    aria-label="Invite URL"
                    value={roomLink(room.code)}
                    onFocus={(e) => e.target.select()}
                    data-autofocus
                  />
                </>
              ) : (
                <>
                  <p>
                    {modal === "leave"
                      ? room
                        ? "Your seat remains saved on this device. Use Resume live game on the menu to return; leaving does not resign."
                        : "Your computer position is saved on this device when browser storage is available. Use Resume saved computer game on the menu to return."
                      : modal === "restart"
                        ? "The current local position will be cleared. Your selected color and level stay the same."
                        : "Your opponent will win by resignation. This cannot be undone."}
                  </p>
                  <div className="dialog-actions">
                    <button
                      className="secondary"
                      type="button"
                      onClick={closeModal}
                      data-autofocus
                    >
                      Keep playing
                    </button>
                    <button
                      className={
                        modal === "resign" ? "danger-button" : "primary"
                      }
                      type="button"
                      onClick={() => {
                        if (modal === "leave") leaveGame();
                        else if (modal === "restart") void rematch();
                        else void resign();
                      }}
                    >
                      {modal === "leave"
                        ? "Leave table"
                        : modal === "restart"
                          ? "New game"
                          : "Confirm resign"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : null}
      </dialog>
      {message ? (
        <div className="qk-toast" role="status">
          <span>{message}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setMessage("")}
          >
            <Icon name="close" />
          </button>
        </div>
      ) : null}
    </>
  );
}
