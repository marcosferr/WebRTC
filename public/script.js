const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const muteButton = document.getElementById("muteButton");
const videoButton = document.getElementById("videoButton");
const myPeer = new Peer(undefined, {
  host: "/",
  port: "3001",
});

// Create video element
const myVideo = document.createElement("video");
myVideo.muted = true;

// Create video container
const myVideoContainer = document.createElement("div");
myVideoContainer.className = "video-container";
myVideoContainer.appendChild(myVideo);

const peers = {};
let myStream = null;
let isAudioMuted = false;
let isVideoOff = false;

// Initialize media stream
navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myStream = stream;
    addVideoStream(myVideo, stream);

    // Handle incoming calls
    myPeer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      const videoContainer = document.createElement("div");
      videoContainer.className = "video-container";
      videoContainer.appendChild(video);

      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    // Handle new user connections
    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, stream);
    });
  })
  .catch((error) => {
    console.error("Error accessing media devices:", error);
    alert("Could not access camera or microphone. Please check permissions.");
  });

// Handle user disconnection
socket.on("user-disconnected", (userId) => {
  if (peers[userId]) peers[userId].close();
});

// When peer connection is established
myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
});

// Connect to a new user
function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement("video");
  const videoContainer = document.createElement("div");
  videoContainer.className = "video-container";
  videoContainer.appendChild(video);

  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });

  call.on("close", () => {
    videoContainer.remove();
  });

  peers[userId] = call;
}

// Add a video stream to the grid
function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });

  // If the video is not already in a container, create one
  if (video.parentElement === null) {
    const videoContainer = document.createElement("div");
    videoContainer.className = "video-container";
    videoContainer.appendChild(video);
    videoGrid.append(videoContainer);
  } else {
    // If it's already in a container, add the container to the grid
    if (video.parentElement.parentElement === null) {
      videoGrid.append(video.parentElement);
    }
  }
}

// Toggle audio mute
muteButton.addEventListener("click", () => {
  if (!myStream) return;

  const audioTracks = myStream.getAudioTracks();
  if (audioTracks.length === 0) return;

  isAudioMuted = !isAudioMuted;
  audioTracks[0].enabled = !isAudioMuted;

  // Update button appearance
  if (isAudioMuted) {
    muteButton.classList.add("off");
    muteButton.innerHTML = '<i class="fas fa-microphone-slash"></i>';
  } else {
    muteButton.classList.remove("off");
    muteButton.innerHTML = '<i class="fas fa-microphone"></i>';
  }
});

// Toggle video on/off
videoButton.addEventListener("click", () => {
  if (!myStream) return;

  const videoTracks = myStream.getVideoTracks();
  if (videoTracks.length === 0) return;

  isVideoOff = !isVideoOff;
  videoTracks[0].enabled = !isVideoOff;

  // Update button appearance
  if (isVideoOff) {
    videoButton.classList.add("off");
    videoButton.innerHTML = '<i class="fas fa-video-slash"></i>';
  } else {
    videoButton.classList.remove("off");
    videoButton.innerHTML = '<i class="fas fa-video"></i>';
  }
});
