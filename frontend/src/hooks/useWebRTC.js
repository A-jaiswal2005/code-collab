import { useCallback, useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import { useRoom } from "../context/RoomContext.jsx";

// ---- Media Fallback Utility ----
// Cascades through permissions so one denial doesn't crash the connection
async function getMediaWithFallback() {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  } catch (err1) {
    console.warn("Camera+Mic failed, trying video only...", err1.message);
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    } catch (err2) {
      console.warn("Video failed, trying mic only...", err2.message);
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (err3) {
        console.warn("All media failed. Joining as receive-only viewer.", err3.message);
        return null; // Signals viewer mode
      }
    }
  }
}

export function useWebRTC() {
  const { socket, roomId, users } = useRoom();
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); 
  
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [micError, setMicError] = useState(null);
  const [mediaReady, setMediaReady] = useState(false); // Tracks when fallback finishes

  // State to track remote users' camera status (socketId -> boolean)
  const [remoteCameraStates, setRemoteCameraStates] = useState({});

  const peersRef = useRef({}); 

  // ---- 1. Acquire Media ----
  useEffect(() => {
    let stream = null;
    
    getMediaWithFallback().then((s) => {
      stream = s;
      setLocalStream(s);
      setMediaReady(true); // Unlocks the signaling step
      
      if (!s) {
        setMicError("No camera/mic access. You joined as a viewer.");
        setCameraOff(true);
        setMuted(true);
      }
    });

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ---- 2. Peer Connection Logic ----
  const createPeer = useCallback((remoteSocketId, initiator) => {
    // THE FIX: We no longer return null if localStream is missing. 
    // We allow connection creation for receive-only viewers.

    const peer = new SimplePeer({
      initiator,
      trickle: true,
      ...(localStream ? { stream: localStream } : {}), // Only attach if it exists
    });

    peer.on("signal", (signal) => {
      socket.emit("webrtc:signal", { to: remoteSocketId, from: socket.id, signal });
    });

    peer.on("stream", (remoteStream) => {
      setRemoteStreams((prev) => ({ ...prev, [remoteSocketId]: remoteStream }));
    });

    peer.on("close", () => cleanupPeer(remoteSocketId));
    peer.on("error", (err) => cleanupPeer(remoteSocketId));

    peersRef.current[remoteSocketId] = peer;
    return peer;
  }, [localStream, socket]);

  const cleanupPeer = (socketId) => {
    peersRef.current[socketId]?.destroy();
    delete peersRef.current[socketId];
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
    setRemoteCameraStates((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  };

  // ---- 3. Socket Signaling ----
  useEffect(() => {
    // THE FIX: Wait for mediaReady instead of localStream
    if (!socket || !mediaReady) return undefined;

    const onPeerJoined = ({ socketId }) => {
      if (peersRef.current[socketId]) return;
      createPeer(socketId, true);
    };

    const onSignal = ({ from, signal }) => {
      let peer = peersRef.current[from];
      if (!peer) peer = createPeer(from, false);
      peer?.signal(signal);
    };

    const onPeerLeft = ({ socketId }) => cleanupPeer(socketId);

    const onPeerCameraChanged = ({ socketId, isVideoOn }) => {
      setRemoteCameraStates((prev) => ({ ...prev, [socketId]: isVideoOn }));
    };

    socket.on("room:peer-joined", onPeerJoined);
    socket.on("webrtc:signal", onSignal);
    socket.on("room:peer-left", onPeerLeft);
    socket.on("room:peer-camera-changed", onPeerCameraChanged);

    return () => {
      socket.off("room:peer-joined", onPeerJoined);
      socket.off("webrtc:signal", onSignal);
      socket.off("room:peer-left", onPeerLeft);
      socket.off("room:peer-camera-changed", onPeerCameraChanged);
    };
  }, [socket, mediaReady, createPeer]);

  useEffect(() => {
    // THE FIX: Wait for mediaReady instead of localStream
    if (!mediaReady || !socket) return;
    
    users.forEach((u) => {
      if (u.socketId !== socket.id && !peersRef.current[u.socketId]) {
        createPeer(u.socketId, true);
      }
    });
  }, [users, mediaReady, socket, createPeer]);

  useEffect(() => {
    return () => Object.keys(peersRef.current).forEach(cleanupPeer);
  }, [roomId]);

  // ---- 4. Media Toggles ----
  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = muted; 
      setMuted(!muted);
    }
  }, [localStream, muted]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    const nextCameraOff = !cameraOff;
    
    if (videoTrack) {
      videoTrack.enabled = cameraOff; 
    }
    
    setCameraOff(nextCameraOff);
    
    socket.emit("webrtc:camera-toggle", { 
      roomId, 
      isVideoOn: !nextCameraOff 
    });
  }, [localStream, cameraOff, socket, roomId]);

  return { 
    localStream, 
    remoteStreams, 
    muted, 
    toggleMute, 
    cameraOff, 
    toggleCamera, 
    micError,
    remoteCameraStates
  };
}
