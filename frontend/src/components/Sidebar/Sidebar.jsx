import React from "react";
import VideoTile from "./VideoTile.jsx";
import { useRoom } from "../../context/RoomContext.jsx";
import { useWebRTC } from "../../hooks/useWebRTC.js";

export default function Sidebar() {
  const { users, socket, leaveRoom } = useRoom();
  
  const { 
    remoteStreams, 
    localStream, // 1. GRAB YOUR LOCAL STREAM HERE
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
          {users.map((u) => {
            const isLocal = u.socketId === socket?.id;

            return (
              <VideoTile
                key={u.socketId}
                username={u.username}
                isLocal={isLocal}
                muted={isLocal ? muted : false}
                // 2. PASS LOCAL STREAM FOR YOU, REMOTE FOR OTHERS
                stream={isLocal ? localStream : remoteStreams[u.socketId]}
                // 3. PASS THE CAMERA TOGGLE STATE FOR YOUR TILE
                isVideoOn={isLocal ? !cameraOff : true}
              />
            );
          })}
        </div>

        {micError && <p style={styles.micWarning}>Media unavailable: {micError}</p>}
      </div>

      {/* --- Leave Room --- */}
      <button style={styles.leaveBtn} onClick={leaveRoom}>
        Leave Room
      </button>
    </aside>
  );
}

// ... your styles remain exactly the same
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
