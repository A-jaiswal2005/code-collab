import React, { useCallback, useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useYjs } from "../../hooks/useYjs.js";
import { useRoom } from "../../context/RoomContext.jsx";

const LANGUAGE_OPTIONS = [
  { label: "C++", value: "cpp" },
  { label: "Python", value: "python" },
];

const DEFAULT_SNIPPETS = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, code-collab!" << endl;\n    return 0;\n}\n`,
  python: `print("Hello, code-collab!")\n`,
};

// NEW: Added onRunCode and running to the props
export default function CodeEditor({ language, onLanguageChange, editorRef, onRunCode, running }) {
  const { roomId, username } = useRoom();
  const { ydoc, provider, status } = useYjs(roomId, username);
  const bindingRef = useRef(null);
  const monacoInstanceRef = useRef(null);
  const [editorReady, setEditorReady] = useState(false);

  // Yjs shared text type - every collaborator binds to the SAME
  // named text ("monaco") inside the shared doc, so edits merge.
  const getYText = useCallback(() => ydoc.getText("monaco"), [ydoc]);

  const handleEditorMount = (editor, monaco) => {
    monacoInstanceRef.current = monaco;
    editorRef.current = editor;
    setEditorReady(true);

    // Seed the doc with a starter snippet only if it's empty AND
    // we're the first client (avoids clobbering existing content).
    const yText = getYText();
    if (yText.length === 0) {
      yText.insert(0, DEFAULT_SNIPPETS[language] || "");
    }
  };

  // (Re)bind Monaco <-> Yjs whenever the provider becomes available.
  useEffect(() => {
    if (!editorReady || !provider || !monacoInstanceRef.current) return undefined;

    const editor = editorRef.current;
    const yText = getYText();

    bindingRef.current = new MonacoBinding(
      yText,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );

    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [editorReady, provider, getYText, editorRef]);

  return (
    <div 
      style={styles.wrapper}
      // --- THE FIX: Stop keystrokes from bubbling up to Tldraw ---
      onKeyDown={(e) => e.stopPropagation()} 
      onKeyUp={(e) => e.stopPropagation()}
      // -----------------------------------------------------------
    >
      <div style={styles.toolbar}>
        <select
          style={styles.select}
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        
        {/* NEW: Grouped the status indicator and Run button together */}
        <div style={styles.rightControls}>
          <span style={styles.status}>
            <span
              style={{
                ...styles.dot,
                background: status === "connected" ? "var(--success)" : "var(--warning)",
              }}
            />
            {status === "connected" ? "Synced" : "Connecting..."}
          </span>
          
          <button 
            onClick={onRunCode} 
            disabled={running}
            style={{
              ...styles.runBtn,
              opacity: running ? 0.7 : 1,
              cursor: running ? "not-allowed" : "pointer"
            }}
          >
            {running ? "Running..." : "▶ Run Code"}
          </button>
        </div>
      </div>

      <div style={styles.editorContainer}>
        <Editor
          height="100%"
          theme="vs-dark"
          language={language}
          defaultValue=""
          onMount={handleEditorMount}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
}

const styles = {
  wrapper: { display: "flex", flexDirection: "column", height: "100%" },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    background: "var(--bg-secondary)",
    borderBottom: "1px solid var(--border-color)",
  },
  select: {
    background: "var(--bg-tertiary)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 13,
    outline: "none",
  },
  rightControls: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  status: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "var(--text-secondary)",
  },
  dot: { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },
  runBtn: {
    background: "var(--success, #2ec271)",
    color: "#11111b",
    fontWeight: 700,
    fontSize: 13,
    padding: "6px 16px",
    borderRadius: "6px",
    border: "none",
    transition: "opacity 0.2s ease",
  },
  editorContainer: { flex: 1, minHeight: 0 },
};
