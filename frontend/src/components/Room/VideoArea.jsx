// VideoArea.jsx
// Requires: npm install @livekit/components-react @livekit/components-styles livekit-client lucide-react
import { useEffect, useState, useCallback } from "react";
import { useRoom } from "../../context/RoomContext.jsx";
import {
  LiveKitRoom,
  useTracks,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  Chat,
  useLocalParticipant,
  useRoomContext,
  LayoutContextProvider,
} from "@livekit/components-react";
import { Track, MediaDeviceFailure } from "livekit-client";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  MessageSquare,
  PhoneOff,
} from "lucide-react";
import "@livekit/components-styles";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://code-collab-n4p0.onrender.com";
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || "wss://code-collab-05ybur4t.livekit.cloud";

// ---------------------------------------------------------------------------
// Custom vertical video grid (Camera + ScreenShare tracks only)
// ---------------------------------------------------------------------------
function CustomVideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div style={styles.gridWrapper}>
      {/* Force GridLayout's internal CSS grid into a single vertical column,
          since it renders inside a narrow sidebar rather than a full page. */}
      <style>{`
        .sidebar-video-grid.lk-grid-layout {
          display: flex !important;
          flex-direction: column !important;
          gap: 8px !important;
          height: auto !important;
        }
        .sidebar-video-grid .lk-participant-tile {
          width: 100% !important;
          aspect-ratio: 16 / 9;
          flex-shrink: 0;
          border-radius: 8px;
          overflow: hidden;
        }
      `}</style>
      <GridLayout tracks={tracks} className="sidebar-video-grid">
        <ParticipantTile />
      </GridLayout>
      {tracks.length === 0 && (
        <p style={styles.emptyStateText}>Waiting for participants…</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sliding chat drawer (overlay, doesn't disturb the flex layout underneath)
// ---------------------------------------------------------------------------
function SlidingChat({ isOpen, onClose }) {
  return (
    <div
      style={{
        ...styles.chatDrawer,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
      }}
      aria-hidden={!isOpen}
    >
      <div style={styles.chatHeader}>
        <span style={styles.chatHeaderTitle}>Chat</span>
        <button
          style={styles.chatCloseButton}
          onClick={onClose}
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>
      <div style={styles.chatBody}>
        <Chat style={{ height: "100%" }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bottom control bar: Mic / Camera / ScreenShare / Chat toggle + Leave button
// ---------------------------------------------------------------------------
function ControlBar({ isChatOpen, onToggleChat }) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const room = useRoomContext();

  const toggleMic = () => localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled);
  const toggleCamera = () => localParticipant?.setCameraEnabled(!isCameraEnabled);
  const toggleScreenShare = () =>
    localParticipant?.setScreenShareEnabled(!isScreenShareEnabled);

  const handleLeave = useCallback(async () => {
    try {
      await room.disconnect();
    } finally {
      window.location.reload();
    }
  }, [room]);

  return (
    <div style={styles.controlsContainer}>
      <div style={styles.controlsRow}>
        <button
          style={{
            ...styles.iconButton,
            backgroundColor: isMicrophoneEnabled ? "#313244" : "#f38ba8",
          }}
          onClick={toggleMic}
          aria-label="Toggle microphone"
        >
          {isMicrophoneEnabled ? (
            <Mic size={20} color="#cdd6f4" />
          ) : (
            <MicOff size={20} color="#11111b" />
          )}
        </button>

        <button
          style={{
            ...styles.iconButton,
            backgroundColor: isCameraEnabled ? "#313244" : "#f38ba8",
          }}
          onClick={toggleCamera}
          aria-label="Toggle camera"
        >
          {isCameraEnabled ? (
            <Video size={20} color="#cdd6f4" />
          ) : (
            <VideoOff size={20} color="#11111b" />
          )}
        </button>

        <button
          style={{
            ...styles.iconButton,
            backgroundColor: isScreenShareEnabled ? "#89b4fa" : "#313244",
          }}
          onClick={toggleScreenShare}
          aria-label="Toggle screen share"
        >
          <ScreenShare size={20} color={isScreenShareEnabled ? "#11111b" : "#cdd6f4"} />
        </button>

        <button
          style={{
            ...styles.iconButton,
            backgroundColor: isChatOpen ? "#89b4fa" : "#313244",
          }}
          onClick={onToggleChat}
          aria-label="Toggle chat"
        >
          <MessageSquare size={20} color={isChatOpen ? "#11111b" : "#cdd6f4"} />
        </button>
      </div>

      <button style={styles.leaveButton} onClick={handleLeave}>
        <PhoneOff size={18} style={{ marginRight: 8 }} />
        Leave Meeting
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Everything that needs to live *inside* <LiveKitRoom>
// ---------------------------------------------------------------------------
function RoomContent() {
  const [isChatOpen, setChatOpen] = useState(false);

  return (
    <LayoutContextProvider>
      <div style={styles.roomContentWrapper}>
        <CustomVideoGrid />
        <SlidingChat isOpen={isChatOpen} onClose={() => setChatOpen(false)} />
      </div>

      <ControlBar
        isChatOpen={isChatOpen}
        onToggleChat={() => setChatOpen((v) => !v)}
      />

      <RoomAudioRenderer />
    </LayoutContextProvider>
  );
}

// ---------------------------------------------------------------------------
// Top-level export: fetches token, then mounts the LiveKit room
// ---------------------------------------------------------------------------
export default function VideoArea() {
  const { roomId, username } = useRoom(); // Grab them from context!
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState(LIVEKIT_URL);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchToken() {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/livekit/getToken?roomId=${encodeURIComponent(
            roomId
          )}&username=${encodeURIComponent(username)}`
        );
        if (!res.ok) throw new Error(`Token request failed (${res.status})`);
        const data = await res.json();
        if (!cancelled) {
          setToken(data.token);
          if (data.serverUrl) setServerUrl(data.serverUrl);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to fetch LiveKit token.");
      }
    }

    if (roomId && username) fetchToken();
    return () => {
      cancelled = true;
    };
  }, [roomId, username]);

  // Handles hardware errors (permission denied, device in use, not found)
  // instead of letting LiveKit throw an uncaught exception on mount.
  const handleMediaDeviceFailure = useCallback((failure) => {
    console.error("LiveKit media device failure:", failure);
    
    let message = "A hardware error occurred.";
    if (failure === MediaDeviceFailure.PermissionDenied) {
      message = "Camera/mic permission denied or timed out.";
    } else if (failure === MediaDeviceFailure.NotFound) {
      message = "No camera or microphone was found.";
    } else if (failure === MediaDeviceFailure.DeviceInUse) {
      message = "Your camera is already in use by another app.";
    }

    alert(`${message}\n\nIf you just turned your camera off, wait 3 seconds for your hardware to reset before turning it back on.`);
    
    // REMOVED: setError(message); 
  }, []);

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>⚠ {error}</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>Connecting to room…</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={false}
      audio={false}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      onMediaDeviceFailure={handleMediaDeviceFailure}
      onDisconnected={() => window.location.reload()}
      data-lk-theme="default"
      style={styles.liveKitRoom}
    >
      <RoomContent />
    </LiveKitRoom>
  );
}

// ---------------------------------------------------------------------------
// Styles — dark theme
// ---------------------------------------------------------------------------
const styles = {
  liveKitRoom: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    backgroundColor: "#11111b",
    position: "relative",
    overflow: "hidden",
  },
  roomContentWrapper: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    minHeight: 0,
  },
  gridWrapper: {
    height: "100%",
    width: "100%",
    overflowY: "auto",
    padding: "8px",
    boxSizing: "border-box",
    backgroundColor: "#11111b",
  },
  emptyStateText: {
    color: "#6c7086",
    fontSize: "13px",
    textAlign: "center",
    marginTop: "24px",
  },
  controlsContainer: {
    flexShrink: 0,
    backgroundColor: "#181825",
    borderTop: "1px solid #313244",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  controlsRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
  },
  iconButton: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "40px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#313244",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  leaveButton: {
    width: "100%",
    height: "44px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#f38ba8",
    color: "#11111b",
    fontWeight: 700,
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  chatDrawer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "#181825",
    borderLeft: "1px solid #313244",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.28s ease",
    zIndex: 20,
    boxShadow: "-4px 0 16px rgba(0,0,0,0.4)",
  },
  chatHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #313244",
    flexShrink: 0,
  },
  chatHeaderTitle: {
    color: "#cdd6f4",
    fontWeight: 600,
    fontSize: "14px",
  },
  chatCloseButton: {
    background: "none",
    border: "none",
    color: "#cdd6f4",
    fontSize: "16px",
    cursor: "pointer",
    lineHeight: 1,
  },
  chatBody: {
    flex: 1,
    overflowY: "auto",
    padding: "0 8px",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    backgroundColor: "#11111b",
  },
  loadingText: { color: "#cdd6f4", fontSize: "14px" },
  errorContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    backgroundColor: "#11111b",
    padding: "16px",
    textAlign: "center",
  },
  errorText: { color: "#f38ba8", fontSize: "14px" },
};