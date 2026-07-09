import React, { useEffect, useRef } from "react";

export default function VideoTile({ username, isLocal, muted, stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
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
      {/* THE NEW VIDEO PLAYER */}
      <div style={styles.videoContainer}>
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal} // MUST BE TRUE FOR LOCAL USER TO PREVENT ECHO
            style={{
              ...styles.video,
              transform: isLocal ? "scaleX(-1)" : "none", // Mirrors local video
            }}
          />
        ) : (
          <div style={styles.avatarFallback}>{initials}</div>
        )}
        
        {/* OVERLAY TAGS */}
        <div style={styles.overlay}>
          <span style={styles.nameBadge}>
            {username} {isLocal && "(you)"}
          </span>
          {muted && <span style={styles.mutedBadge}>🔇</span>}
        </div>
      </div>
    </div>
  );
}

const styles = {
  tile: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    background: "var(--bg-tertiary)",
    borderRadius: "var(--radius)",
    overflow: "hidden",
    border: "1px solid var(--border-color)",
  },
  videoContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: "16/9", // Standard widescreen aspect ratio
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover", // Ensures the video fills the box without stretching
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--accent), #cba6f7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    fontWeight: 700,
    color: "#11111b",
  },
  overlay: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameBadge: {
    background: "rgba(0,0,0,0.6)",
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 11,
    color: "white",
    textShadow: "0 1px 2px rgba(0,0,0,0.8)",
  },
  mutedBadge: {
    background: "rgba(231, 76, 60, 0.8)",
    padding: "2px 4px",
    borderRadius: 4,
    fontSize: 10,
  }
};
