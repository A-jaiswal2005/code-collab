import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRoom } from "../../context/RoomContext.jsx";

export default function RoomJoin() {
  const { joinRoom, createRoom } = useRoom(); 
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false); // Track transition state

  const handleCreate = () => {
    if (!name.trim()) return setError("Enter a display name first.");
    setError(""); 
    setIsJoining(true); // Trigger transition
    
    const newRoomId = uuidv4().slice(0, 8);
    
    // Delay the actual creation to let the animation play
    setTimeout(() => {
      createRoom(newRoomId, name.trim(), (response) => {
        if (!response.success) {
          setError(response.error);
          setIsJoining(false); // Revert if there's an error
        }
      });
    }, 400);
  };

  const handleJoin = () => {
    if (!name.trim()) return setError("Enter a display name first.");
    if (!roomCode.trim()) return setError("Enter a room code to join.");
    setError(""); 
    setIsJoining(true); // Trigger transition
    
    // Delay the actual join to let the animation play
    setTimeout(() => {
      joinRoom(roomCode.trim(), name.trim(), (response) => {
        if (!response.success) {
          setError(response.error);
          setIsJoining(false); // Revert if there's an error
        }
      });
    }, 400);
  };

  return (
    <div style={styles.wrapper}>
      <div 
        style={{
          ...styles.card,
          // Apply dynamic styles based on isJoining state
          opacity: isJoining ? 0 : 1,
          transform: isJoining ? "scale(0.95) translateY(10px)" : "scale(1) translateY(0)",
          pointerEvents: isJoining ? "none" : "auto", // Prevent double-clicks
        }}
      >
        <h1 style={styles.title}>code-collab</h1>
        <p style={styles.subtitle}>Real-time collaborative coding, whiteboarding &amp; voice chat.</p>

        <input
          style={styles.input}
          placeholder="Your display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isJoining}
        />

        <button 
          style={{ ...styles.primaryBtn, opacity: isJoining ? 0.7 : 1 }} 
          onClick={handleCreate}
          disabled={isJoining}
        >
          {isJoining ? "Joining..." : "+ Create a New Room"}
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
            disabled={isJoining}
          />
          <button 
            style={{ ...styles.secondaryBtn, opacity: isJoining ? 0.7 : 1 }} 
            onClick={handleJoin}
            disabled={isJoining}
          >
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
    // Add transition property for smooth animation
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)", 
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
    transition: "all 0.2s ease", // Added small transition for disabling
  },
  primaryBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: "var(--radius)",
    background: "var(--accent)",
    color: "#11111b",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    border: "none",
    transition: "all 0.2s ease", // Smooth state changes
  },
  secondaryBtn: {
    padding: "10px 18px",
    borderRadius: "var(--radius)",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
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