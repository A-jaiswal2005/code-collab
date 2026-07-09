import React, { useEffect, useRef } from "react";

// ADDED: 'isVideoOn' prop (defaults to true) to handle the toggle accurately
export default function VideoTile({ username, isLocal, muted, stream, isVideoOn = true }) {
  const videoRef = useRef(null);

  // Determine if we should show the video element or the fallback
  const showVideo = stream && isVideoOn;

  useEffect(() => {
    const videoElement = videoRef.current;

    if (videoElement && showVideo) {
      videoElement.srcObject = stream;
      
      // FIX 1: Explicitly call play() to bypass strict browser autoplay policies
      videoElement.play().catch((error) => {
        console.error("Video playback failed:", error);
      });
    }

    // FIX 2: Cleanup the srcObject to prevent frozen frames or memory leaks
    return () => {
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [stream, showVideo]);

  const initials = (username || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div style={styles.tile}>
      <div style={styles.videoContainer}>
        
        {/* FIX 3: Use showVideo instead of just checking for stream */}
        {showVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal} 
            style={{
              ...styles.video,
              transform: isLocal ? "scaleX(-1)" : "none", 
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

// ... your styles object remains exactly the same
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
    aspectRatio: "16/9", 
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover", 
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
