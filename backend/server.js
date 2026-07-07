/**
 * server.js
 * ---------------------------------------------------------------
 * Backend for code-collab. Three responsibilities live on this one
 * HTTP server, each on its own path so they don't collide:
 *
 *   1. Express REST API        -> /api/execute   (Judge0 proxy)
 *   2. Socket.io               -> /socket.io/*   (room presence +
 *                                                   WebRTC signaling)
 *   3. Raw WebSocket (y-websocket) -> /yjs/*       (Yjs CRDT sync for
 *                                                   the Monaco editor)
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

// -----------------------------------------------------------------
// Express app + REST routes
// -----------------------------------------------------------------
const app = express();

// Open CORS for public client applications (Vercel, GitHub Pages, etc.)
app.use(cors({ origin: "*", credentials: false }));
app.use(express.json({ limit: "2mb" })); 

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api", judge0Router);

const httpServer = http.createServer(app);

// -----------------------------------------------------------------
// Socket.io: room presence + WebRTC signaling
// -----------------------------------------------------------------
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/socket.io", 
});

io.on("connection", (socket) => {
  console.log(`[socket.io] client connected: ${socket.id}`);

  let currentRoom = null;
  let currentUsername = null;

  // ---- Room join/leave -----------------------------------------
  socket.on("room:join", ({ roomId, username }) => {
    currentRoom = roomId;
    currentUsername = username || `Guest-${socket.id.slice(0, 4)}`;

    socket.join(roomId);
    const users = roomManager.joinRoom(roomId, socket.id, currentUsername);

    socket.to(roomId).emit("room:peer-joined", { socketId: socket.id, username: currentUsername });
    io.to(roomId).emit("room:users", users);
  });

  socket.on("room:leave", () => {
    if (!currentRoom) return;
    roomManager.leaveRoom(currentRoom, socket.id);
    socket.to(currentRoom).emit("room:peer-left", { socketId: socket.id });
    io.to(currentRoom).emit("room:users", roomManager.getUsers(currentRoom));
    socket.leave(currentRoom);
    currentRoom = null;
  });

  // ---- Code execution broadcast ---------------------------------
  socket.on("terminal:broadcast", ({ roomId, result }) => {
    socket.to(roomId).emit("terminal:result", result);
  });

  // ---- WebRTC signaling ------------------------------------------
  socket.on("webrtc:signal", ({ to, from, signal }) => {
    io.to(to).emit("webrtc:signal", { from, signal });
  });

  // ---- Whiteboard sync -------------------------------------------
  socket.on("whiteboard:update", ({ roomId, snapshot }) => {
    socket.to(roomId).emit("whiteboard:update", snapshot);
  });

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

// -----------------------------------------------------------------
// Yjs WebSocket server, mounted at /yjs
// -----------------------------------------------------------------
const yjsWss = new WebSocketServer({ noServer: true });

yjsWss.on("connection", (conn, req) => {
  setupWSConnection(conn, req);
});

// Manually route "upgrade" requests
httpServer.on("upgrade", (req, socket, head) => {
  // FIXED: Safer URL route detection that avoids parsing errors from proxy routing headers
  if (req.url && req.url.startsWith("/yjs")) {
    yjsWss.handleUpgrade(req, socket, head, (ws) => {
      yjsWss.emit("connection", ws, req);
    });
  }
});

// Listening configuration optimized for Render container environment
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Production server running securely on port ${PORT}`);
});
