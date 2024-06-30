console.log('main.js loaded');

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
let localStream;
let peerConnection;

const socket = io();

const constraints = {
    video: true,
    audio: true
};

navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        console.log('Got MediaStream:', stream);
        localVideo.srcObject = stream;
        localStream = stream;
    })
    .catch(error => {
        console.error('Error accessing media devices.', error);
    });

const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);
    console.log('Created RTCPeerConnection');

    peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
            console.log('Sending ICE candidate:', candidate);
            socket.emit('ice-candidate', { candidate });
        }
    };

    peerConnection.ontrack = event => {
        console.log('Received remote stream:', event.streams[0]);
        remoteVideo.srcObject = event.streams[0];
    };

    localStream.getTracks().forEach(track => {
        console.log('Adding local track:', track);
        peerConnection.addTrack(track, localStream);
    });
}

socket.on('roomId', roomId => {
    console.log('Received roomId:', roomId);
});

socket.on('offer', async ({ offer }) => {
    console.log('Received offer:', offer);
    if (!peerConnection) createPeerConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { answer });
});

socket.on('answer', async ({ answer }) => {
    console.log('Received answer:', answer);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', async ({ candidate }) => {
    if (candidate) {
        console.log('Adding received ICE candidate:', candidate);
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
});

document.getElementById('startButton').addEventListener('click', () => {
    console.log('Start button clicked');
    const gender = document.getElementById('gender').value;
    const preference = document.getElementById('preference').value;
    socket.emit('join', { gender, preference });
    if (!peerConnection) createPeerConnection();
    peerConnection.createOffer()
        .then(offer => {
            console.log('Created offer:', offer);
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            socket.emit('offer', { offer: peerConnection.localDescription });
        });
});

document.getElementById('skipButton').addEventListener('click', () => {
    console.log('Skip button clicked');
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    const gender = document.getElementById('gender').value;
    const preference = document.getElementById('preference').value;
    socket.emit('join', { gender, preference });
});
