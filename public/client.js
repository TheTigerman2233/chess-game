// public/client.js
const PIECE_CODE = {
    w: { p: 'wP', n: 'wN', b: 'wB', r: 'wR', q: 'wQ', k: 'wK' },
    b: { p: 'bP', n: 'bN', b: 'bB', r: 'bR', q: 'bQ', k: 'bK' }
};

function pieceImg(piece) {
    const code = PIECE_CODE[piece.color][piece.type];
    return `https://lichess1.org/assets/piece/cburnett/${code}.svg`;
}

let selected = null;
let legalMoves = [];

async function render() {
    const state = await fetch('/api/state').then(r => r.json());
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = document.createElement('div');
            sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
            const piece = state.board[r][c];
            if (piece) sq.innerHTML = `<img class="piece" src="${pieceImg(piece)}" alt="${piece.color}${piece.type}">`; if (legalMoves.some(m => m.to[0] === r && m.to[1] === c)) sq.classList.add('legal');
            sq.onclick = () => handleClick(r, c, state);
            boardEl.appendChild(sq);
        }
    }
    document.getElementById('status').textContent = `Turn: ${state.turn === 'w' ? 'White' : 'Black'}`;
}

async function handleClick(r, c, state) {
    const piece = state.board[r][c];

    if (selected) {
        const move = legalMoves.find(m => m.to[0] === r && m.to[1] === c);
        if (move) {
            const wasCapture = state.board[r][c] !== null; // check BEFORE the move happens

            const res = await fetch('/api/move', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from: selected, to: [r, c] })
            }).then(res => res.json());

            // play sound
            const soundId = wasCapture ? 'captureSound' : 'moveSound';
            document.getElementById(soundId).currentTime = 0;
            document.getElementById(soundId).play();

            selected = null; legalMoves = [];
            await render();
            if (res.checkmate) document.getElementById('status').textContent = 'Checkmate!';
            return;
        }
        selected = null; legalMoves = [];
    }

    if (piece && piece.color === state.turn) {
        selected = [r, c];
        legalMoves = await fetch(`/api/legal-moves?r=${r}&c=${c}`).then(r => r.json());
    }
    render();
}

render();
async function resetGame() {
    await fetch('/api/reset', { method: 'POST' });
    selected = null;
    legalMoves = [];
    render();
}