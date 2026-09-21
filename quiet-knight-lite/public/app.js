const elements = Object.fromEntries([
  'lobby', 'table', 'create-button', 'join-button', 'room-input', 'lobby-error', 'room-code', 'room-button',
  'board', 'opponent-name', 'opponent-state', 'opponent-clock', 'you-name', 'you-state', 'you-clock',
  'status', 'resign-button', 'draw-button', 'rematch-button', 'share-button', 'table-error',
  'promotion-dialog', 'promotion-choices', 'toast',
].map((id) => [id, document.getElementById(id)]));

const glyphs = {
  white: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  black: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

let code = null;
let seatToken = null;
let state = null;
let selected = null;
let receivedAt = Date.now();
let socket = null;
let reconnectTimer = null;
let toastTimer = null;

elements['create-button'].addEventListener('click', createRoom);
elements['join-button'].addEventListener('click', () => joinRoom(elements['room-input'].value));
elements['room-input'].addEventListener('input', () => {
  elements['room-input'].value = normalizeCode(elements['room-input'].value);
});
elements['room-input'].addEventListener('keydown', (event) => {
  if (event.key === 'Enter') joinRoom(elements['room-input'].value);
});
elements['share-button'].addEventListener('click', shareInvite);
elements['room-button'].addEventListener('click', () => copyText(code, 'Room code copied'));
elements['resign-button'].addEventListener('click', () => {
  if (confirm('Resign this game?')) perform('resign');
});
elements['draw-button'].addEventListener('click', () => perform('draw'));
elements['rematch-button'].addEventListener('click', () => perform('rematch'));

setInterval(renderClocks, 125);

const initialCode = normalizeCode(new URL(location.href).searchParams.get('room'));
if (initialCode) joinRoom(initialCode);

async function createRoom() {
  setBusy(true);
  clearErrors();
  try {
    const response = await fetch('/api/rooms', { method: 'POST' });
    const data = await parseResponse(response);
    code = data.code;
    seatToken = data.seatToken;
    localStorage.setItem(storageKey(code), seatToken);
    history.replaceState({}, '', invitePath(code));
    enterTable(data.state);
  } catch (error) {
    elements['lobby-error'].textContent = error.message;
  } finally {
    setBusy(false);
  }
}

async function joinRoom(rawCode) {
  const nextCode = normalizeCode(rawCode);
  if (nextCode.length !== 6) {
    elements['lobby-error'].textContent = 'Enter the six-character room code.';
    return;
  }
  setBusy(true);
  clearErrors();
  try {
    const remembered = localStorage.getItem(storageKey(nextCode));
    const response = await fetch(`/api/rooms/${nextCode}/join`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ seatToken: remembered }),
    });
    const data = await parseResponse(response);
    code = nextCode;
    seatToken = data.seatToken;
    if (seatToken) localStorage.setItem(storageKey(code), seatToken);
    history.replaceState({}, '', invitePath(code));
    enterTable(data.state);
  } catch (error) {
    elements['lobby-error'].textContent = error.message;
  } finally {
    setBusy(false);
  }
}

function enterTable(nextState) {
  elements.lobby.hidden = true;
  elements.table.hidden = false;
  setState(nextState);
  connectSocket();
}

function connectSocket() {
  clearTimeout(reconnectTimer);
  if (socket) socket.close();
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const params = new URLSearchParams({ room: code });
  socket = new WebSocket(`${protocol}//${location.host}/ws?${params}`);
  socket.addEventListener('open', () => {
    if (seatToken) socket.send(JSON.stringify({ type: 'authenticate', seatToken }));
  });
  socket.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'state') setState(message.state);
    } catch { /* Ignore malformed network frames. */ }
  });
  socket.addEventListener('close', () => {
    if (code) reconnectTimer = setTimeout(connectSocket, 1000);
  });
}

function setState(nextState) {
  const generationChanged = state && nextState.generation !== state.generation;
  state = nextState;
  receivedAt = Date.now();
  if (generationChanged) selected = null;
  render();
}

function render() {
  if (!state) return;
  elements['room-code'].textContent = state.code;
  renderPlayers();
  renderBoard();
  renderStatus();
  renderClocks();
}

function renderPlayers() {
  if (state.role === 'spectator') {
    elements['opponent-name'].textContent = 'Black';
    elements['opponent-state'].textContent = state.seats.black ? 'Seated' : 'Waiting to join';
    elements['you-name'].textContent = 'White';
    elements['you-state'].textContent = state.seats.white ? 'Seated · You are watching' : 'Waiting to join';
    return;
  }
  const opponent = state.role === 'white' ? 'black' : 'white';
  elements['opponent-name'].textContent = 'Opponent';
  elements['opponent-state'].textContent = state.seats[opponent] ? title(opponent) : 'Waiting to join';
  elements['you-name'].textContent = 'You';
  elements['you-state'].textContent = title(state.role);
}

function renderBoard() {
  const files = state.role === 'black' ? [...'hgfedcba'] : [...'abcdefgh'];
  const ranks = state.role === 'black' ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  const pieces = new Map(state.board.map((piece) => [piece.square, piece]));
  const destinations = new Map();
  if (selected) {
    for (const move of state.legalMoves.filter((candidate) => candidate.from === selected)) {
      destinations.set(move.to, move);
    }
  }
  const fragment = document.createDocumentFragment();
  for (const rank of ranks) {
    for (const file of files) {
      const square = `${file}${rank}`;
      const piece = pieces.get(square);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `square ${(file.charCodeAt(0) - 97 + rank) % 2 ? 'light' : 'dark'}`;
      button.dataset.square = square;
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', piece ? `${piece.color} ${pieceName(piece.type)} on ${square}` : square);
      if (square === selected) button.classList.add('selected');
      if (destinations.has(square)) button.classList.add(piece ? 'capture' : 'legal');
      if (piece) {
        const span = document.createElement('span');
        span.className = `piece ${piece.color}`;
        span.textContent = glyphs[piece.color][piece.type];
        span.setAttribute('aria-hidden', 'true');
        button.append(span);
      }
      if (file === files[0]) button.append(coordinate(String(rank), 'rank'));
      if (rank === ranks[ranks.length - 1]) button.append(coordinate(file, 'file'));
      button.addEventListener('click', () => selectSquare(square, piece, destinations.get(square)));
      fragment.append(button);
    }
  }
  elements.board.replaceChildren(fragment);
}

