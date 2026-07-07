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
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// -----------------------------------------------------------------
// Express app + REST routes
// -----------------------------------------------------------------
const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "2mb" })); // generous limit for larger source files

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api", judge0Router);

const httpServer = http.createServer(app);

// -----------------------------------------------------------------
// Socket.io: room presence + WebRTC signaling
// -----------------------------------------------------------------
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
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
  // Optional: broadcast run results to everyone in the room so all
  // collaborators see the terminal output, not just the runner.
  socket.on("terminal:broadcast", ({ roomId, result }) => {
    socket.to(roomId).emit("terminal:result", result);
  });

  // ---- WebRTC signaling (used by simple-peer on the client) ------
  // simple-peer just needs an arbitrary transport to exchange SDP
  // offers/answers and ICE candidates - Socket.io works well here.
  socket.on("webrtc:signal", ({ to, from, signal }) => {
    io.to(to).emit("webrtc:signal", { from, signal });
  });

  // ---- Whiteboard sync (lightweight broadcast) -------------------
  // The Yjs/y-websocket layer already syncs the editor; for the
  // whiteboard we broadcast tldraw's own change events directly
  // through Socket.io for simplicity.
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
  // setupWSConnection reads the room name from the URL path, e.g.
  // ws://host/yjs/<roomId> -> docName "<roomId>"
  setupWSConnection(conn, req);
});

// Manually route "upgrade" requests: anything under /yjs goes to the
// Yjs websocket server; everything else (e.g. /socket.io) is left
// alone so Engine.IO's own upgrade handler can pick it up.
httpServer.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (pathname.startsWith("/yjs")) {
    yjsWss.handleUpgrade(req, socket, head, (ws) => {
      yjsWss.emit("connection", ws, req);
    });
  }
  // Note: no `else socket.destroy()` here - Socket.io/Engine.IO
  // registers its own "upgrade" listener on this same httpServer
  // and will handle the /socket.io path itself.
});

httpServer.listen(PORT, () => {
  console.log(`code-collab backend listening on port ${PORT}`);
  console.log(`  - REST API:        http://localhost:${PORT}/api`);
  console.log(`  - Socket.io:       ws://localhost:${PORT}/socket.io`);
  console.log(`  - Yjs websocket:   ws://localhost:${PORT}/yjs/<roomId>`);
});
