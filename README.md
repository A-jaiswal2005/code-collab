# 💻 Code-Collab

A real-time, fully-featured collaborative coding environment built for teams, interviews, and hackathons. It features a shared Monaco code editor (powered by Yjs CRDTs), an infinite collaborative whiteboard (tldraw), robust peer-to-peer video/audio chat (WebRTC), and one-click code execution via a secure Online Compiler API proxy.

### ✨ Key Features
* **Real-time Code Sync:** Conflict-free collaborative typing using `yjs`, `y-websocket`, and `y-monaco`.
* **Video & Audio Chat:** Peer-to-peer communication via WebRTC (`simple-peer`).
  * Includes dynamic camera toggling with fallback avatars.
  * Layered audio/video architecture to prevent browser media throttling.
  * **Active Speaker Highlighting:** Real-time microphone frequency analysis (Web Audio API) to visually highlight who is speaking.
* **Live Whiteboard:** Fully integrated `tldraw` canvas synchronized via Socket.io.
* **Integrated Execution:** Secure proxy execution for C++ and Python (and more) via an online compiler API.

---

## 🏗 Architecture

```text
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
