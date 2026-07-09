import React, { useRef, useState } from "react";
import CodeEditor from "../Editor/CodeEditor.jsx";
import Terminal from "../Editor/Terminal.jsx"; 
import Whiteboard from "../Whiteboard/Whiteboard.jsx";
import Sidebar from "../Sidebar/Sidebar.jsx";
import { useRoom } from "../../context/RoomContext.jsx";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://code-collab-n4p0.onrender.com";

export default function MainLayout() {
  const { socket, roomId } = useRoom();
  const [view, setView] = useState("editor"); 
  const [language, setLanguage] = useState("cpp");
  
  // Execution states
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [stdin, setStdin] = useState(""); 

  const editorRef = useRef(null);

  const copyRoomCode = () => {
    navigator.clipboard?.writeText(roomId);
  };

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
        body: JSON.stringify({ language, code, stdin }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Execution failed.");
      } else {
        setResult(data);
        socket?.emit("terminal:broadcast", { roomId, result: data });
      }
    } catch (err) {
      setError(err.message || "Network error while contacting the execution server.");
    } finally {
      setRunning(false);
    }
  };

  React.useEffect(() => {
    if (!socket) return undefined;
    const handler = (incoming) => setResult(incoming);
    socket.on("terminal:result", handler);
    return () => socket.off("terminal:result", handler);
  }, [socket]);

  return (
    <div style={styles.container}>
      <header style={styles.topbar}>
        <div style={styles.brandGroup}>
          <div style={styles.brand}>code-collab</div>
          <div style={styles.roomBadge}>
            <span style={styles.roomTag}>#{roomId}</span>
            <button style={styles.copyBtn} onClick={copyRoomCode} title="Copy Room Code">⧉</button>
          </div>
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
        {/* Editor now gets flex: 4 (taking up much more space) */}
        <main style={{ ...styles.workspace, flex: view === "editor" ? 4 : 5 }}>
          <div style={{ display: view === "editor" ? "block" : "none", height: "100%" }}>
            <CodeEditor 
              language={language} 
              onLanguageChange={setLanguage} 
              editorRef={editorRef} 
              onRunCode={handleRunCode}
              running={running}
            />
          </div>
          <div style={{ display: view === "whiteboard" ? "block" : "none", height: "100%" }}>
            <Whiteboard />
          </div>
        </main>

        {view === "editor" && (
          <div style={styles.terminalWrapper}>
            <Terminal 
              running={running} 
              result={result} 
              error={error} 
              stdin={stdin}
              setStdin={setStdin}
            />
          </div>
        )}

        <div style={styles.sidebarWrapper}>
          <Sidebar />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)", flexShrink: 0 },
  brandGroup: { display: "flex", alignItems: "center", gap: 12 },
  brand: { fontWeight: 700, fontSize: 15, color: "var(--accent)" },
  roomBadge: { display: "flex", alignItems: "center", gap: 6, background: "var(--bg-panel, #11111b)", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border-color)" },
  roomTag: { color: "var(--text-secondary)", fontWeight: 400, fontSize: 12 },
  copyBtn: { background: "transparent", color: "var(--text-secondary)", fontSize: 14, cursor: "pointer", border: "none", padding: 0 },
  toggleGroup: { display: "flex", gap: 6, background: "var(--bg-tertiary)", padding: 4, borderRadius: 8 },
  toggleBtn: { background: "transparent", color: "var(--text-secondary)", padding: "6px 14px", borderRadius: 6, fontSize: 13, cursor: "pointer", border: "none" },
  toggleActive: { background: "var(--accent)", color: "#11111b", fontWeight: 600 },
  body: { display: "flex", flex: 1, minHeight: 0 },
  workspace: { minWidth: 0, borderRight: "1px solid var(--border-color)" },
  
  // Terminal now gets a much smaller flex ratio
  terminalWrapper: { flex: 1.2, borderRight: "1px solid var(--border-color)", minWidth: 280, maxWidth: 450 },
  
  sidebarWrapper: { width: "260px", flexShrink: 0 },
};
