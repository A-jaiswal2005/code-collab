import React from "react";

/**
 * Terminal
 * ---------------------------------------------------------------
 * Displays the normalized result coming back from the backend's
 * /api/execute (Judge0) route: stdout, stderr, compile errors,
 * and status/timing metadata.
 * ---------------------------------------------------------------
 */
export default function Terminal({ running, result, error }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.dot} />
        <span style={styles.title}>Terminal</span>
        {running && <span style={styles.runningTag}>Running...</span>}
      </div>

      <div style={styles.body}>
        {!running && !result && !error && (
          <span style={styles.placeholder}>Output will appear here after you run your code.</span>
        )}

        {running && <span style={styles.placeholder}>Compiling &amp; executing on Judge0...</span>}

        {error && <pre style={{ ...styles.pre, color: "var(--danger)" }}>{error}</pre>}

        {result && !error && (
          <>
            {result.status?.description && (
              <div style={styles.statusRow}>
                <span
                  style={{
                    ...styles.statusBadge,
                    background: result.status.id === 3 ? "var(--success)" : "var(--danger)",
                  }}
                >
                  {result.status.description}
                </span>
                {result.time && <span style={styles.meta}>{result.time}s</span>}
                {result.memory && <span style={styles.meta}>{result.memory}KB</span>}
              </div>
            )}

            {result.compile_output && (
              <>
                <div style={styles.sectionLabel}>Compile Output</div>
                <pre style={{ ...styles.pre, color: "var(--warning)" }}>{result.compile_output}</pre>
              </>
            )}

            {result.stdout && (
              <>
                <div style={styles.sectionLabel}>stdout</div>
                <pre style={styles.pre}>{result.stdout}</pre>
              </>
            )}

            {result.stderr && (
              <>
                <div style={styles.sectionLabel}>stderr</div>
                <pre style={{ ...styles.pre, color: "var(--danger)" }}>{result.stderr}</pre>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
    borderRadius: "var(--radius)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    background: "var(--bg-secondary)",
    borderBottom: "1px solid var(--border-color)",
  },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "var(--danger)" },
  title: { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" },
  runningTag: { marginLeft: "auto", fontSize: 11, color: "var(--warning)" },
  body: {
    flex: 1,
    overflowY: "auto",
    padding: "10px 12px",
    fontFamily: "'Fira Code', Consolas, monospace",
    fontSize: 12,
  },
  placeholder: { color: "var(--text-secondary)", fontStyle: "italic" },
  pre: { whiteSpace: "pre-wrap", wordBreak: "break-word", margin: "4px 0 12px" },
  sectionLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "var(--text-secondary)",
    marginTop: 8,
  },
  statusRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  statusBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: "#11111b",
    padding: "2px 8px",
    borderRadius: 4,
  },
  meta: { fontSize: 11, color: "var(--text-secondary)" },
};
