import React, { useEffect, useRef } from "react";

export default function VideoTile({ username, isLocal, muted, stream, isVideoOn = true }) {
  const videoRef = useRef(null);

  // We determine if we should VISUALLY show the video
  const showVideo = stream && isVideoOn;

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement && stream) {
      // Re-assign only if the stream object actually changed
      if (videoElement.srcObject !== stream) {
        videoElement.srcObject = stream;
      }
      
      // Auto-play the media to ensure audio is flowing
      videoElement.play().catch((err) => {
        console.warn("Autoplay blocked by browser. User must interact with the page.", err);
      });
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
      <div style={styles.videoContainer}>
        
        {/* THE LAYER TRICK: Video is ALWAYS rendered to keep audio alive.
            We just make it invisible (opacity: 0) when the camera is off. */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // MUST be true for local to prevent echo
          style={{
            ...styles.video,
            opacity: showVideo ? 1 : 0, 
            transform: isLocal ? "scaleX(-1)" : "none", 
          }}
        />

        {/* Fallback avatar layered OVER the hidden video */}
        {!showVideo && (
          <div style={styles.avatarFallbackWrapper}>
            <div style={styles.avatarFallback}>{initials}</div>
          </div>
        )}
        
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
  tile: { display: "flex", flexDirection: "column", gap: 8, background: "var(--bg-tertiary)", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border-color)" },
  videoContainer: { position: "relative", width: "100%", aspectRatio: "16/9", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" },
  
  video: { 
    width: "100%", 
    height: "100%", 
    objectFit: "cover",
    position: "absolute", // Absolute positioning ensures it layers nicely
    top: 0,
    left: 0
  },
  
  // Wrapper ensures the avatar is centered on top of the black background
  avatarFallbackWrapper: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1, 
    background: "#000" // Ensures black background behind the avatar
  },
  avatarFallback: { width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #cba6f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#11111b" },
  
  overlay: { position: "absolute", bottom: 8, left: 8, right: 8, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 },
  nameBadge: { background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: 4, fontSize: 11, color: "white", textShadow: "0 1px 2px rgba(0,0,0,0.8)" },
  mutedBadge: { background: "rgba(231, 76, 60, 0.8)", padding: "2px 4px", borderRadius: 4, fontSize: 10 }
};