async function selectSquare(square, piece, move) {
  if (state.role === 'spectator' || state.status !== 'playing' || state.turn !== state.role) return;
  if (move) {
    let promotion = move.promotion;
    if (promotion) promotion = await choosePromotion();
    if (!promotion && move.promotion) return;
    const from = selected;
    selected = null;
    await perform('move', { from, to: square, promotion });
    return;
  }
  if (piece?.color === state.role && state.legalMoves.some((candidate) => candidate.from === square)) {
    selected = square;
  } else {
    selected = null;
  }
  renderBoard();
}

function choosePromotion() {
  return new Promise((resolve) => {
    elements['promotion-choices'].replaceChildren();
    const color = state.role;
    for (const type of ['q', 'r', 'b', 'n']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.value = type;
      button.textContent = glyphs[color][type];
      button.setAttribute('aria-label', `Promote to ${pieceName(type)}`);
      button.addEventListener('click', () => {
        elements['promotion-dialog'].close(type);
      });
      elements['promotion-choices'].append(button);
    }
    elements['promotion-dialog'].addEventListener('close', () => resolve(elements['promotion-dialog'].returnValue || null), { once: true });
    elements['promotion-dialog'].showModal();
  });
}

function renderStatus() {
  const seated = state.role !== 'spectator';
  let text;
  if (state.status === 'waiting') text = 'Waiting for your opponent…';
  else if (state.status === 'finished') text = state.result?.text || 'Game finished';
  else if (state.role === 'spectator') text = `${title(state.turn)} to move · Spectating`;
  else if (state.turn === state.role) text = state.inCheck ? 'Your king is in check' : 'Your move';
  else text = state.inCheck ? 'Opponent is in check' : 'Opponent’s move';
  if (state.drawOffer && state.status === 'playing') {
    text += state.drawOffer === state.role ? ' · Draw offered' : ' · Opponent offered a draw';
  }
  elements.status.textContent = text;
  elements['resign-button'].hidden = !seated || state.status !== 'playing';
  elements['draw-button'].hidden = !seated || state.status !== 'playing';
  elements['draw-button'].textContent = state.drawOffer && state.drawOffer !== state.role ? 'Accept draw' : 'Offer draw';
  elements['rematch-button'].hidden = !seated || state.status !== 'finished';
  elements['rematch-button'].textContent = state.rematchRequested ? 'Rematch requested' : 'Rematch';
  elements['rematch-button'].disabled = state.rematchRequested;
}

function renderClocks() {
  if (!state) return;
  const clocks = { ...state.clocks };
  if (state.status === 'playing' && state.activeColor) {
    clocks[state.activeColor] = Math.max(0, clocks[state.activeColor] - (Date.now() - receivedAt));
  }
  const bottomColor = state.role === 'black' ? 'black' : 'white';
  const topColor = bottomColor === 'white' ? 'black' : 'white';
  setClock(elements['opponent-clock'], clocks[topColor], state.activeColor === topColor);
  setClock(elements['you-clock'], clocks[bottomColor], state.activeColor === bottomColor);
}

function setClock(element, milliseconds, active) {
  const safeMs = Math.max(0, milliseconds);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  element.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
  element.dateTime = `PT${totalSeconds}S`;
  element.classList.toggle('active', active && safeMs > 30000);
  element.classList.toggle('low', active && safeMs <= 30000);
}

async function perform(action, payload = {}) {
  clearErrors();
  try {
    const response = await fetch(`/api/rooms/${code}/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-seat-token': seatToken || '' },
      body: JSON.stringify(payload),
    });
    setState(await parseResponse(response));
  } catch (error) {
    elements['table-error'].textContent = error.message;
    if (action === 'move') refreshState();
  }
}

async function refreshState() {
  try {
    const response = await fetch(`/api/rooms/${code}`, { headers: { 'x-seat-token': seatToken || '' } });
    setState(await parseResponse(response));
  } catch { /* WebSocket retry will recover. */ }
}

async function shareInvite() {
  const url = new URL(invitePath(code), location.origin).href;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Quiet Knight Lite', text: `Join my chess table: ${code}`, url });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  copyText(url, 'Invite link copied');
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement('textarea');
    input.value = text;
    document.body.append(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }
  showToast(message);
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The table could not be reached.');
  return data;
}

function setBusy(busy) {
  elements['create-button'].disabled = busy;
  elements['join-button'].disabled = busy;
}

function clearErrors() {
  elements['lobby-error'].textContent = '';
  elements['table-error'].textContent = '';
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 1800);
}

function coordinate(text, kind) {
  const span = document.createElement('span');
  span.className = `coordinate ${kind}`;
  span.textContent = text;
  span.setAttribute('aria-hidden', 'true');
  return span;
}

function storageKey(roomCode) { return `qkl-seat-${roomCode}`; }
function invitePath(roomCode) { return `/?room=${encodeURIComponent(roomCode)}`; }
function normalizeCode(value) { return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); }
function title(value) { return value ? value[0].toUpperCase() + value.slice(1) : ''; }
function pieceName(type) { return ({ k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' })[type]; }
