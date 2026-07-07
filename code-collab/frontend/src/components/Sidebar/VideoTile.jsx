import React, { useEffect, useRef } from "react";

/**
 * VideoTile
 * ---------------------------------------------------------------
 * Since this app is voice-only (no camera), each tile renders an
 * avatar with the user's initials instead of a <video> element, and
 * a hidden <audio> element plays the remote stream (if any).
 * ---------------------------------------------------------------
 */
export default function VideoTile({ username, isLocal, muted, stream }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  const initials = (username || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div style={styles.tile}>
      <div style={styles.avatar}>{initials}</div>
      <div style={styles.nameRow}>
        <span style={styles.name}>
          {username} {isLocal && <span style={styles.youTag}>(you)</span>}
        </span>
        {muted && <span title="Muted" style={styles.mutedIcon}>🔇</span>}
      </div>

      {/* Remote audio is never rendered for the local user (would echo) */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
    </div>
  );
}

const styles = {
  tile: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: "var(--radius)",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-color)",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--accent), #cba6f7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    color: "#11111b",
    flexShrink: 0,
  },
  nameRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 13,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  youTag: { color: "var(--text-secondary)", fontSize: 11 },
  mutedIcon: { fontSize: 12 },
};
