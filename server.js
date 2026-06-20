const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createInitialBoard, getLegalMoves, makeMove, isCheckmate } = require('./chess-logic');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// rooms: { roomCode: { state, players: { socketId: {username, color} } } }
const rooms = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('create-game', ({ username }) => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      state: { board: createInitialBoard(), turn: 'w' },
      players: { [socket.id]: { username, color: 'w' } }
    };
    currentRoom = roomCode;
    socket.join(roomCode);
    socket.emit('joined-room', { roomCode, color: 'w' });
    socket.emit('state-update', rooms[roomCode].state);
  });

  socket.on('join-game', ({ username, roomCode }) => {
    const room = rooms[roomCode];
    if (!room) {
      socket.emit('join-error', 'Room not found');
      return;
    }
    const colorsTaken = Object.values(room.players).map(p => p.color);
    const color = !colorsTaken.includes('b') ? 'b' : 'spectator';

    room.players[socket.id] = { username, color };
    currentRoom = roomCode;
    socket.join(roomCode);
    socket.emit('joined-room', { roomCode, color });
    socket.emit('state-update', room.state);
    io.to(roomCode).emit('state-update', room.state);
  });

  socket.on('attempt-move', ({ from, to }) => {
    const room = rooms[currentRoom];
    if (!room) return;
    const player = room.players[socket.id];
    if (!player || player.color !== room.state.turn) return;

    const legal = getLegalMoves(room.state.board, from[0], from[1], room.state);
    const found = legal.find(m => m.to[0] === to[0] && m.to[1] === to[1]);
    if (!found) return;

    makeMove(room.state, from, to);
    const checkmate = isCheckmate(room.state);

    io.to(currentRoom).emit('state-update', room.state);
    if (checkmate) io.to(currentRoom).emit('checkmate');
  });

  socket.on('reset-game', () => {
    const room = rooms[currentRoom];
    if (!room) return;
    room.state = { board: createInitialBoard(), turn: 'w' };
    io.to(currentRoom).emit('state-update', room.state);
  });

  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom]) {
      delete rooms[currentRoom].players[socket.id];
      if (Object.keys(rooms[currentRoom].players).length === 0) {
        delete rooms[currentRoom]; // cleanup empty rooms
      }
    }
  });
});

server.listen(3000, () => console.log('Chess server on http://localhost:3000'));