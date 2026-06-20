const socket = io();

const PIECE_CODE = {
  w: { p: 'wP', n: 'wN', b: 'wB', r: 'wR', q: 'wQ', k: 'wK' },
  b: { p: 'bP', n: 'bN', b: 'bB', r: 'bR', q: 'bQ', k: 'bK' }
};

let state = { board: createInitialBoard(), turn: 'w' };
let myColor = 'spectator';
let selected = null;
let legalMoves = [];
let username = '';
let offlineMode = false;

// check for saved username on page load
const savedUsername = localStorage.getItem('chess-username');
if (savedUsername) {
  username = savedUsername;
  document.getElementById('welcomeText').textContent = `Welcome back, ${savedUsername}`;
  document.getElementById('usernameInput').value = savedUsername;
  document.getElementById('lobbyButtons').style.display = 'block';
  document.getElementById('setUsernameBtn').style.display = 'none';
  document.getElementById('usernameInput').disabled = true;
}

// ---- LOBBY LOGIC ----
function setUsername() {
  const val = document.getElementById('usernameInput').value.trim();
  if (!val) {
    document.getElementById('lobbyStatus').textContent = 'Please enter a username';
    return;
  }
  username = val;
  localStorage.setItem('chess-username', val); // <-- save it
  document.getElementById('welcomeText').textContent = `Welcome, ${val}`;
  document.getElementById('lobbyButtons').style.display = 'block';
  document.getElementById('setUsernameBtn').style.display = 'none';
  document.getElementById('usernameInput').disabled = true;
}

function createGame() {
  socket.emit('create-game', { username });
}

function joinGame() {
  const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  if (!roomCode) return;
  socket.emit('join-game', { username, roomCode });
}

function playOffline() {
  offlineMode = true;
  myColor = 'both';
  gameOver = false;
  state = { board: createInitialBoard(), turn: 'w' };
  showGameScreen('Offline Mode');
  render();
}

function showGameScreen(roomLabel) {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  document.getElementById('roomCodeDisplay').textContent = roomLabel;
}

// ---- SOCKET EVENTS ----
socket.on('joined-room', ({ roomCode, color }) => {
  myColor = color;
  showGameScreen(`Room Code: ${roomCode} — You are ${color === 'w' ? 'White' : color === 'b' ? 'Black' : 'Spectator'}`);
});

socket.on('join-error', (msg) => {
  document.getElementById('lobbyStatus').textContent = msg;
});

socket.on('state-update', (newState) => {
  state = newState;
  gameOver = false;
  selected = null;
  legalMoves = [];
  render();
});

socket.on('checkmate', ({ loserColor }) => {
  gameOver = true;
  if (myColor === loserColor) {
    document.getElementById('status').textContent = 'Checkmate — You Lost';
  } else if (myColor === 'spectator') {
    document.getElementById('status').textContent = `Checkmate — ${loserColor === 'w' ? 'White' : 'Black'} lost`;
  } else {
    document.getElementById('status').textContent = 'Checkmate — You Won!';
  }
});

// ---- BOARD RENDERING ----
function pieceImg(piece) {
  const code = PIECE_CODE[piece.color][piece.type];
  return `https://lichess1.org/assets/piece/cburnett/${code}.svg`;
}

function render() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      const piece = state.board[r][c];
      if (piece) sq.innerHTML = `<img class="piece" src="${pieceImg(piece)}">`;
      if (selected && selected[0] === r && selected[1] === c) sq.classList.add('selected');
      if (legalMoves.some(m => m.to[0] === r && m.to[1] === c)) sq.classList.add('legal');
      sq.onclick = () => handleClick(r, c);
      boardEl.appendChild(sq);
    }
  }
  document.getElementById('status').textContent = `Turn: ${state.turn === 'w' ? 'White' : 'Black'}`;
}

let gameOver = false;

function handleClick(r, c) {
  if (gameOver) return; // block all moves after checkmate

  const piece = state.board[r][c];
  const canMoveThisColor = offlineMode ? true : (myColor === state.turn);

  if (selected) {
    const move = legalMoves.find(m => m.to[0] === r && m.to[1] === c);
    if (move) {
      const wasCapture = state.board[r][c] !== null;

      if (offlineMode) {
  makeMove(state, selected, [r, c]);

  // DEBUG
  console.log('Checking checkmate for:', state.turn);
  const [kr, kc] = findKing(state.board, state.turn);
  console.log('King at:', kr, kc);
  console.log('King legal moves:', getLegalMoves(state.board, kr, kc, state));
  console.log('isCheckmate result:', isCheckmate(state));

  if (isCheckmate(state)) {
    gameOver = true;
    const loser = state.turn === 'w' ? 'White' : 'Black';
    const winner = state.turn === 'w' ? 'Black' : 'White';
    document.getElementById('status').textContent = `Checkmate — ${winner} Wins`;
  }
}

       else {
        socket.emit('attempt-move', { from: selected, to: [r, c] });
      }

      const soundId = wasCapture ? 'captureSound' : 'moveSound';
      document.getElementById(soundId).currentTime = 0;
      document.getElementById(soundId).play();

      selected = null; legalMoves = [];
      render();
      return;
    }
    selected = null; legalMoves = [];
  }

  // KEY FIX: even in offline mode, only allow selecting the piece whose TURN it is
  if (piece && canMoveThisColor && piece.color === state.turn) {
    selected = [r, c];
    legalMoves = getLegalMoves(state.board, r, c, state);
  }
  render();
}

function resetGame() {
  gameOver = false;
  if (offlineMode) {
    state = { board: createInitialBoard(), turn: 'w' };
    render();
  } else {
    socket.emit('reset-game');
  }
}

function logout() {
  localStorage.removeItem('chess-username');
  location.reload();
}

socket.on('players-update', (players) => {
  const names = players
    .filter(p => p.color === 'w' || p.color === 'b')
    .map(p => `${p.color === 'w' ? '⚪' : '⚫'} ${p.username}`)
    .join('   vs   ');
  document.getElementById('playersDisplay').textContent = names;
});