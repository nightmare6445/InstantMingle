const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const skipButton = document.getElementById('skipButton');

let localStream;
let peerConnection;
let socket = io();

const constraints = {
  video: true,
  audio: true
};

async function startStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    localVideo.srcObject = localStream;
  } catch (error) {
    console.error('Error accessing media devices.', error);
  }
}

startButton.addEventListener('click', () => {
  startStream().then(() => {
    socket.emit('ready', { gender: document.getElementById('gender').value, preference: document.getElementById('preference').value });
  });
});

skipButton.addEventListener('click', () => {
  socket.emit('skip');
  resetCall();
});

function resetCall() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteVideo.srcObject = null;
}

socket.on('offer', async (id, description) => {
  peerConnection = new RTCPeerConnection();
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('candidate', id, event.candidate);
    }
  };
  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };
  await peerConnection.setRemoteDescription(description);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', id, peerConnection.localDescription);
});

socket.on('answer', async (description) => {
  await peerConnection.setRemoteDescription(description);
});

socket.on('candidate', async (candidate) => {
  try {
    await peerConnection.addIceCandidate(candidate);
  } catch (error) {
    console.error('Error adding received ICE candidate', error);
  }
});

socket.on('disconnectPeer', () => {
  resetCall();
});
