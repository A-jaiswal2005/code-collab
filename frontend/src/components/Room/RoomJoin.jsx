import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useRoom } from "../../context/RoomContext.jsx";

export default function RoomJoin() {
  // Assuming you update useRoom to expose createRoom as well
  const { joinRoom, createRoom } = useRoom(); 
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return setError("Enter a display name first.");
    setError(""); // Clear previous errors
    
    const newRoomId = uuidv4().slice(0, 8);
    
    // Assuming createRoom accepts a callback to handle the response
    createRoom(newRoomId, name.trim(), (response) => {
      if (!response.success) setError(response.error);
    });
  };

  const handleJoin = () => {
    if (!name.trim()) return setError("Enter a display name first.");
    if (!roomCode.trim()) return setError("Enter a room code to join.");
    setError(""); 
    
    // Pass a callback to catch the "Invalid Room ID" error from the server
    joinRoom(roomCode.trim(), name.trim(), (response) => {
      if (!response.success) {
        setError(response.error);
      }
    });
  };

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
