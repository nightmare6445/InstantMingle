const socket = io();

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messages = document.getElementById('messages');
const startButton = document.getElementById('startButton');
const genderSelect = document.getElementById('gender');
const preferenceSelect = document.getElementById('preference');

let localStream;
let remoteStream;
let peerConnection;
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

async function startVideo() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
  } catch (error) {
    console.error('Error accessing media devices.', error);
  }
}

async function createPeerConnection(roomId) {
  peerConnection = new RTCPeerConnection(configuration);

  peerConnection.addEventListener('icecandidate', event => {
    if (event.candidate) {
      socket.emit('ice-candidate', { roomId, candidate: event.candidate });
    }
  });

  peerConnection.addEventListener('track', event => {
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream;
  });

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });
}

socket.on('roomId', async roomId => {
  await createPeerConnection(roomId);

  socket.on('message', message => {
    const newMessage = document.createElement('div');
    newMessage.textContent = message;
    messages.appendChild(newMessage);
  });

  socket.on('offer', async offer => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { roomId, answer });
  });

  socket.on('answer', async answer => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  });

  socket.on('ice-candidate', async ({ candidate }) => {
    try {
      await peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error adding received ice candidate', error);
    }
  });

  socket.emit('join', roomId);
});

sendButton.addEventListener('click', () => {
  const message = messageInput.value;
  const roomId = socket.roomId;
  socket.emit('message', { roomId, message });
  messageInput.value = '';
});

startButton.addEventListener('click', () => {
  const gender = genderSelect.value;
  const preference = preferenceSelect.value;
  socket.emit('join', { gender, preference });
  startVideo();
});
