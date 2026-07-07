import React, { useRef, useState } from "react";
import CodeEditor from "../Editor/CodeEditor.jsx";
import Whiteboard from "../Whiteboard/Whiteboard.jsx";
import Sidebar from "../Sidebar/Sidebar.jsx";
import { useRoom } from "../../context/RoomContext.jsx";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://code-collab-n4p0.onrender.com";

export default function MainLayout() {
  const { socket, roomId } = useRoom();
  const [view, setView] = useState("editor"); // "editor" | "whiteboard"
  const [language, setLanguage] = useState("cpp");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const editorRef = useRef(null);

  const handleRunCode = async () => {
    const code = editorRef.current?.getValue();
    if (!code) return;

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Execution failed.");
      } else {
        setResult(data);
        // Let everyone else in the room see the result too.
        socket?.emit("terminal:broadcast", { roomId, result: data });
      }
    } catch (err) {
      setError(err.message || "Network error while contacting the execution server.");
    } finally {
      setRunning(false);
    }
  };

  // Show run results broadcast by other collaborators.
  React.useEffect(() => {
    if (!socket) return undefined;
    const handler = (incoming) => setResult(incoming);
    socket.on("terminal:result", handler);
    return () => socket.off("terminal:result", handler);
  }, [socket]);

  return (
    <div style={styles.container}>
      <header style={styles.topbar}>
        <div style={styles.brand}>
          code-collab <span style={styles.roomTag}>#{roomId}</span>
        </div>
        <div style={styles.toggleGroup}>
          <button
            style={{ ...styles.toggleBtn, ...(view === "editor" ? styles.toggleActive : {}) }}
            onClick={() => setView("editor")}
          >
            {"</>"} Code Editor
          </button>
          <button
            style={{ ...styles.toggleBtn, ...(view === "whiteboard" ? styles.toggleActive : {}) }}
            onClick={() => setView("whiteboard")}
          >
            ✏️ Whiteboard
          </button>
        </div>
      </header>

      <div style={styles.body}>
        {/* Left panel: 80% */}
        <main style={styles.workspace}>
          <div style={{ display: view === "editor" ? "block" : "none", height: "100%" }}>
            <CodeEditor language={language} onLanguageChange={setLanguage} editorRef={editorRef} />
          </div>
          <div style={{ display: view === "whiteboard" ? "block" : "none", height: "100%" }}>
            <Whiteboard />
          </div>
        </main>

        {/* Right panel: 20% */}
        <div style={styles.sidebarWrapper}>
          <Sidebar onRunCode={handleRunCode} running={running} result={result} error={error} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 18px",
    background: "var(--bg-secondary)",
    borderBottom: "1px solid var(--border-color)",
    flexShrink: 0,
  },
  brand: { fontWeight: 700, fontSize: 15, color: "var(--accent)" },
  roomTag: { color: "var(--text-secondary)", fontWeight: 400, fontSize: 12 },
  toggleGroup: { display: "flex", gap: 6, background: "var(--bg-tertiary)", padding: 4, borderRadius: 8 },
  toggleBtn: {
    background: "transparent",
    color: "var(--text-secondary)",
    padding: "6px 14px",
    borderRadius: 6,
    fontSize: 13,
  },
  toggleActive: { background: "var(--accent)", color: "#11111b", fontWeight: 600 },
  body: { display: "flex", flex: 1, minHeight: 0 },
  workspace: { width: "80%", minWidth: 0, borderRight: "1px solid var(--border-color)" },
  sidebarWrapper: { width: "20%", minWidth: 280 },
};
