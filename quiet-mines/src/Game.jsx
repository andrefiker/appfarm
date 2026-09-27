import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bomb,
  Flag,
  Lightbulb,
  RotateCcw,
  SlidersHorizontal,
  ChartNoAxesColumn,
  Volume2,
  VolumeX,
  Minus,
  Plus,
  Maximize2,
  Copy,
  CalendarDays,
  X,
  ChevronDown,
  Hand,
} from 'lucide-react';
import {
  applyReveal,
  chord,
  createClassicBoard,
  createFairBoard,
  dailySeed,
  DIFFICULTIES,
  hashSeed,
  logicalHints,
  remainingMines,
  toggleFlag,
  withFirstReveal,
} from './engine.js';
import './style.css';

const STORE = 'quiet-mines-v1';
const freshSettings = {
  sound: true,
  volume: 0.45,
  haptics: true,
  highContrast: false,
  reducedMotion: false,
  leftHanded: false,
  mode: 'FAIR BOARD',
};
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE) || '{}');
  } catch {
    return {};
  }
};
function saveData(value) {
  try {
    localStorage.setItem(STORE, JSON.stringify(value));
  } catch {
    /* storage can be unavailable in private mode */
  }
}
function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function sound(kind, settings) {
  if (!settings.sound) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx(),
      osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    const tones = {
      reveal: [440, 0.035],
      flag: [640, 0.07],
      unflag: [390, 0.06],
      chord: [520, 0.08],
      cascade: [690, 0.04],
      mine: [105, 0.28],
      win: [740, 0.18],
    };
    const [freq, duration] = tones[kind] || tones.reveal;
    osc.frequency.setValueAtTime(freq, now);
    if (kind === 'win')
      osc.frequency.exponentialRampToValueAtTime(1080, now + duration);
    if (kind === 'mine')
      osc.frequency.exponentialRampToValueAtTime(45, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(settings.volume * 0.11, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
    osc.onended = () => ctx.close();
  } catch {
    /* audio is optional */
  }
}
function buzz(settings, ms = 12) {
  if (settings.haptics && navigator.vibrate) navigator.vibrate(ms);
}
function formatSeed(s) {
  return (s >>> 0).toString(16).padStart(8, '0').toUpperCase();
}
function formatGameSeed(g) {
  const code = { Easy: 'E', Medium: 'M', Hard: 'H', Expert: 'X' }[
    g?.difficulty
  ];
  return g?.seed
    ? `${code}:${formatSeed(g.seed)}${Number.isInteger(g.firstIndex) ? `-${g.firstIndex.toString(16).toUpperCase()}` : ''}`
    : '—';
}

const SEGMENTS = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'], '1': ['b', 'c'],
  '2': ['a', 'b', 'g', 'e', 'd'], '3': ['a', 'b', 'g', 'c', 'd'],
  '4': ['f', 'g', 'b', 'c'], '5': ['a', 'f', 'g', 'c', 'd'],
  '6': ['a', 'f', 'g', 'e', 'c', 'd'], '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'], '9': ['a', 'b', 'c', 'd', 'f', 'g'], '-': ['g'],
};
function SegmentDisplay({ value, label }) {
  const numeric = Math.max(-99, Math.min(999, Number(value) || 0));
  const digits = numeric < 0
    ? `-${String(Math.abs(numeric)).padStart(2, '0')}`
    : String(numeric).padStart(3, '0');
  const shapes = [
    ['a', '3,1 15,1 13,4 5,4'], ['b', '15,2 17,4 16,13 13,14 13,5'],
    ['c', '16,16 17,17 15,28 13,26 13,17'], ['d', '5,26 13,26 15,29 3,29'],
    ['e', '2,17 5,17 5,26 3,28 1,26'], ['f', '3,2 5,5 5,14 2,13 1,4'],
    ['g', '5,14 13,14 15,15 13,17 5,17 3,15'],
  ];
  return <span className="segment-display" role="img" aria-label={`${label} ${value}`}>
    {digits.split('').map((digit, i) => <svg viewBox="0 0 18 30" aria-hidden="true" key={`${digit}-${i}`}>
      {shapes.map(([segment, points]) => <polygon key={segment} className={SEGMENTS[digit]?.includes(segment) ? 'lit' : ''} points={points} />)}
    </svg>)}
  </span>;
}
function ClassicFlag() {
  return <svg viewBox="0 0 20 20" aria-hidden="true" className="classic-flag">
    <path d="M5 16V3l11 3.5L5 11" fill="#f00" stroke="#a00" strokeWidth="1" />
    <path d="M5 3v13" stroke="#111" strokeWidth="2" />
    <path d="M2 17h9l-2 2H3z" fill="#111" />
  </svg>;
}
function ClassicFace({ state }) {
  return <svg viewBox="0 0 40 40" aria-hidden="true" className="classic-face-art">
    <circle cx="20" cy="20" r="17" fill="#ffeb00" stroke="#171717" strokeWidth="2" />
    {state === 'won' ? <g>
      <path d="M5 15Q7 12 10 13H18Q20 13 20 16V21Q20 24 17 24H10Q6 23 5 20Z" fill="#161616" />
      <path d="M20 16Q20 13 23 13H30Q34 13 35 16V20Q34 23 30 24H23Q20 24 20 21Z" fill="#161616" />
      <path d="M17 17H23" stroke="#161616" strokeWidth="3" />
      <path d="M10 28Q20 34 30 27" fill="none" stroke="#161616" strokeWidth="2.5" strokeLinecap="round" />
    </g> : state === 'lost' ? <g>
      <path d="m9 13 6 6m0-6-6 6m11-6 6 6m0-6-6 6" stroke="#171717" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 29Q20 24 28 29" fill="none" stroke="#171717" strokeWidth="2.4" strokeLinecap="round" />
    </g> : state === 'pressed' ? <g>
      <circle cx="13" cy="16" r="2.3" fill="#171717" /><circle cx="27" cy="16" r="2.3" fill="#171717" />
      <ellipse cx="20" cy="28" rx="3.2" ry="4" fill="#171717" />
    </g> : <g>
      <circle cx="13" cy="16" r="2.4" fill="#171717" /><circle cx="27" cy="16" r="2.4" fill="#171717" />
      <path d="M10 24Q20 34 30 24" fill="none" stroke="#171717" strokeWidth="2.3" strokeLinecap="round" />
    </g>}
  </svg>;
}

