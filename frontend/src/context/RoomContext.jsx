import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://code-collab-n4p0.onrender.com";

const RoomContext = createContext(null);

export function RoomProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [username, setUsername] = useState(null);
  const [users, setUsers] = useState([]); // [{ socketId, username }]

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

  // NEW: Dedicated createRoom method for admins
  const createRoom = useCallback((id, name, callback) => {
    const socket = socketRef.current;
    if (!socket.connected) socket.connect();

    const doCreate = () => {
      socket.emit("room:create", { roomId: id, username: name }, (response) => {
        if (response && response.success) {
          // Only update local state if the server successfully created it
          setRoomId(id);
          setUsername(name);
        }
        if (callback) callback(response);
      });
    };

    if (socket.connected) doCreate();
    else socket.once("connect", doCreate);
  }, []);

  // UPDATED: joinRoom method with server validation
  const joinRoom = useCallback((id, name, callback) => {
    const socket = socketRef.current;
    if (!socket.connected) socket.connect();

    const doJoin = () => {
      socket.emit("room:join", { roomId: id, username: name }, (response) => {
        if (response && response.success) {
          // Only update local state if the server allows entry
          setRoomId(id);
          setUsername(name);
        }
        if (callback) callback(response);
      });
    };

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
    createRoom, // Exported to use in RoomJoin.jsx
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
