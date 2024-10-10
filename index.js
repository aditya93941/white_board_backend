// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Store rooms in memory for simplicity
const rooms = {};

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('createRoom', ({ roomCode, username }) => {
    rooms[roomCode] = { owner: socket.id, users: [], chatHistory: [] };
    socket.join(roomCode);
    rooms[roomCode].users.push({ id: socket.id, username });
    socket.emit('roomCreated', { roomCode });
  });

  socket.on('joinRoom', ({ roomCode, username }) => {
    const room = rooms[roomCode];
    if (room) {
      socket.join(roomCode);
      room.users.push({ id: socket.id, username });
      socket.to(roomCode).emit('userJoined', { username });
      io.to(socket.id).emit('welcome', { username, roomCode });
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('grantMicAccess', ({ roomCode, userId }) => {
    const room = rooms[roomCode];
    if (room && socket.id === room.owner) {
      io.to(userId).emit('micAccessGranted', true);
    }
  });

  socket.on('revokeMicAccess', ({ roomCode, userId }) => {
    const room = rooms[roomCode];
    if (room && socket.id === room.owner) {
      io.to(userId).emit('micAccessGranted', false);
    }
  });

  socket.on('sendMessage', ({ roomCode, message, username }) => {
    const room = rooms[roomCode];
    if (room && socket.id === room.owner) {
      io.to(roomCode).emit('receiveMessage', { message, username });
    } else {
      socket.emit('error', 'Only the room creator can send messages.');
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    // Handle user removal from room
  });
});

server.listen(5000, () => {
  console.log('Server is running on port 5000');
});
