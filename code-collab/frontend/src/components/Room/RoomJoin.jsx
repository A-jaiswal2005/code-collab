import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRoom } from "../../context/RoomContext.jsx";

export default function RoomJoin() {
  const { joinRoom } = useRoom();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return setError("Enter a display name first.");
    const newRoomId = uuidv4().slice(0, 8);
    joinRoom(newRoomId, name.trim());
  };

  const handleJoin = () => {
    if (!name.trim()) return setError("Enter a display name first.");
    if (!roomCode.trim()) return setError("Enter a room code to join.");
    joinRoom(roomCode.trim(), name.trim());
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>code-collab</h1>
        <p style={styles.subtitle}>Real-time collaborative coding, whiteboarding &amp; voice chat.</p>

        <input
          style={styles.input}
          placeholder="Your display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button style={styles.primaryBtn} onClick={handleCreate}>
          + Create a New Room
        </button>

        <div style={styles.divider}>
          <span>or join an existing room</span>
        </div>

        <div style={styles.joinRow}>
          <input
            style={{ ...styles.input, marginBottom: 0 }}
            placeholder="Room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
          />
          <button style={styles.secondaryBtn} onClick={handleJoin}>
            Join
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(circle at top, #232336, #11111b)",
  },
  card: {
    width: 420,
    padding: "32px",
    borderRadius: 12,
    background: "var(--bg-panel)",
    border: "1px solid var(--border-color)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
  },
  title: { margin: 0, fontSize: 28, color: "var(--accent)" },
  subtitle: { color: "var(--text-secondary)", marginTop: 8, marginBottom: 24, fontSize: 14 },
  input: {
    width: "100%",
    padding: "10px 12px",
    marginBottom: 16,
    borderRadius: "var(--radius)",
    border: "1px solid var(--border-color)",
    background: "var(--bg-tertiary)",
    color: "var(--text-primary)",
    fontSize: 14,
  },
  primaryBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: "var(--radius)",
    background: "var(--accent)",
    color: "#11111b",
    fontWeight: 600,
    fontSize: 14,
  },
  secondaryBtn: {
    padding: "10px 18px",
    borderRadius: "var(--radius)",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
    fontWeight: 600,
  },
  divider: {
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: 12,
    margin: "20px 0",
  },
  joinRow: { display: "flex", gap: 8 },
  error: { color: "var(--danger)", fontSize: 13, marginTop: 12 },
};
