import React from "react";
import VideoTile from "./VideoTile.jsx";
import { useRoom } from "../../context/RoomContext.jsx";
import { useWebRTC } from "../../hooks/useWebRTC.js";

export default function Sidebar() {
  const { users, socket, leaveRoom } = useRoom();
  
  // NEW: Destructured cameraOff and toggleCamera from the hook
  const { 
    remoteStreams, 
    muted, 
    toggleMute, 
    cameraOff, 
    toggleCamera, 
    micError 
  } = useWebRTC();

  return (
    <aside style={styles.wrapper}>
      {/* --- Participant gallery --- */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span>Participants ({users.length})</span>
          
          {/* NEW: Grouped the toggle buttons in a flex row */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              style={styles.muteBtn} 
              onClick={toggleCamera} 
              title={cameraOff ? "Turn Camera On" : "Turn Camera Off"}
            >
              {cameraOff ? "📷 (Off)" : "📸"}
            </button>
            <button 
              style={styles.muteBtn} 
              onClick={toggleMute} 
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? "🔇" : "🎙️"}
            </button>
          </div>
        </div>

        <div style={styles.tileList}>
          {users.map((u) => (
            <VideoTile
              key={u.socketId}
              username={u.username}
              isLocal={u.socketId === socket?.id}
              muted={u.socketId === socket?.id ? muted : false}
              stream={remoteStreams[u.socketId]}
            />
          ))}
        </div>

        {micError && <p style={styles.micWarning}>Media unavailable: {micError}</p>}
      </div>

      {/* --- Leave Room (Pushed to bottom) --- */}
      <button style={styles.leaveBtn} onClick={leaveRoom}>
        Leave Room
      </button>
    </aside>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 14,
    background: "var(--bg-secondary)",
    borderLeft: "1px solid var(--border-color)",
    boxSizing: "border-box",
  },
  section: { 
    display: "flex", 
    flexDirection: "column", 
    gap: 8, 
    flex: 1 
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 12,
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
  muteBtn: {
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 13,
    cursor: "pointer",
  },
  tileList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowY: "auto",
  },
  micWarning: { 
    fontSize: 11, 
    color: "var(--warning)" 
  },
  leaveBtn: {
    background: "transparent",
    border: "1px solid var(--danger)",
    color: "var(--danger)",
    padding: "8px",
    borderRadius: "var(--radius)",
    fontSize: 13,
    cursor: "pointer",
    marginTop: "auto", 
  },
};
