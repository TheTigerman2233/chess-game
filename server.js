// server.js
const express = require('express');
const { createInitialBoard, getLegalMoves, makeMove, isCheckmate } = require('./chess-logic');

const app = express();
app.use(express.json());
app.use(express.static('public'));

let state = { board: createInitialBoard(), turn: 'w' };

app.get('/api/state', (req, res) => res.json(state));

app.get('/api/legal-moves', (req, res) => {
  const r = +req.query.r, c = +req.query.c;
  res.json(getLegalMoves(state.board, r, c, state));
});

app.post('/api/move', (req, res) => {
  const { from, to } = req.body;
  const legal = getLegalMoves(state.board, from[0], from[1], state);
  const found = legal.find(m => m.to[0] === to[0] && m.to[1] === to[1]);
  if (!found) return res.status(400).json({ error: 'Illegal move' });

  makeMove(state, from, to);
  const checkmate = isCheckmate(state);
  res.json({ state, checkmate });
});

app.post('/api/reset', (req, res) => {
  state = { board: createInitialBoard(), turn: 'w' };
  res.json(state);
});

app.listen(3000, () => console.log('Chess server on http://localhost:3000'));