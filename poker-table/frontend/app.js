const API = window.POKER_API || 'https://pokerserverv1-production.up.railway.app';

let credential = localStorage.getItem('pokerCredential');
let view;
let selected = [];
let socket;
let reconnectTimer;
let booting = false;
let connectionState = 'CONNECTING';
let lastError = '';

const q = (selector) => document.querySelector(selector);
const cid = () => crypto.randomUUID();
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const symbols = { c: '♣', d: '♦', h: '♥', s: '♠' };

const call = async (path, body) => {
  const response = await fetch(API + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
      ...(credential ? { authorization: 'Bearer ' + credential } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json();
  if (!response.ok) throw Error(json.error || 'request_failed');
  return json;
};

const card = (data, index, hidden = false) => {
  if (hidden) return '<span class="card back" aria-label="Hidden card">♠</span>';
  const red = ['h', 'd'].includes(data.suit) ? ' red' : '';
  const chosen = selected.includes(index) ? ' selected' : '';
  return '<button class="card' + red + chosen + '" data-card-index="' + index + '"><span>' + esc(data.rank) + '</span><i>' + symbols[data.suit] + '</i></button>';
};

const emptySeats = () => [0, 1, 2, 3, 4].filter((seat) => !view.seats.some((player) => player.seat === seat));

const phaseCopy = () => {
  if (view.variant === 'FIVE_CARD_DRAW_FIXED_LIMIT') {
    return view.phase === 'DRAW' ? 'DRAW · SELECT CARDS' : 'DRAW · WAITING FOR BETTING';
  }
  if (!view.board.length) return 'PRE-FLOP';
  return 'COMMUNITY CARDS';
};

const statusCopy = () => {
  if (!view) return connectionState;
  const actor = view.you.seat !== null && view.actorSeat === view.you.seat;
  if (lastError) return 'DISCONNECTED · RETRY';
  if (connectionState !== 'CONNECTED') return connectionState === 'RECONNECTING' ? 'RECONNECTING' : 'CONNECTING';
  if (actor) return 'YOUR TURN · ' + (view.phase === 'DRAW' ? 'SELECT CARDS' : view.status);
  if (view.you.seat === null) return emptySeats().length ? 'SPECTATING · TAKE A SEAT' : 'SPECTATING · TABLE FULL';
  return view.status;
};

const seatMarkup = (player, zone, openSeat) => {
  if (!player) {
    return '<button class="seat-zone empty-seat ' + zone + '" data-sit="' + openSeat + '"><span>SIT</span><small>OPEN SEAT</small></button>';
  }
  const me = player.seat === view.you.seat;
  const state = player.allIn ? 'ALL-IN' : player.folded ? 'FOLDED' : player.roundCommitted ? 'BET ' + player.roundCommitted : '—';
  const backs = me ? '' : '<div class="mini-cards">' + Array.from({ length: player.cards }, () => card(null, -1, true)).join('') + '</div>';
  return '<article class="seat-zone ' + zone + (me ? ' local-seat' : '') + (player.folded ? ' folded' : '') + '"><span class="seat-name">' + esc(player.name) + (player.bot ? ' <em>BOT</em>' : '') + '</span><strong>' + player.stack + '</strong><small>' + state + (player.dealer ? ' · D' : '') + '</small>' + backs + '</article>';
};

function renderTable() {
  const local = view.seats.find((player) => player.seat === view.you.seat);
  const opponents = view.seats.filter((player) => player !== local);
  const open = emptySeats();
  let seatIndex = 0;
  let emptyIndex = 0;

  const renderedSeats = ['top-left', 'top-right', 'middle-left', 'middle-right', 'local'].map((zone) => {
    const player = local && zone === 'local' ? local : opponents[seatIndex++];
    const openSeat = player ? undefined : open[emptyIndex++];
    return seatMarkup(player, zone, openSeat);
  }).join('');

  const variant = view.variant === 'HOLD_EM_NO_LIMIT' ? 'TEXAS HOLD’EM' : 'FIVE-CARD DRAW';
  const board = view.board.length ? view.board.map((data) => card(data, -1)).join('') : '<span class="board-empty">' + phaseCopy() + '</span>';

  q('#table').innerHTML = '<div class="felt"><div class="table-layout">' + renderedSeats + '<section class="center"><span class="variant">' + variant + (view.nextVariant ? ' · NEXT HAND QUEUED' : '') + '</span><strong class="pot">POT ' + view.pot + '</strong><div class="board">' + board + '</div></section></div></div>';
}

function renderCards() {
  const open = emptySeats();
  if (view.you.hand.length) {
    q('#cards').innerHTML = '<div class="hand">' + view.you.hand.map((data, index) => card(data, index)).join('') + '</div>';
    return;
  }
  if (view.you.seat === null && open.length) {
    q('#cards').innerHTML = '<div class="spectator-state"><p>WAITING FOR PLAYERS</p><button class="take-seat" data-sit="' + open[0] + '">TAKE A SEAT</button></div>';
    return;
  }
  q('#cards').innerHTML = '<p class="spectator">WAITING FOR THE NEXT HAND</p>';
}

function renderActions() {
  const actor = view.you.seat !== null && view.actorSeat === view.you.seat;
  const actions = [];
  const legal = view.you.legalActions;
  if (legal) {
    if (legal.fold) actions.push({ type: 'fold', label: 'Fold', tone: 'danger' });
    if (legal.check) actions.push({ type: 'check', label: 'Check', tone: '' });
    if (legal.call) {
      const mine = view.seats.find((player) => player.seat === view.you.seat);
      actions.push({ type: 'call', label: 'Call ' + (view.currentBet - (mine?.roundCommitted || 0)), tone: 'primary' });
    }
    if (legal.betTo) actions.push({ type: 'betTo', label: 'Bet ' + legal.betTo.min, amount: legal.betTo.min, tone: 'primary' });
    if (legal.raiseTo) actions.push({ type: 'raiseTo', label: 'Raise to ' + legal.raiseTo.min, amount: legal.raiseTo.min, tone: 'gold' });
  }
  if (view.phase === 'DRAW' && actor) {
    actions.push({ type: 'draw', label: selected.length ? 'Replace ' + selected.length + ' cards' : 'Keep all 5', tone: 'primary' });
  }
  if (connectionState === 'DISCONNECTED' || connectionState === 'RECONNECTING') {
    actions.push({ type: 'retry', label: 'Retry connection', tone: '' });
  }

  q('#actions').innerHTML = '<div class="actions">' + actions.map((action, index) => '<button data-action="' + index + '" class="' + action.tone + '">' + action.label + '</button>').join('') + '</div>';
  q('#actions').querySelectorAll('[data-action]').forEach((button) => {
    button.onclick = () => {
      const action = actions[Number(button.dataset.action)];
      if (action.type === 'retry') {
        retryConnection();
        return;
      }
      const payload = action.type === 'draw'
        ? { handId: view.handId, turnId: view.handId + ':' + view.actorId, type: 'draw', indexes: selected }
        : { handId: view.handId, turnId: view.handId + ':' + view.actorId, type: 'action', action: { type: action.type, amount: action.amount } };
      void command(payload);
    };
  });
}

function renderSheet() {
  const open = emptySeats();
  q('#sheetInfo').textContent = view.you.seat === null
    ? (open.length ? 'A seat is available. Join the next hand from an open seat.' : 'The table is full. You can continue watching.')
    : 'Seated at ' + (view.you.seat + 1) + '. Variant changes apply between hands.';
  q('#sheetActions').innerHTML = (view.you.seat === null && open.length ? '<button data-sit="' + open[0] + '">Take seat ' + (open[0] + 1) + '</button>' : '')
    + (open.length ? '<button data-bot="' + open[0] + '">Add a balanced bot</button>' : '')
    + (view.you.seat !== null ? '<button data-variant="' + (view.variant === 'HOLD_EM_NO_LIMIT' ? 'FIVE_CARD_DRAW_FIXED_LIMIT' : 'HOLD_EM_NO_LIMIT') + '">Queue ' + (view.variant === 'HOLD_EM_NO_LIMIT' ? 'Five-Card Draw' : 'Texas Hold’em') + '</button><button data-sitout="1">Sit out after this hand</button>' : '')
    + '<button data-share="1">Copy table link</button>';
}

function wireControls() {
  q('#table').querySelectorAll('[data-sit]').forEach((button) => {
    button.onclick = () => void command({ type: 'sit', seat: Number(button.dataset.sit) });
  });
  q('#cards').querySelectorAll('[data-sit]').forEach((button) => {
    button.onclick = () => void command({ type: 'sit', seat: Number(button.dataset.sit) });
  });
  q('#cards').querySelectorAll('[data-card-index]').forEach((button) => {
    button.onclick = () => {
      const index = Number(button.dataset.cardIndex);
      if (view.phase !== 'DRAW' || index < 0) return;
      selected = selected.includes(index) ? selected.filter((value) => value !== index) : [...selected, index];
      render();
    };
  });
  q('#sheetActions').querySelectorAll('[data-sit]').forEach((button) => {
    button.onclick = () => void command({ type: 'sit', seat: Number(button.dataset.sit) });
  });
  q('#sheetActions').querySelectorAll('[data-bot]').forEach((button) => {
    button.onclick = () => void command({ type: 'bot', seat: Number(button.dataset.bot), botStyle: 'balanced' });
  });
  q('#sheetActions').querySelectorAll('[data-variant]').forEach((button) => {
    button.onclick = () => void command({ type: 'queueVariant', variant: button.dataset.variant });
  });
  q('#sheetActions').querySelectorAll('[data-sitout]').forEach((button) => {
    button.onclick = () => void command({ type: 'sitOut' });
  });
  q('#sheetActions').querySelectorAll('[data-share]').forEach((button) => {
    button.onclick = () => navigator.clipboard.writeText(location.href);
  });
}

function render() {
  if (!view) return;
  q('#status').textContent = statusCopy();
  renderTable();
  renderCards();
  renderActions();
  renderSheet();
  wireControls();
}

async function command(payload) {
  lastError = '';
  try {
    await call('/api/command', {
      protocolVersion: 1,
      tableId: 'main',
      actionId: cid(),
      expectedVersion: view.stateVersion,
      ...payload,
    });
    view = await call('/api/table');
    selected = [];
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'request_failed';
    try {
      view = await call('/api/table');
    } catch {
      connectionState = 'DISCONNECTED';
    }
  }
  render();
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => void boot(), 1200);
}

function retryConnection() {
  clearTimeout(reconnectTimer);
  if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
  socket = undefined;
  connectionState = 'RECONNECTING';
  lastError = '';
  render();
  void boot();
}

async function connect() {
  if (socket && socket.readyState <= WebSocket.OPEN) return;
  connectionState = 'CONNECTING';
  render();

  const session = await call('/api/session', { name: 'Guest' });
  if (!credential) {
    credential = session.credential;
    localStorage.setItem('pokerCredential', credential);
  }

  const next = new WebSocket(API.replace(/^http/, 'ws') + '/ws?ticket=' + encodeURIComponent(session.websocketTicket));
  socket = next;
  next.onopen = () => {
    if (socket !== next) return;
    connectionState = 'CONNECTED';
    lastError = '';
    render();
  };
  next.onmessage = (event) => {
    if (socket !== next) return;
    const message = JSON.parse(event.data);
    if (!message.error) {
      view = message;
      connectionState = 'CONNECTED';
      lastError = '';
      render();
    }
  };
  next.onerror = () => undefined;
  next.onclose = () => {
    if (socket !== next) return;
    socket = undefined;
    connectionState = 'RECONNECTING';
    render();
    scheduleReconnect();
  };
}

async function boot() {
  if (booting) return;
  booting = true;
  try {
    if (!credential) {
      const session = await call('/api/session', { name: 'Guest' });
      credential = session.credential;
      localStorage.setItem('pokerCredential', credential);
    }
    view = await call('/api/table');
    lastError = '';
    render();
    await connect();
  } catch (error) {
    connectionState = 'DISCONNECTED';
    lastError = error instanceof Error ? error.message : 'connection_failed';
    render();
    scheduleReconnect();
  } finally {
    booting = false;
  }
}

q('#more').onclick = () => q('#sheet').showModal();
q('#closeSheet').onclick = () => q('#sheet').close();
void boot();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => undefined);
}
