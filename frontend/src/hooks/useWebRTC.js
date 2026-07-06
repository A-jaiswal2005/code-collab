import { useCallback, useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import { useRoom } from "../context/RoomContext.jsx";

/**
 * useWebRTC
 * ---------------------------------------------------------------
 * Sets up mic-only WebRTC voice chat between everyone in the room.
 * Socket.io (already connected for room presence) doubles as the
 * signaling transport for SDP offers/answers and ICE candidates -
 * see the `webrtc:signal` events on both client and server.
 *
 * Topology: full-mesh. Every pair of peers gets its own
 * RTCPeerConnection via simple-peer. Fine for small rooms (a
 * handful of people); for larger rooms you'd want an SFU instead.
 * ---------------------------------------------------------------
 */
export function useWebRTC() {
  const { socket, roomId, users } = useRoom();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // socketId -> MediaStream
  const [muted, setMuted] = useState(false);
  const [micError, setMicError] = useState(null);

  const peersRef = useRef({}); // socketId -> SimplePeer instance

  // ---- Acquire microphone ----------------------------------------
  useEffect(() => {
    let stream;
    navigator.mediaDevices
      ?.getUserMedia({ audio: true, video: false })
      .then((s) => {
        stream = s;
        setLocalStream(s);
      })
      .catch((err) => {
        console.warn("Microphone access denied/unavailable:", err.message);
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

    // A new peer joined the room after us -> we initiate the offer.
    const onPeerJoined = ({ socketId }) => {
      if (peersRef.current[socketId]) return;
      createPeer(socketId, true);
    };

    // We received a signal - either an offer (create peer as
    // non-initiator) or an answer/ICE candidate for an existing peer.
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

  // If we join a room that already has people in it, proactively
  // connect to everyone already present (room:users fires on join).
  useEffect(() => {
    if (!localStream || !socket) return;
    users.forEach((u) => {
      if (u.socketId !== socket.id && !peersRef.current[u.socketId]) {
        createPeer(u.socketId, true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, localStream]);

  // Cleanup all peers on unmount / room change
  useEffect(() => {
    return () => {
      Object.keys(peersRef.current).forEach(cleanupPeer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const nextMuted = !muted;
    localStream.getAudioTracks().forEach((track) => (track.enabled = !nextMuted));
    setMuted(nextMuted);
  }, [localStream, muted]);

  return { localStream, remoteStreams, muted, toggleMute, micError };
}