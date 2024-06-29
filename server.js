const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let waitingUsers = [];

io.on('connection', socket => {
  console.log('New user connected');

  socket.on('join', ({ gender, preference }) => {
    const user = { id: socket.id, gender, preference };
    const match = findMatch(user);

    if (match) {
      const roomId = uuidv4();
      socket.join(roomId);
      io.to(match.id).emit('roomId', roomId);
      socket.emit('roomId', roomId);
    } else {
      waitingUsers.push(user);
    }
  });

  socket.on('message', ({ roomId, message }) => {
    io.to(roomId).emit('message', message);
  });

  socket.on('disconnect', () => {
    waitingUsers = waitingUsers.filter(user => user.id !== socket.id);
    console.log('User disconnected');
  });
});

function findMatch(user) {
  for (let i = 0; i < waitingUsers.length; i++) {
    const waitingUser = waitingUsers[i];
    if (
      (waitingUser.preference === 'any' || waitingUser.preference === user.gender) &&
      (user.preference === 'any' || user.preference === waitingUser.gender)
    ) {
      waitingUsers.splice(i, 1);
      return waitingUser;
    }
  }
  return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
