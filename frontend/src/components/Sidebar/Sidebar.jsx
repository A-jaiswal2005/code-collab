import React from "react";
import VideoTile from "./VideoTile.jsx";
import { useRoom } from "../../context/RoomContext.jsx";
import { useWebRTC } from "../../hooks/useWebRTC.js";

export default function Sidebar() {
  // Removed roomId, username, and onRunCode/terminal props since they moved elsewhere
  const { users, socket, leaveRoom } = useRoom();
  const { remoteStreams, muted, toggleMute, micError } = useWebRTC();

  return (
    <aside style={styles.wrapper}>
      {/* --- Participant gallery --- */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span>Participants ({users.length})</span>
          <button style={styles.muteBtn} onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
            {muted ? "🔇" : "🎙️"}
          </button>
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

        {micError && <p style={styles.micWarning}>Mic unavailable: {micError}</p>}
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
    flex: 1 // Allows the participant section to take available space
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
    marginTop: "auto", // Anchors the button to the bottom of the sidebar
  },
};
