import { useCallback, useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import { useRoom } from "../context/RoomContext.jsx";

export function useWebRTC() {
  const { socket, roomId, users } = useRoom();
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); 
  
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [micError, setMicError] = useState(null);

  // NEW: State to track remote users' camera status (socketId -> boolean)
  const [remoteCameraStates, setRemoteCameraStates] = useState({});

  const peersRef = useRef({}); 

  // ---- 1. Acquire Media ----
  useEffect(() => {
    let stream;
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((s) => {
        stream = s;
        setLocalStream(s);
      })
      .catch((err) => {
        console.warn("Media access denied/unavailable:", err.message);
        setMicError(err.message);
      });

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ---- 2. Peer Connection Logic ----
  const createPeer = useCallback((remoteSocketId, initiator) => {
    if (!localStream) return null;

    const peer = new SimplePeer({
      initiator,
      trickle: true,
      stream: localStream, 
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
    // Cleanup their camera state when they leave
    setRemoteCameraStates((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  };

  // ---- 3. Socket Signaling ----
  useEffect(() => {
    if (!socket || !localStream) return undefined;

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

    // NEW: Listen for remote camera toggles
    const onPeerCameraChanged = ({ socketId, isVideoOn }) => {
      setRemoteCameraStates((prev) => ({ ...prev, [socketId]: isVideoOn }));
    };

    socket.on("room:peer-joined", onPeerJoined);
    socket.on("webrtc:signal", onSignal);
    socket.on("room:peer-left", onPeerLeft);
    socket.on("room:peer-camera-changed", onPeerCameraChanged); // Bind new event

    return () => {
      socket.off("room:peer-joined", onPeerJoined);
      socket.off("webrtc:signal", onSignal);
      socket.off("room:peer-left", onPeerLeft);
      socket.off("room:peer-camera-changed", onPeerCameraChanged);
    };
  }, [socket, localStream, createPeer]);

  useEffect(() => {
    if (!localStream || !socket) return;
    users.forEach((u) => {
      if (u.socketId !== socket.id && !peersRef.current[u.socketId]) {
        createPeer(u.socketId, true);
      }
    });
  }, [users, localStream]);

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
      videoTrack.enabled = cameraOff; // Enable if it was off
    }
    
    setCameraOff(nextCameraOff);
    
    // NEW: Emit the state change to the backend so others see our avatar
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
    remoteCameraStates // NEW: Export this so Sidebar can use it
  };
}
