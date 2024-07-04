// main.js
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const skipButton = document.getElementById('skipButton');

let localStream;
let remoteStream;
let peerConnection;
const config = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

startButton.onclick = start;
skipButton.onclick = skip;

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = stream;
    })
    .catch(error => {
        console.error('Error accessing media devices.', error);
    });

const socket = io();

socket.on('connect', () => {
    console.log('Connected to signaling server');
});

socket.on('offer', (id, description) => {
    peerConnection = new RTCPeerConnection(config);
    peerConnection.setRemoteDescription(description);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.createAnswer()
        .then(sdp => peerConnection.setLocalDescription(sdp))
        .then(() => {
            socket.emit('answer', id, peerConnection.localDescription);
        });
    peerConnection.ontrack = event => {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
    };
});

socket.on('answer', (description) => {
    peerConnection.setRemoteDescription(description);
});

socket.on('candidate', (id, candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('disconnectPeer', (id) => {
    peerConnection.close();
    remoteVideo.srcObject = null;
    console.log(`Peer ${id} disconnected`);
});

function start() {
    peerConnection = new RTCPeerConnection(config);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.ontrack = event => {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
    };
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('candidate', socket.id, event.candidate);
        }
    };
    peerConnection.createOffer()
        .then(sdp => peerConnection.setLocalDescription(sdp))
        .then(() => {
            socket.emit('offer', socket.id, peerConnection.localDescription);
        });
}

function skip() {
    socket.emit('skip');
}
