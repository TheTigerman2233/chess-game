const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createInitialBoard, getLegalMoves, makeMove, isCheckmate } = require('./chess-logic');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let state = { board: createInitialBoard(), turn: 'w' };
let players = {}; // socket.id -> 'w' | 'b' | 'spectator'

io.on('connection', (socket) => {
  // assign color
  const colorsTaken = Object.values(players);
  let color = 'spectator';
  if (!colorsTaken.includes('w')) color = 'w';
  else if (!colorsTaken.includes('b')) color = 'b';

  players[socket.id] = color;
  socket.emit('assigned-color', color);
  socket.emit('state-update', state);

  console.log(`Player connected as ${color}`);

  socket.on('attempt-move', ({ from, to }) => {
    const myColor = players[socket.id];
    if (myColor !== state.turn) return; // not your turn / you're a spectator

    const legal = getLegalMoves(state.board, from[0], from[1], state);
    const found = legal.find(m => m.to[0] === to[0] && m.to[1] === to[1]);
    if (!found) return;

    makeMove(state, from, to);
    const checkmate = isCheckmate(state);

    io.emit('state-update', state); // push to EVERYONE
    if (checkmate) io.emit('checkmate');
  });

  socket.on('reset-game', () => {
    state = { board: createInitialBoard(), turn: 'w' };
    io.emit('state-update', state);
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
  });
});

server.listen(3000, () => console.log('Chess server on http://localhost:3000'));