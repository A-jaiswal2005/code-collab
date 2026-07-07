import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

const RoomContext = createContext(null);

export function RoomProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [username, setUsername] = useState(null);
  const [users, setUsers] = useState([]); // [{ socketId, username }]

  // Create the socket once on mount. autoConnect:false lets us defer
  // the actual connection until the user joins/creates a room.
  useEffect(() => {
    const socket = io(BACKEND_URL, {
      path: "/socket.io",
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("room:users", (roster) => setUsers(roster));

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback((id, name) => {
    const socket = socketRef.current;
    if (!socket.connected) socket.connect();

    setRoomId(id);
    setUsername(name);

    // Wait for the transport to be ready before emitting join.
    const doJoin = () => socket.emit("room:join", { roomId: id, username: name });
    if (socket.connected) doJoin();
    else socket.once("connect", doJoin);
  }, []);

  const leaveRoom = useCallback(() => {
    const socket = socketRef.current;
    socket.emit("room:leave");
    setRoomId(null);
    setUsers([]);
  }, []);

  const value = {
    socket: socketRef.current,
    connected,
    roomId,
    username,
    users,
    joinRoom,
    leaveRoom,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used within a RoomProvider");
  return ctx;
}
