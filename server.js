
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const uuid = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000;

let rooms = {};

io.on('connection', socket => {
    console.log('New client connected');

    socket.on('join', ({ gender, preference }) => {
        const roomId = uuid.v4();
        rooms[roomId] = { clients: [socket.id], gender, preference };
        socket.join(roomId);
        socket.emit('roomId', roomId);
    });

    socket.on('offer', ({ offer, roomId }) => {
        socket.to(roomId).emit('offer', { offer });
    });

    socket.on('answer', ({ answer, roomId }) => {
        socket.to(roomId).emit('answer', { answer });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        // Handle cleanup and room management on disconnect
    });
});

app.use(express.static('public'));

server.listen(port, () => console.log(`Server running on port ${port}`));
