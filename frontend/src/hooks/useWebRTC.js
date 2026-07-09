import { useCallback, useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import { useRoom } from "../context/RoomContext.jsx";

export function useWebRTC() {
  const { socket, roomId, users } = useRoom();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); 
  
  const [muted, setMuted] = useState(false);
  const [micError, setMicError] = useState(null);
  
  // NEW: State to track if the camera is off
  const [cameraOff, setCameraOff] = useState(false);

  const peersRef = useRef({}); 

  // ---- Acquire microphone & camera ---------------------------------
  useEffect(() => {
    let stream;
    navigator.mediaDevices
      ?.getUserMedia({ audio: true, video: true }) // You were already requesting video here, which is great!
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

  const createPeer = useCallback(
    (remoteSocketId, initiator) => {
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
      peer.on("error", (err) => {
        console.warn(`Peer ${remoteSocketId} error:`, err.message);
        cleanupPeer(remoteSocketId);
      });

      peersRef.current[remoteSocketId] = peer;
      return peer;
    },
    [localStream, socket]
  );

  const cleanupPeer = (socketId) => {
    peersRef.current[socketId]?.destroy();
    delete peersRef.current[socketId];
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  };

  // ---- Signaling event wiring -------------------------------------
  useEffect(() => {
    if (!socket || !localStream) return undefined;

    const onPeerJoined = ({ socketId }) => {
      if (peersRef.current[socketId]) return;
      createPeer(socketId, true);
    };

    const onSignal = ({ from, signal }) => {
      let peer = peersRef.current[from];
      if (!peer) {
        peer = createPeer(from, false);
      }
      peer?.signal(signal);
    };

    const onPeerLeft = ({ socketId }) => cleanupPeer(socketId);

    socket.on("room:peer-joined", onPeerJoined);
    socket.on("webrtc:signal", onSignal);
    socket.on("room:peer-left", onPeerLeft);

    return () => {
      socket.off("room:peer-joined", onPeerJoined);
      socket.off("webrtc:signal", onSignal);
      socket.off("room:peer-left", onPeerLeft);
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
    return () => {
      Object.keys(peersRef.current).forEach(cleanupPeer);
    };
  }, [roomId]);

  // ---- Toggles ---------------------------------------------------
  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const nextMuted = !muted;
    localStream.getAudioTracks().forEach((track) => (track.enabled = !nextMuted));
    setMuted(nextMuted);
  }, [localStream, muted]);

  // NEW: Toggle function for the camera
  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const nextCameraOff = !cameraOff;
    // Get all video tracks and enable/disable them
    localStream.getVideoTracks().forEach((track) => (track.enabled = !nextCameraOff));
    setCameraOff(nextCameraOff);
  }, [localStream, cameraOff]);

  // NEW: Make sure to export cameraOff and toggleCamera at the bottom!
  return { 
    localStream, 
    remoteStreams, 
    muted, 
    toggleMute, 
    cameraOff, 
    toggleCamera, 
    micError 
  };
}
