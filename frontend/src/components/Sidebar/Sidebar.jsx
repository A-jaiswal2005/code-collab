import React from "react";
import VideoTile from "./VideoTile.jsx";
import Terminal from "./Terminal.jsx";
import { useRoom } from "../../context/RoomContext.jsx";
import { useWebRTC } from "../../hooks/useWebRTC.js";

export default function Sidebar({ onRunCode, running, result, error }) {
  const { users, username, socket, roomId, leaveRoom } = useRoom();
  const { remoteStreams, muted, toggleMute, micError } = useWebRTC();

  const copyRoomCode = () => {
    navigator.clipboard?.writeText(roomId);
  };

  return (
    <aside style={styles.wrapper}>
      {/* --- Room info --- */}
      <div style={styles.roomBox}>
        <div style={styles.roomLabel}>Room Code</div>
        <div style={styles.roomCodeRow}>
          <code style={styles.roomCode}>{roomId}</code>
          <button style={styles.copyBtn} onClick={copyRoomCode} title="Copy room code">
            ⧉
          </button>
        </div>
      </div>

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

      {/* --- Run code --- */}
      <button style={styles.runBtn} onClick={onRunCode} disabled={running}>
        {running ? "Running..." : "▶ Run Code"}
      </button>

      {/* --- Terminal --- */}
      <div style={styles.terminalContainer}>
        <Terminal running={running} result={result} error={error} />
      </div>

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
  roomBox: {
    background: "var(--bg-panel)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius)",
    padding: "10px 12px",
  },
  roomLabel: { fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 },
  roomCodeRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  roomCode: { fontSize: 14, color: "var(--accent)" },
  copyBtn: { background: "transparent", color: "var(--text-secondary)", fontSize: 14 },
  section: { display: "flex", flexDirection: "column", gap: 8, minHeight: 0 },
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
  },
  tileList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowY: "auto",
    maxHeight: 220,
  },
  micWarning: { fontSize: 11, color: "var(--warning)" },
  runBtn: {
    background: "var(--success)",
    color: "#11111b",
    fontWeight: 700,
    fontSize: 14,
    padding: "12px",
    borderRadius: "var(--radius)",
  },
  terminalContainer: { flex: 1, minHeight: 180 },
  leaveBtn: {
    background: "transparent",
    border: "1px solid var(--danger)",
    color: "var(--danger)",
    padding: "8px",
    borderRadius: "var(--radius)",
    fontSize: 13,
  },
};
