// chess-logic.js
function createInitialBoard() {
  const back = ['r','n','b','q','k','b','n','r'];
  const board = Array.from({length: 8}, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: back[c], color: 'b' };
    board[1][c] = { type: 'p', color: 'b' };
    board[6][c] = { type: 'p', color: 'w' };
    board[7][c] = { type: back[c], color: 'w' };
  }
  return board;
}
function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function getPseudoLegalMoves(board, r, c, state) {
  const piece = board[r][c];
  if (!piece) return [];
  const moves = [];
  const dir = piece.color === 'w' ? -1 : 1; // white moves up (toward row 0)

  const addIfValid = (nr, nc, captureOnly = false, moveOnly = false) => {
    if (!inBounds(nr, nc)) return false;
    const target = board[nr][nc];
    if (target && target.color === piece.color) return false;
    if (captureOnly && !target) return false;
    if (moveOnly && target) return false;
    moves.push({ from: [r,c], to: [nr,nc] });
    return !target; // true if square was empty (can keep sliding)
  };

  switch (piece.type) {
    case 'p': {
      // forward move
      if (!board[r+dir]?.[c]) {
        addIfValid(r+dir, c, false, true);
        const startRow = piece.color === 'w' ? 6 : 1;
        if (r === startRow && !board[r+2*dir][c]) {
          addIfValid(r+2*dir, c, false, true);
        }
      }
      // captures
      for (const dc of [-1, 1]) {
        addIfValid(r+dir, c+dc, true);
      }
      // TODO: en passant, promotion handled separately
      break;
    }
    case 'n': {
      const deltas = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
      for (const [dr,dc] of deltas) addIfValid(r+dr, c+dc);
      break;
    }
    case 'b': case 'r': case 'q': {
      const dirs = {
        b: [[1,1],[1,-1],[-1,1],[-1,-1]],
        r: [[1,0],[-1,0],[0,1],[0,-1]],
        q: [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]
      }[piece.type];
      for (const [dr,dc] of dirs) {
        let nr = r+dr, nc = c+dc;
        while (inBounds(nr,nc)) {
          const canKeepGoing = addIfValid(nr, nc);
          if (!canKeepGoing) break;
          nr += dr; nc += dc;
        }
      }
      break;
    }
    case 'k': {
      const deltas = [[1,0],[1,1],[1,-1],[-1,0],[-1,1],[-1,-1],[0,1],[0,-1]];
      for (const [dr,dc] of deltas) addIfValid(r+dr, c+dc);
      // TODO: castling handled separately
      break;
    }
  }
  return moves;
}
function isSquareAttacked(board, r, c, byColor) {
  for (let rr = 0; rr < 8; rr++) {
    for (let cc = 0; cc < 8; cc++) {
      const p = board[rr][cc];
      if (p && p.color === byColor) {
        const moves = getPseudoLegalMoves(board, rr, cc, {});
        if (moves.some(m => m.to[0] === r && m.to[1] === c)) return true;
      }
    }
  }
  return false;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === 'k' && board[r][c].color === color) return [r,c];
}

function getLegalMoves(board, r, c, state) {
  const piece = board[r][c];
  const pseudo = getPseudoLegalMoves(board, r, c, state);
  return pseudo.filter(move => {
    const test = board.map(row => row.slice()); // deep-ish copy
    test[move.to[0]][move.to[1]] = test[r][c];
    test[r][c] = null;
    const [kr, kc] = findKing(test, piece.color);
    const enemy = piece.color === 'w' ? 'b' : 'w';
    return !isSquareAttacked(test, kr, kc, enemy);
  });
}
function makeMove(state, from, to) {
  const [fr, fc] = from, [tr, tc] = to;
  const piece = state.board[fr][fc];
  state.board[tr][tc] = piece;
  state.board[fr][fc] = null;

  // pawn promotion (auto-queen for now)
  if (piece.type === 'p' && (tr === 0 || tr === 7)) {
    piece.type = 'q';
  }

  state.turn = state.turn === 'w' ? 'b' : 'w';
  return state;
}

function isCheckmate(state) {
  const color = state.turn;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.color === color) {
        if (getLegalMoves(state.board, r, c, state).length > 0) return false;
      }
    }
  }
  const [kr, kc] = findKing(state.board, color);
  const enemy = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(state.board, kr, kc, enemy);
}

module.exports = { createInitialBoard, getLegalMoves, makeMove, isCheckmate, isSquareAttacked, findKing };