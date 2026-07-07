# code-collab

A real-time collaborative coding platform: shared Monaco editor (Yjs CRDT sync),
collaborative whiteboard (tldraw), peer-to-peer voice chat (WebRTC/simple-peer),
and one-click code execution via Judge0.

## Architecture

```
┌─────────────────────┐        ┌──────────────────────────────────┐
│   React (Vite) SPA   │        │        Node.js backend            │
│                      │        │                                    │
│  MainLayout          │  REST  │  Express  --> /api/execute (Judge0)│
│  ├─ CodeEditor        │◄──────►│                                    │
│  │   (Monaco+y-monaco)│  ws    │  Socket.io --> /socket.io          │
│  ├─ Whiteboard        │◄──────►│    - room presence                │
│  │   (tldraw)         │        │    - WebRTC signaling              │
│  └─ Sidebar            │  ws    │    - whiteboard broadcast          │
│      ├─ VideoTiles     │◄──────►│                                    │
│      ├─ Run Code btn   │        │  y-websocket --> /yjs/<roomId>     │
│      └─ Terminal       │        │    - Yjs CRDT sync for the editor  │
└─────────────────────┘        └──────────────────────────────────┘
```

- **Code sync**: `yjs` + `y-websocket` + `y-monaco` give conflict-free
  collaborative typing. The backend hosts the sync endpoint at `/yjs/<roomId>`.
- **Whiteboard sync**: tldraw store diffs are broadcast over the existing
  Socket.io connection (see `whiteboard:update`).
- **Voice chat**: `simple-peer` (WebRTC) with Socket.io as the signaling
  transport (`webrtc:signal`). Full-mesh topology - fine for small rooms.
- **Code execution**: the backend proxies to the Judge0 API so your API key
  never touches the browser (`POST /api/execute`).

## Quick start (Docker)

1. Copy the backend env file and add your Judge0 API key:
   ```bash
   cp backend/.env.example backend/.env
   # edit backend/.env and set JUDGE0_API_KEY (get one from RapidAPI's Judge0 CE)
   ```
2. Spin everything up:
   ```bash
   docker-compose up --build
   ```
3. Open the app: **http://localhost:5173**
4. Backend health check: **http://localhost:4000/health**

> The `docker-compose.yml` reads `JUDGE0_API_URL` / `JUDGE0_API_KEY` /
> `JUDGE0_API_HOST` from your shell environment or an `.env` file placed next
> to `docker-compose.yml` (standard Docker Compose behavior).

## Local development (without Docker)

**Backend**
```bash
cd backend
cp .env.example .env   # fill in JUDGE0_API_KEY
npm install
npm run dev             # nodemon, restarts on change
```

**Frontend**
```bash
cd frontend
npm install
npm run dev              # Vite dev server on :5173
```

By default the frontend expects the backend at `http://localhost:4000` and the
Yjs websocket at `ws://localhost:4000/yjs`. Override via a `.env` file in
`frontend/` (`VITE_BACKEND_URL`, `VITE_YWEBSOCKET_URL`) if needed.

## Judge0 setup

This scaffold defaults to the public RapidAPI-hosted Judge0 CE instance. You
need a (free-tier) RapidAPI key:

1. Subscribe at https://rapidapi.com/judge0-official/api/judge0-ce
2. Put the key in `backend/.env` as `JUDGE0_API_KEY`.

Prefer self-hosting Judge0? Point `JUDGE0_API_URL` at your own instance and
drop the RapidAPI headers logic in `backend/routes/judge0.js` (it only adds
`X-RapidAPI-*` headers when `JUDGE0_API_KEY` is set).

## What's left for the remaining ~20%

This scaffold is intentionally complete-but-opinionated. Things you'll likely
want to refine:

- **Auth / room privacy** - rooms are just IDs right now; anyone with the code
  can join. Add a password or auth layer if needed.
- **Persistence** - Yjs docs and whiteboard state live in memory only (both
  on the backend and in `y-websocket`'s default in-memory persistence).
  Wire up `y-leveldb` / a database if you need docs to survive a restart.
- **TURN server** - the WebRTC hook uses default STUN-only ICE config, which
  works on most networks but will fail behind strict corporate NATs/firewalls.
  Add a TURN server (e.g. coturn) for reliability.
- **Whiteboard sync robustness** - the tldraw sync in `Whiteboard.jsx` is a
  simple diff-broadcast; there's no reconciliation for a client that
  reconnects mid-session (it won't get the current board until someone draws).
  Consider caching the last full snapshot per room on the backend and sending
  it to newly-joined clients.
- **More Judge0 languages** - only C++/Python are wired into the UI dropdown;
  the backend's `LANGUAGE_ID_MAP` already supports adding more.
- **Production hardening** - rate limiting on `/api/execute`, input size caps,
  and reconnect/backoff tuning for the socket layers.

## Project structure

```
code-collab/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── server.js              # Express + Socket.io + Yjs ws + Judge0 proxy
│   ├── routes/judge0.js
│   └── utils/roomManager.js
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── App.jsx
        ├── context/RoomContext.jsx
        ├── hooks/useYjs.js
        ├── hooks/useWebRTC.js
        └── components/
            ├── Room/RoomJoin.jsx
            ├── Layout/MainLayout.jsx
            ├── Editor/CodeEditor.jsx
            ├── Whiteboard/Whiteboard.jsx
            └── Sidebar/{Sidebar,VideoTile,Terminal}.jsx
```
