/**
 * server.js
 * ---------------------------------------------------------------
 * Backend for code-collab. Three responsibilities live on this one
 * HTTP server, each on its own path so they don't collide:
 *
 *   1. Express REST API        -> /api/execute   (Judge0 proxy)
 *   2. Socket.io                -> /socket.io/*   (room presence +
 *                                                   WebRTC signaling)
 *   3. Raw WebSocket (y-websocket) -> /yjs/*       (Yjs CRDT sync for
 *                                                   the Monaco editor)
 *
 * Yjs sync intentionally does NOT go through Socket.io: y-websocket
 * ships a battle-tested sync protocol (docs, awareness) that expects
 * a plain `ws` connection, so we mount it separately and let it
 * share the same HTTP server/port via the "upgrade" event.
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

// FIX 1: Open CORS for Express to allow Codespaces URLs to connect
app.use(cors({ origin: "*", credentials: false }));
app.use(express.json({ limit: "2mb" })); // generous limit for larger source files

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api", judge0Router);

const httpServer = http.createServer(app);

// -----------------------------------------------------------------
// Socket.io: room presence + WebRTC signaling
// -----------------------------------------------------------------
// FIX 2: Open CORS for Socket.io to allow Codespaces URLs to connect
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/socket.io", // explicit, so it never fights with /yjs upgrades
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

    // Tell everyone else in the room a new peer arrived (used to kick
    // off WebRTC offers) and send the joining user the current roster.
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
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (pathname.startsWith("/yjs")) {
    yjsWss.handleUpgrade(req, socket, head, (ws) => {
      yjsWss.emit("connection", ws, req);
    });
  }
});

// FIX 3: Bind to "0.0.0.0" so Docker exposes the port to Codespaces
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`code-collab backend listening on port ${PORT} (0.0.0.0)`);
  console.log(`  - REST API:        http://0.0.0.0:${PORT}/api`);
  console.log(`  - Socket.io:       ws://0.0.0.0:${PORT}/socket.io`);
  console.log(`  - Yjs websocket:   ws://0.0.0.0:${PORT}/yjs/<roomId>`);
});