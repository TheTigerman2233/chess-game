const socket = io();

const PIECE_CODE = {
  w: { p: 'wP', n: 'wN', b: 'wB', r: 'wR', q: 'wQ', k: 'wK' },
  b: { p: 'bP', n: 'bN', b: 'bB', r: 'bR', q: 'bQ', k: 'bK' }
};

let state = { board: createInitialBoard(), turn: 'w' };
let myColor = 'spectator';
let selected = null;
let legalMoves = [];

socket.on('assigned-color', (color) => {
  myColor = color;
  document.getElementById('status').textContent = `You are: ${color === 'spectator' ? 'Spectator' : color === 'w' ? 'White' : 'Black'}`;
});

socket.on('state-update', (newState) => {
  state = newState;
  selected = null;
  legalMoves = [];
  render();
});

socket.on('checkmate', () => {
  document.getElementById('status').textContent = 'Checkmate!';
});

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
      sq.className = 'square ' + ((r+c)%2===0 ? 'light' : 'dark');
      const piece = state.board[r][c];
      if (piece) sq.innerHTML = `<img class="piece" src="${pieceImg(piece)}">`;
      if (selected && selected[0]===r && selected[1]===c) sq.classList.add('selected');
      if (legalMoves.some(m => m.to[0]===r && m.to[1]===c)) sq.classList.add('legal');
      sq.onclick = () => handleClick(r, c);
      boardEl.appendChild(sq);
    }
  }
}

function handleClick(r, c) {
  const piece = state.board[r][c];

  if (selected) {
    const move = legalMoves.find(m => m.to[0]===r && m.to[1]===c);
    if (move) {
      const wasCapture = state.board[r][c] !== null;
      socket.emit('attempt-move', { from: selected, to: [r, c] });

      const soundId = wasCapture ? 'captureSound' : 'moveSound';
      document.getElementById(soundId).currentTime = 0;
      document.getElementById(soundId).play();

      selected = null; legalMoves = [];
      render();
      return;
    }
    selected = null; legalMoves = [];
  }

  if (piece && piece.color === myColor && myColor === state.turn) {
    selected = [r, c];
    legalMoves = getLegalMoves(state.board, r, c, state);
  }
  render();
}

function resetGame() {
  socket.emit('reset-game');
}

render();