function App() {
  const stored = useMemo(load, []);
  const [settings, setSettings] = useState({
    ...freshSettings,
    ...stored.settings,
  });
  const [difficulty, setDifficulty] = useState(
    stored.active?.difficulty || 'Easy',
  );
  const [game, setGame] = useState(stored.active || null);
  const [elapsed, setElapsed] = useState(stored.active?.elapsed || 0);
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [flagMode, setFlagMode] = useState(false);
  const [panel, setPanel] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [pressedCell, setPressedCell] = useState(false);
  const [toast, setToast] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [seedEntry, setSeedEntry] = useState('');
  const [hintCell, setHintCell] = useState(null);
  const pointer = useRef(null),
    activePointers = useRef(new Map()),
    pinchStart = useRef(null),
    longTimer = useRef(null),
    suppressTap = useRef(false),
    startOffset = useRef({ x: 0, y: 0 }),
    moved = useRef(false),
    stage = useRef(null),
    saveTick = useRef(0);
  const today = new Date();
  const dailyKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [records, setRecords] = useState(stored.records || {});
  const [daily, setDaily] = useState(stored.daily || {});
  const isDone = game?.board?.won || game?.board?.lost;
  const isDaily = game?.kind === 'daily';
  const started = Boolean(game?.board);
  const cells = game?.board?.cells || [];
  const remaining = game?.board
    ? remainingMines(game.board)
    : DIFFICULTIES[difficulty].mines;
  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(''), 1800);
  };

  useEffect(() => {
    saveData({
      settings,
      active: game ? { ...game, elapsed } : null,
      records,
      daily,
    });
  }, [settings, game, elapsed, records, daily]);
  useEffect(() => {
    if (!game?.board || isDone || !isVisible) return;
    const id = window.setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [game?.board, isDone, isVisible]);
  useEffect(() => {
    const onVisibility = () => {
      setIsVisible(!document.hidden);
      if (document.hidden) {
        saveData({
          settings,
          active: game ? { ...game, elapsed } : null,
          records,
          daily,
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [settings, game, elapsed, records, daily]);
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD)
      navigator.serviceWorker.register('./sw.js').catch(() => {});
  }, []);
  useEffect(() => {
    document.body.classList.toggle('no-motion', settings.reducedMotion);
    document.body.classList.toggle('contrast', settings.highContrast);
  }, [settings]);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        createFresh(difficulty);
        setMenuOpen(false);
      }
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setPanel('');
      }
      if (
        [' ', 'ArrowUp', 'ArrowDown'].includes(e.key) &&
        e.target.closest('.board-stage')
      )
        e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function createFresh(
    selected = difficulty,
    kind = 'standard',
    chosenSeed = null,
    forcedIndex = null,
  ) {
    setDifficulty(selected);
    setElapsed(0);
    setHintCell(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setFlagMode(false);
    const seed =
      chosenSeed ??
      (kind === 'daily'
        ? dailySeed()
        : crypto.getRandomValues(new Uint32Array(1))[0]);
    const config = DIFFICULTIES[selected];
    let next = {
      difficulty: selected,
      kind,
      seed,
      firstIndex: null,
      board: null,
      retry: false,
      hints: 0,
      mode: kind === 'daily' ? 'FAIR BOARD' : settings.mode,
      createdAt: Date.now(),
    };
    if (kind === 'daily') {
      const center =
        Math.floor(config.rows / 2) * config.cols + Math.floor(config.cols / 2);
      const board = createFairBoard(
        config.rows,
        config.cols,
        config.mines,
        center,
        seed,
      );
      const first = applyReveal(board, center);
      next = { ...next, board: first.board, firstIndex: center };
      setElapsed(0);
      if (!daily[dailyKey]?.attempted)
        setDaily((d) => ({
          ...d,
          [dailyKey]: {
            ...(d[dailyKey] || {}),
            attempted: true,
            seed,
            attemptedAt: Date.now(),
          },
        }));
      showToast('Daily board ready · same board for everyone');
    }
    if (kind === 'seed') {
      const start =
        forcedIndex ??
        Math.floor(config.rows / 2) * config.cols + Math.floor(config.cols / 2);
      const board =
        next.mode === 'FAIR BOARD'
          ? createFairBoard(config.rows, config.cols, config.mines, start, seed)
          : createClassicBoard(
              config.rows,
              config.cols,
              config.mines,
              start,
              seed,
            );
      next = {
        ...next,
        board: applyReveal(board, start).board,
        firstIndex: start,
      };
    }
    setGame(next);
  }
  function finishIfNeeded(nextBoard, current) {
    if (nextBoard.won) {
      sound('win', settings);
      buzz(settings, 45);
      if (current.kind === 'daily') {
        setDaily((d) => {
          const prev = d[dailyKey] || {};
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
          return {
            ...d,
            [dailyKey]: {
              ...prev,
              attempted: true,
              completed: true,
              time: prev.completed ? Math.min(prev.time, elapsed) : elapsed,
              hints: prev.completed ? prev.hints : current.hints,
              completedAt: prev.completed ? prev.completedAt : Date.now(),
              streak: prev.completed
                ? prev.streak || 1
                : (d[yKey]?.completed ? d[yKey].streak || 1 : 0) + 1,
            },
          };
        });
      } else if (!current.retry) {
        setRecords((prev) => {
          const row = prev[current.difficulty] || {
            played: 0,
            wins: 0,
            totalWinTime: 0,
            best: null,
            streak: 0,
            bestStreak: 0,
          };
          const wins = row.wins + 1,
            streak = row.streak + 1;
          return {
            ...prev,
            [current.difficulty]: {
              ...row,
              played: row.played + 1,
              wins,
              totalWinTime: row.totalWinTime + elapsed,
              best: row.best == null ? elapsed : Math.min(row.best, elapsed),
              streak,
              bestStreak: Math.max(row.bestStreak, streak),
            },
          };
        });
      }
    }
    if (nextBoard.lost) {
      sound('mine', settings);
      buzz(settings, 70);
      if (current.kind === 'daily')
        setDaily((d) => {
          const prev = d[dailyKey] || {};
          return {
            ...d,
            [dailyKey]: {
              ...prev,
              attempted: true,
              completed: Boolean(prev.completed),
              time: prev.completed ? prev.time : elapsed,
              hints: prev.completed ? prev.hints : current.hints,
            },
          };
        });
      else if (!current.retry)
        setRecords((prev) => {
          const row = prev[current.difficulty] || {
            played: 0,
            wins: 0,
            streak: 0,
            bestStreak: 0,
          };
          return {
            ...prev,
            [current.difficulty]: { ...row, played: row.played + 1, streak: 0 },
          };
        });
    }
    if (nextBoard.won || nextBoard.lost)
      setGame({ ...current, board: nextBoard });
  }
  function actReveal(index) {
    if (!game || isDone) return;
    if (!game.board) {
      const config = DIFFICULTIES[game.difficulty];
      const board =
        game.mode === 'FAIR BOARD'
          ? createFairBoard(
              config.rows,
              config.cols,
              config.mines,
              index,
              game.seed,
            )
          : createClassicBoard(
              config.rows,
              config.cols,
              config.mines,
              index,
              game.seed,
            );
      const result = applyReveal(board, index);
      const nextGame = withFirstReveal(game, board, result, index);
      setGame(nextGame);
      sound('reveal', settings);
      buzz(settings);
      if (result.opened.length > 5) sound('cascade', settings);
      finishIfNeeded(result.board, nextGame);
      return;
    }
    const cell = game.board.cells[index];
    if (cell.revealed) {
      const result = chord(game.board, index);
      if (result.status !== 'ignored') {
        setGame({ ...game, board: result.board });
        sound(result.status === 'lost' ? 'mine' : 'chord', settings);
        buzz(settings, result.status === 'lost' ? 70 : 16);
        finishIfNeeded(result.board, game);
      }
      return;
    }
    const result = applyReveal(game.board, index);
    if (result.status === 'ignored') return;
    if (result.opened.length > 6) sound('cascade', settings);
    else sound('reveal', settings);
    buzz(settings);
    finishIfNeeded(result.board, game);
  }
  function actFlag(index) {
    if (!game || isDone) return;
    const before = game.board?.cells[index];
    if (!before || before.revealed) return;
    if (!game.board) {
      showToast('Reveal a cell to begin');
      return;
    }
    const flagged = !before.flagged;
    const board = toggleFlag(game.board, index);
    setGame({ ...game, board });
    sound(flagged ? 'flag' : 'unflag', settings);
    buzz(settings, 9);
  }
  function hint() {
    if (!game?.board || isDone) {
      showToast('Start a board first');
      return;
    }
    const hints = logicalHints(game.board),
      cell = hints.safe[0] ?? hints.mines[0];
    if (cell == null) {
      showToast('NO CERTAIN MOVE');
      setHintCell(null);
      return;
    }
    setHintCell({ index: cell, kind: hints.safe.length ? 'safe' : 'mine' });
    setGame({ ...game, hints: game.hints + 1 });
    showToast(hints.safe.length ? 'SAFE CELL' : 'CERTAIN MINE');
  }
  function retry() {
    if (!game) return;
    const config = DIFFICULTIES[game.difficulty],
      index =
        game.firstIndex ??
        Math.floor(config.rows / 2) * config.cols + Math.floor(config.cols / 2);
    const board =
      game.mode === 'FAIR BOARD'
        ? createFairBoard(
            config.rows,
            config.cols,
            config.mines,
            index,
            game.seed,
          )
        : createClassicBoard(
            config.rows,
            config.cols,
            config.mines,
            index,
            game.seed,
          );
    const result = applyReveal(board, index);
    setElapsed(0);
    setHintCell(null);
    setGame({
      ...game,
      board: result.board,
      firstIndex: index,
      retry: true,
      hints: 0,
      generationAttempts: board.attempts,
    });
    showToast('Same seed · clean records preserved');
  }
  function playSeed() {
    const parts = seedEntry
      .trim()
      .match(/^(?:([EMHX]):)?([0-9a-f]{1,8})(?:-([0-9a-f]{1,3}))?$/i);
    const seed = parts
      ? parseInt(parts[2], 16) >>> 0
      : hashSeed(seedEntry.trim());
    if (!seedEntry.trim()) return;
    const forced = parts?.[3] ? parseInt(parts[3], 16) : null;
    const selected =
      { E: 'Easy', M: 'Medium', H: 'Hard', X: 'Expert' }[
        parts?.[1]?.toUpperCase()
      ] || difficulty;
    createFresh(selected, 'seed', seed, forced);
    setPanel('');
    setSeedEntry('');
    showToast(`Seed ${formatSeed(seed)}`);
  }
  async function copySeed() {
    try {
      await navigator.clipboard.writeText(formatGameSeed(game));
      showToast('Seed copied');
    } catch {
      showToast(`Seed ${formatGameSeed(game)}`);
    }
  }
  function changeDifficulty(value) {
    setDifficulty(value);
    if (game?.board && !isDone) {
      setGame({
        difficulty: value,
        kind: 'standard',
        seed: crypto.getRandomValues(new Uint32Array(1))[0],
        board: null,
        retry: false,
        hints: 0,
        mode: settings.mode,
      });
      setElapsed(0);
    } else createFresh(value);
  }

  function down(e, i) {
    e.preventDefault();
    e.stopPropagation();
    if (!game || isDone) return;
    setPressedCell(true);
    pointer.current = {
      x: e.clientX,
      y: e.clientY,
      index: i,
      id: e.pointerId,
      button: e.button,
      time: Date.now(),
    };
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startOffset.current = offset;
    moved.current = false;
    suppressTap.current = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    if (activePointers.current.size > 1) {
      window.clearTimeout(longTimer.current);
      suppressTap.current = true;
      const pts = [...activePointers.current.values()];
      pinchStart.current = {
        distance: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y),
        zoom,
        offset,
        center: { x: (pts[1].x + pts[0].x) / 2, y: (pts[1].y + pts[0].y) / 2 },
      };
    }
    if (e.pointerType === 'mouse' && e.button === 2) {
      suppressTap.current = true;
      if (game.board?.cells[i]?.revealed) actReveal(i);
      else actFlag(i);
      return;
    }
    if (e.pointerType !== 'mouse')
      longTimer.current = window.setTimeout(() => {
        suppressTap.current = true;
        actFlag(i);
      }, 430);
  }
  function move(e) {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.current.size > 1 && pinchStart.current) {
      const pts = [...activePointers.current.values()],
        p = pinchStart.current,
        dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      setZoom(
        Math.max(
          0.65,
          Math.min(1.8, (p.zoom * dist) / Math.max(1, p.distance)),
        ),
      );
      moved.current = true;
      window.clearTimeout(longTimer.current);
      return;
    }
    if (!pointer.current || pointer.current.id !== e.pointerId) return;
    const dx = e.clientX - pointer.current.x,
      dy = e.clientY - pointer.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 8) {
      moved.current = true;
      window.clearTimeout(longTimer.current);
      setDragging(true);
      setOffset({
        x: startOffset.current.x + dx,
        y: startOffset.current.y + dy,
      });
    }
  }
  function up(e, i) {
    setPressedCell(false);
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) pinchStart.current = null;
    if (!pointer.current || pointer.current.id !== e.pointerId) return;
    window.clearTimeout(longTimer.current);
    const p = pointer.current;
    pointer.current = null;
    if (moved.current) {
      setTimeout(() => setDragging(false), 20);
      return;
    }
    if (suppressTap.current) return;
    if (flagMode) actFlag(i);
    else actReveal(i);
  }
  function stageDown(e) {
    if (e.target.closest('.cell')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointer.current = {
      x: e.clientX,
      y: e.clientY,
      id: e.pointerId,
      stage: true,
    };
    startOffset.current = offset;
    setDragging(false);
  }
  function stageMove(e) {
    const p = pointer.current;
    if (!p?.stage || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x,
      dy = e.clientY - p.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) {
      setDragging(true);
      setOffset({
        x: startOffset.current.x + dx,
        y: startOffset.current.y + dy,
      });
    }
  }
  function stageUp(e) {
    setPressedCell(false);
    if (pointer.current?.stage && pointer.current.id === e.pointerId) {
      pointer.current = null;
      setTimeout(() => setDragging(false), 20);
    }
  }
  function fitBoard() {
    const stageRect = stage.current?.getBoundingClientRect();
    const boardRect = stage.current
      ?.querySelector('.board')
      ?.getBoundingClientRect();
    if (!stageRect || !boardRect) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      return;
    }
    const unscaledWidth = boardRect.width / zoom;
    const unscaledHeight = boardRect.height / zoom;
    const fit = Math.min(
      1.8,
      (stageRect.width - 20) / unscaledWidth,
      (stageRect.height - 20) / unscaledHeight,
    );
    setZoom(Math.max(0.65, fit));
    setOffset({ x: 0, y: 0 });
  }

  const config = DIFFICULTIES[game?.difficulty || difficulty];
  const firstCells = game?.board ? game.board.cells : [];
  const misflags = game?.board?.lost
    ? firstCells
        .map((c, i) => (c.flagged && !c.mine ? i : -1))
        .filter((i) => i >= 0)
    : [];
  const rootClass = `app-shell${settings.leftHanded ? ' left-handed' : ''}`;
  return (
    <main className={rootClass}>
      <header className="topbar titlebar">
        <div className="brand">
          <span className="brand-mark">
            <Bomb size={18} strokeWidth={1.8} />
          </span>
          <span>Minesweeper</span>
        </div>
        <div className="top-actions">
          <button
            className="icon-button"
            aria-label="Statistics"
            onClick={() => setPanel('stats')}
          >
            <ChartNoAxesColumn size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Settings"
            onClick={() => setPanel('settings')}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </header>
      <nav className="menu-bar" aria-label="Game menu">
        <button aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>Game</button>
        <button onClick={() => { setMenuOpen(false); setPanel('help'); }}>Help</button>
        {menuOpen && <div className="menu-popover">
          <button onClick={() => { createFresh(difficulty); setMenuOpen(false); }}>New board <kbd>F2</kbd></button>
          <button onClick={() => { createFresh('Easy', 'daily'); setMenuOpen(false); }}>Daily board</button>
          <button onClick={() => { setMenuOpen(false); setPanel('stats'); }}>Statistics</button>
          <button onClick={() => { setMenuOpen(false); setPanel('settings'); }}>Settings</button>
        </div>}
      </nav>
      <section className="game-bar">
        <label className="difficulty-wrap">
          <span className="sr-only">Difficulty</span>
          <select
            value={game?.difficulty || difficulty}
            onChange={(e) => changeDifficulty(e.target.value)}
          >
            {Object.keys(DIFFICULTIES).map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
        <div className="mode-toggle" role="group" aria-label="Board mode">
          <button
            className={settings.mode === 'FAIR BOARD' ? 'selected' : ''}
            onClick={() => setSettings((s) => ({ ...s, mode: 'FAIR BOARD' }))}
          >
            Fair
          </button>
          <button
            className={settings.mode === 'CLASSIC RANDOM' ? 'selected' : ''}
            onClick={() =>
              setSettings((s) => ({ ...s, mode: 'CLASSIC RANDOM' }))
            }
          >
            Classic
          </button>
        </div>
        <button
          className={`daily-button${isDaily ? ' active' : ''}`}
          onClick={() => createFresh('Easy', 'daily')}
          aria-label="Daily board"
        >
          <CalendarDays size={15} />
          <span>Daily</span>
        </button>
      </section>
      <section className="readouts">
        <div className="readout mines-readout">
          <SegmentDisplay value={Math.max(-99, Math.min(999, remaining))} label="Mines remaining" />
        </div>
        <button
          className={`face-button ${game?.board?.lost ? 'sad' : game?.board?.won ? 'happy' : pressedCell ? 'pressed' : ''}`}
          aria-label="New board"
          onClick={() => createFresh(difficulty)}
        >
          <ClassicFace state={game?.board?.lost ? 'lost' : game?.board?.won ? 'won' : pressedCell ? 'pressed' : 'ready'} />
        </button>
        <div className="readout time-readout">
          <SegmentDisplay value={Math.min(999, elapsed)} label="Elapsed time in seconds" />
        </div>
      </section>
      <section className="board-toolbar">
        <span className="board-caption">
          {isDaily
            ? 'DAILY BOARD'
            : started
              ? `${game.difficulty.toUpperCase()} · ${game.mode || settings.mode}`
              : `${(game?.difficulty || difficulty).toUpperCase()} · ${settings.mode}`}
        </span>
        <div className="board-actions">
          <button
            className={`tool-button ${flagMode ? 'active' : ''}`}
            onClick={() => setFlagMode((v) => !v)}
            aria-pressed={flagMode}
          >
            <Flag size={15} />
            <span>{flagMode ? 'Flag on' : 'Flag'}</span>
          </button>
          <button className="tool-button" onClick={hint}>
            <Lightbulb size={15} />
            <span>Hint</span>
          </button>
          <button
            className="mini-icon"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.65, z - 0.1))}
          >
            <Minus size={15} />
          </button>
          <button
            className="mini-icon"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}
          >
            <Plus size={15} />
          </button>
          <button
            className="mini-icon"
            aria-label="Fit board"
            onClick={fitBoard}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </section>
      <div
        className={`board-stage ${dragging ? 'dragging' : ''}`}
        ref={stage}
        onPointerDown={stageDown}
        onPointerMove={stageMove}
        onPointerUp={stageUp}
        onPointerCancel={stageUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className={`board ${game?.difficulty === 'Easy' || difficulty === 'Easy' ? 'easy' : ''} ${game?.difficulty === 'Medium' || difficulty === 'Medium' ? 'medium' : ''} ${game?.difficulty === 'Hard' || difficulty === 'Hard' ? 'hard' : ''} ${game?.difficulty === 'Expert' || difficulty === 'Expert' ? 'expert' : ''} ${config.cols > 14 ? 'wide' : ''}`}
          style={{
            '--cols': config.cols,
            '--rows': config.rows,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          }}
          role="grid"
          aria-label={`${game?.difficulty || difficulty} Minesweeper board`}
        >
          {Array.from({ length: config.rows * config.cols }, (_, i) => {
            const cell = firstCells[i],
              revealed = cell?.revealed,
              flagged = cell?.flagged,
              hint = hintCell?.index === i;
            const wrongFlag = misflags.includes(i),
              triggered = game?.board?.triggered === i;
            let className = 'cell';
            if (revealed) className += ' revealed';
            if (flagged) className += ' flagged';
            if (triggered) className += ' detonated';
            if (wrongFlag) className += ' wrong-flag';
            if (hint) className += ` hint-${hintCell.kind}`;
            if (cell?.mine && game?.board?.lost) className += ' mine-cell';
            const display = !cell ? (
              ''
            ) : flagged ? (
              <ClassicFlag />
            ) : revealed && cell.mine ? (
              <Bomb size={16} fill="currentColor" />
            ) : revealed && cell.adjacent ? (
              <span className={`n n${cell.adjacent}`}>{cell.adjacent}</span>
            ) : (
              ''
            );
            return (
              <button
                key={i}
                className={className}
                style={{
                  '--delay': `${Math.min(((i % config.cols) + Math.floor(i / config.cols)) * 10, 110)}ms`,
                }}
                role="gridcell"
                aria-label={
                  !cell
                    ? `Cell ${i + 1}, covered`
                    : flagged
                      ? `Cell ${i + 1}, flagged`
                      : revealed
                        ? cell.mine
                          ? `Cell ${i + 1}, mine`
                          : `Cell ${i + 1}, ${cell.adjacent || 'empty'}`
                        : `Cell ${i + 1}, covered`
                }
                onPointerDown={(e) => down(e, i)}
                onPointerMove={move}
                onPointerUp={(e) => up(e, i)}
                onPointerCancel={(e) => {
                  window.clearTimeout(longTimer.current);
                  activePointers.current.delete(e.pointerId);
                  pointer.current = null;
                  pinchStart.current = null;
                }}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              >
                {display}
              </button>
            );
          })}
        </div>
        {!started && (
          <div className="board-note">
            <span>Tap a cell to begin</span>
            <small>First move is protected</small>
          </div>
        )}
        {game?.board?.lost && (
          <div className="result-strip loss-strip">
            <div>
              <b>Mine found you.</b>
              <span>Board preserved for review.</span>
            </div>
            <div className="result-actions">
              <button onClick={retry}>
                <RotateCcw size={14} /> Retry board
              </button>
              <button onClick={() => createFresh(difficulty)}>New board</button>
            </div>
          </div>
        )}
        {game?.board?.won && (
          <div className="result-strip win-strip">
            <div>
              <b>Board cleared.</b>
              <span>
                {formatTime(elapsed)}
                {game.hints
                  ? ` · ${game.hints} hint${game.hints > 1 ? 's' : ''}`
                  : ''}
              </span>
            </div>
            <div className="result-actions">
              <button onClick={() => createFresh(difficulty)}>
                Play again
              </button>
              <button onClick={() => createFresh(difficulty, 'daily')}>
                Daily board
              </button>
            </div>
          </div>
        )}
      </div>
      {game?.board?.attempts > 1 && !game.retry && (
        <div className="generation-note">
          FAIR BOARD VERIFIED · {game.board.attempts} attempts
        </div>
      )}
      <footer className="bottom-bar">
        <button className="seed-button" onClick={() => setPanel('seed')}>
          SEED <span>{formatGameSeed(game)}</span>
          <Copy size={12} />
        </button>
        <span className="input-hint">
          <Hand size={13} /> Tap reveal · hold flag
        </span>
        <button
          className="settings-audio"
          aria-label="Toggle sound"
          onClick={() => setSettings((s) => ({ ...s, sound: !s.sound }))}
        >
          {settings.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </footer>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {panel && (
        <div
          className="scrim"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setPanel('');
          }}
        >
          <section className="sheet" role="dialog" aria-modal="true">
            <header>
              <h2>
                {panel === 'help'
                  ? 'How to play'
                  : panel === 'settings'
                  ? 'Settings'
                  : panel === 'stats'
                    ? 'Your play'
                    : 'Board seed'}
              </h2>
              <button
                className="icon-button"
                aria-label="Close"
                onClick={() => setPanel('')}
              >
                <X size={19} />
              </button>
            </header>
            {panel === 'help' && (
              <div className="help-content">
                <p><b>Reveal:</b> click or tap a covered square.</p>
                <p><b>Flag:</b> right-click, long-press, or turn on Flag mode.</p>
                <p><b>Chord:</b> activate a number with the matching count of adjacent flags to open its remaining neighbors.</p>
                <p>Numbers show how many mines touch that square. Clear every safe square to win. The first square and its neighbors are protected.</p>
                <p><b>Keyboard:</b> press F2 for a new board. On a phone, drag the board to pan and pinch to zoom.</p>
              </div>
            )}
            {panel === 'settings' && (
              <div className="settings-list">
                {[
                  ['sound', 'Sound', 'Small synthesized game sounds'],
                  ['haptics', 'Haptics', 'Subtle touch feedback'],
                  [
                    'highContrast',
                    'High contrast',
                    'Stronger cell edges and numbers',
                  ],
                  [
                    'reducedMotion',
                    'Reduced motion',
                    'Remove reveal ripple effects',
                  ],
                  [
                    'leftHanded',
                    'Left-handed controls',
                    'Move key actions to the left',
                  ],
                ].map(([key, label, desc]) => (
                  <label className="setting-row" key={key}>
                    <span>
                      <b>{label}</b>
                      <small>{desc}</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, [key]: e.target.checked }))
                      }
                    />
                  </label>
                ))}
                <label className="setting-row volume-row">
                  <span>
                    <b>Volume</b>
                    <small>{Math.round(settings.volume * 100)}%</small>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.volume * 100}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        volume: Number(e.target.value) / 100,
                      }))
                    }
                  />
                </label>
                <div className="setting-row">
                  <span>
                    <b>Board mode</b>
                    <small>Fair boards are solver-verified</small>
                  </span>
                  <select
                    value={settings.mode}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, mode: e.target.value }))
                    }
                  >
                    <option>FAIR BOARD</option>
                    <option>CLASSIC RANDOM</option>
                  </select>
                </div>
                <button
                  className="sheet-action"
                  onClick={() => setPanel('seed')}
                >
                  Play a seed <span>›</span>
                </button>
              </div>
            )}
            {panel === 'stats' && (
              <div className="stats-content">
                <div className="daily-summary">
                  <div>
                    <CalendarDays size={18} />
                    <span>DAILY STREAK</span>
                  </div>
                  <strong>
                    {daily[dailyKey]?.streak || 0} <small>days</small>
                  </strong>
                  <p>
                    {daily[dailyKey]?.completed
                      ? `Today complete · ${formatTime(daily[dailyKey].time)}`
                      : daily[dailyKey]?.attempted
                        ? 'Today attempted'
                        : 'Today is waiting'}
                  </p>
                </div>
                <div className="stats-head">
                  <span>DIFFICULTY</span>
                  <span>PLAYED</span>
                  <span>WIN</span>
                  <span>BEST</span>
                </div>
                {Object.keys(DIFFICULTIES).map((name) => {
                  const r = records[name] || {};
                  const pct = r.played
                    ? Math.round(((r.wins || 0) / r.played) * 100)
                    : 0;
                  return (
                    <div className="stats-group" key={name}>
                      <div className="stats-row">
                        <b>{name}</b>
                        <span>{r.played || 0}</span>
                        <span>{pct}%</span>
                        <span>{r.best == null ? '—' : formatTime(r.best)}</span>
                      </div>
                      <div className="stats-detail">
                        AVG WIN{' '}
                        {r.wins
                          ? formatTime(
                              Math.round((r.totalWinTime || 0) / r.wins),
                            )
                          : '—'}{' '}
                        <span>
                          STREAK {r.streak || 0} · BEST {r.bestStreak || 0}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <p className="stats-foot">
                  Retries are excluded from these records.
                </p>
              </div>
            )}
            {panel === 'seed' && (
              <div className="seed-content">
                <p>
                  Every board has a reproducible seed. Retry keeps this exact
                  layout.
                </p>
                <div className="current-seed">
                  <code>
                    {game?.seed ? formatGameSeed(game) : 'Start a board first'}
                  </code>
                  <button onClick={copySeed}>
                    <Copy size={15} /> Copy
                  </button>
                </div>
                <label htmlFor="seed-input">PLAY A SEED</label>
                <div className="seed-entry">
                  <input
                    id="seed-input"
                    value={seedEntry}
                    onChange={(e) => setSeedEntry(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && playSeed()}
                    placeholder="Paste a seed or enter a phrase"
                  />
                  <button onClick={playSeed}>Play</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
