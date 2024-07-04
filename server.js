const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let connectedPeers = {};

io.on('connection', socket => {
    connectedPeers[socket.id] = socket;

    socket.on('offer', (id, description) => {
        connectedPeers[id].emit('offer', socket.id, description);
    });

    socket.on('answer', (id, description) => {
        connectedPeers[id].emit('answer', socket.id, description);
    });

    socket.on('candidate', (id, candidate) => {
        connectedPeers[id].emit('candidate', socket.id, candidate);
    });

    socket.on('disconnect', () => {
        delete connectedPeers[socket.id];
        socket.broadcast.emit('disconnectPeer', socket.id);
    });

    socket.on('skip', () => {
        socket.broadcast.emit('disconnectPeer', socket.id);
        delete connectedPeers[socket.id];
        socket.disconnect();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
