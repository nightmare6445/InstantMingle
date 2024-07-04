const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');

let localStream;
let remoteStream;
let peerConnection;
const servers = null;

const constraints = {
  video: true,
  audio: true
};

startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

function start() {
  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      localVideo.srcObject = stream;
      localStream = stream;
      socket.emit('join', 'room1');
    })
    .catch(error => {
      console.error('Error accessing media devices.', error);
    });
}

function call() {
  peerConnection = new RTCPeerConnection(servers);
  peerConnection.onicecandidate = handleIceCandidate;
  peerConnection.ontrack = handleRemoteStreamAdded;
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  
  peerConnection.createOffer()
    .then(sessionDescription => {
      peerConnection.setLocalDescription(sessionDescription);
      socket.emit('message', sessionDescription);
    })
    .catch(error => console.error('Error creating offer.', error));
}

function handleIceCandidate(event) {
  if (event.candidate) {
    socket.emit('message', {
      type: 'candidate',
      candidate: event.candidate
    });
  }
}

function handleRemoteStreamAdded(event) {
  remoteVideo.srcObject = event.streams[0];
}

function hangup() {
  peerConnection.close();
  peerConnection = null;
}

socket.on('message', message => {
  if (message.type === 'offer') {
    peerConnection = new RTCPeerConnection(servers);
    peerConnection.onicecandidate = handleIceCandidate;
    peerConnection.ontrack = handleRemoteStreamAdded;
    peerConnection.setRemoteDescription(new RTCSessionDescription(message));
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    
    peerConnection.createAnswer()
      .then(sessionDescription => {
        peerConnection.setLocalDescription(sessionDescription);
        socket.emit('message', sessionDescription);
      })
      .catch(error => console.error('Error creating answer.', error));
  } else if (message.type === 'answer') {
    peerConnection.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate') {
    const candidate = new RTCIceCandidate({
      sdpMLineIndex: message.candidate.sdpMLineIndex,
      candidate: message.candidate.candidate
    });
    peerConnection.addIce
