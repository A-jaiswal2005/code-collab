/**
 * server.js
 * ---------------------------------------------------------------
 * Backend for code-collab. Three responsibilities live on this one
 * HTTP server, each on its own path so they don't collide:
 *
 *   1. Express REST API        -> /api/execute   (Judge0 proxy)
 *   2. Socket.io               -> /socket.io/*   (room presence + WebRTC signaling)
 *   3. Raw WebSocket           -> /yjs/*         (Yjs CRDT sync)
 * ---------------------------------------------------------------
 */
require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const { WebSocketServer } = require("ws");
const { setupWSConnection } = require("y-websocket/bin/utils");

const judge0Router = require("./routes/judge0");
const roomManager = require("./utils/roomManager");

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors({ origin: "*", credentials: false }));
app.use(express.json({ limit: "2mb" })); 

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api", judge0Router);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/socket.io", 
});

io.on("connection", (socket) => {
  console.log(`[socket.io] client connected: ${socket.id}`);

  let currentRoom = null;
  let currentUsername = null;

  // ---- Room CREATE (Admin Only) --------------------------------
  socket.on("room:create", ({ roomId, username }, callback) => {
    currentUsername = username || `Guest-${socket.id.slice(0, 4)}`;
    
    // Call createRoom from your updated roomManager
    const result = roomManager.createRoom(roomId, socket.id, currentUsername);
    
    if (result.error) {
      if (typeof callback === "function") callback({ success: false, error: result.error });
      return;
    }

    currentRoom = roomId;
    socket.join(roomId);
    
    if (typeof callback === "function") callback({ success: true });
    io.to(roomId).emit("room:users", result.users);
  });

  // ---- Room JOIN (Strict Gatekeeper) ---------------------------
  socket.on("room:join", ({ roomId, username }, callback) => {
    currentUsername = username || `Guest-${socket.id.slice(0, 4)}`;
    
    // Call joinRoom from your updated roomManager
    const result = roomManager.joinRoom(roomId, socket.id, currentUsername);

    if (result.error) {
      // Reject entry, send error back to frontend
      if (typeof callback === "function") callback({ success: false, error: result.error });
      return;
    }

    currentRoom = roomId;
    socket.join(roomId);
    
    if (typeof callback === "function") callback({ success: true });

    socket.to(roomId).emit("room:peer-joined", { socketId: socket.id, username: currentUsername });
    io.to(roomId).emit("room:users", result.users);
  });

  // ---- Room leave ----------------------------------------------
  socket.on("room:leave", () => {
    if (!currentRoom) return;
    roomManager.leaveRoom(currentRoom, socket.id);
    socket.to(currentRoom).emit("room:peer-left", { socketId: socket.id });
    io.to(currentRoom).emit("room:users", roomManager.getUsers(currentRoom));
    socket.leave(currentRoom);
    currentRoom = null;
  });

  // ---- Broadcasts & Signaling ----------------------------------
  socket.on("terminal:broadcast", ({ roomId, result }) => {
    socket.to(roomId).emit("terminal:result", result);
  });

  socket.on("webrtc:signal", ({ to, from, signal }) => {
    io.to(to).emit("webrtc:signal", { from, signal });
  });

  socket.on("webrtc:camera-toggle", ({ roomId, isVideoOn }) => {
    socket.to(roomId).emit("room:peer-camera-changed", {
      socketId: socket.id,
      isVideoOn: isVideoOn
    });
  });

  socket.on("whiteboard:update", ({ roomId, snapshot }) => {
    socket.to(roomId).emit("whiteboard:update", snapshot);
  });

  // ---- Disconnect ----------------------------------------------
  socket.on("disconnect", () => {
    console.log(`[socket.io] client disconnected: ${socket.id}`);
    if (currentRoom) {
      roomManager.leaveRoom(currentRoom, socket.id);
      socket.to(currentRoom).emit("room:peer-left", { socketId: socket.id });
      io.to(currentRoom).emit("room:users", roomManager.getUsers(currentRoom));
    }
    roomManager.leaveAllRooms(socket.id);
  });
});

const yjsWss = new WebSocketServer({ noServer: true });

yjsWss.on("connection", (conn, req) => {
  setupWSConnection(conn, req);
});

httpServer.on("upgrade", (req, socket, head) => {
  if (req.url && req.url.startsWith("/yjs")) {
    yjsWss.handleUpgrade(req, socket, head, (ws) => {
      yjsWss.emit("connection", ws, req);
    });
  }
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Production server running securely on port ${PORT}`);
});
