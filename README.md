💻 Code-Collab
A real-time, fully-featured collaborative coding environment built for teams, interviews, and hackathons. It features a shared Monaco code editor (powered by Yjs CRDTs), an infinite collaborative whiteboard (tldraw), robust peer-to-peer video/audio chat (WebRTC), and one-click code execution via a secure Online Compiler API proxy.

✨ Key Features
Real-time Code Sync: Conflict-free collaborative typing using yjs, y-websocket, and y-monaco.

Video & Audio Chat: Peer-to-peer communication via WebRTC (simple-peer).

Includes dynamic camera toggling with fallback avatars.

Layered audio/video architecture to prevent browser media throttling.

Active Speaker Highlighting: Real-time microphone frequency analysis (Web Audio API) to visually highlight who is speaking.

Live Whiteboard: Fully integrated tldraw canvas synchronized via Socket.io.

Integrated Execution: Secure proxy execution for C++ and Python (and more) via an online compiler API.

🏗 Architecture
Plaintext
┌─────────────────────┐        ┌──────────────────────────────────┐
│   React (Vite) SPA  │        │        Node.js backend           │
│                     │        │                                  │
│  MainLayout         │  REST  │  Express  --> /api/execute       │
│  ├─ CodeEditor      │◄──────►│               (Compiler API)     │
│  │   (Monaco+yjs)   │  ws    │  Socket.io --> /socket.io        │
│  ├─ Whiteboard      │◄──────►│    - room presence               │
│  │   (tldraw)       │        │    - WebRTC signaling            │
│  └─ Sidebar         │  ws    │    - UI state broadcast (cameras)│
│      ├─ VideoTiles  │◄──────►│    - whiteboard broadcast        │
│      ├─ Run Code btn│        │                                  │
│      └─ Terminal    │        │  y-websocket --> /yjs/<roomId>   │
└─────────────────────┘        └──────────────────────────────────┘
Code sync: The backend hosts a dedicated websocket endpoint at /yjs/<roomId> for Yjs CRDT synchronization.

Whiteboard sync: tldraw store diffs are broadcast over the existing Socket.io connection (whiteboard:update).

Media / WebRTC: Full-mesh topology. Socket.io handles the initial signaling (webrtc:signal), and also broadcasts UI state changes (like someone turning off their camera) so the React frontend can instantly render fallback avatars.

Code execution: The backend safely proxies requests to the online compiler API so your private API keys never leak to the browser client (POST /api/execute).

🚀 Quick Start (Docker)
Copy the backend env file and add your compiler API credentials:

Bash
cp backend/.env.example backend/.env
# Edit backend/.env and set your COMPILER_API_URL and API KEY
Spin everything up using Docker Compose:

Bash
docker-compose up --build
Open the app: http://localhost:5173

Backend health check: http://localhost:4000/health

🛠 Local Development (Without Docker)
1. Backend

Bash
cd backend
cp .env.example .env   # Add your Compiler API credentials here
npm install
npm run dev            # Starts nodemon, restarts on file change
2. Frontend

Bash
cd frontend
npm install
npm run dev            # Starts Vite dev server on port :5173
By default, the frontend expects the backend at http://localhost:4000 and the Yjs websocket at ws://localhost:4000/yjs. You can override these by creating a .env file in the frontend/ directory (using VITE_BACKEND_URL and VITE_YWEBSOCKET_URL).

⚙️ Online Compiler API Setup
This scaffold is built to integrate with standard online compiler execution endpoints. To enable the "Run Code" functionality:

Obtain your API credentials from your chosen provider.

Put the credentials in your backend/.env file.

Ensure backend/routes/compiler.js (or your equivalent route file) reads these environment variables to inject the required authentication headers before proxying the payload.

🗺 Roadmap & Future Improvements
This project is highly functional but leaves room for production-level hardening. Things to refine:

Authentication & Room Privacy: Rooms currently rely on URL IDs. Add a password layer or JWT authentication for private sessions.

Database Persistence: Yjs docs and whiteboard states live in memory. Wire up y-leveldb or a database (like PostgreSQL/MongoDB) if you need code to survive server restarts.

TURN Server Integration: The WebRTC hook currently relies on default STUN configuration. To guarantee video chat works behind strict corporate firewalls, add a TURN server (e.g., coturn).

Whiteboard Reconciliation: Implement snapshot caching on the backend so newly-joined clients instantly receive the current board state without waiting for a new stroke.

AI Analyzer: Implement LLM-based time/space complexity analysis directly inside the code editor toolbar.

Production Rate Limiting: Add basic rate-limiting to /api/execute to prevent abuse.

📂 Project Structure
Plaintext
code-collab/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── server.js              # Express + Socket.io + Yjs ws + API proxy
│   ├── routes/compiler.js     # Compiler execution proxy route
│   └── utils/roomManager.js
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── App.jsx
        ├── context/RoomContext.jsx
        ├── hooks/
        │   ├── useYjs.js
        │   ├── useWebRTC.js       # WebRTC signaling and media toggles
        │   └── useAudioLevel.js   # Web Audio API for active speaker detection
        └── components/
            ├── Room/RoomJoin.jsx
            ├── Layout/MainLayout.jsx
            ├── Editor/CodeEditor.jsx
            ├── Whiteboard/Whiteboard.jsx
            └── Sidebar/
                ├── Sidebar.jsx
                ├── VideoTile.jsx  # Complex media layering & UI state
                └── Terminal.jsx
