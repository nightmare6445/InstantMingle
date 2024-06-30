const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html from the root
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let waitingUsers = [];

io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('join', ({ gender, preference }) => {
        const user = { id: socket.id, gender, preference };
        const match = findMatch(user);

        if (match) {
            const roomId = uuidv4();
            socket.join(roomId);
            io.to(match.id).emit('roomId', roomId);
            io.to(socket.id).emit('roomId', roomId);
        } else {
            waitingUsers.push(user);
        }
    });

    socket.on('message', ({ roomId, message }) => {
        io.to(roomId).emit('message', message);
    });

    socket.on('offer', ({ roomId, offer }) => {
        io.to(roomId).emit('offer', offer);
    });

    socket.on('answer', ({ roomId, answer }) => {
        io.to(roomId).emit('answer', answer);
    });

    socket.on('ice-candidate', ({ roomId, candidate }) => {
        io.to(roomId).emit('ice-candidate', candidate);
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
