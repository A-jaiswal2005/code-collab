import React, { useEffect, useRef } from "react";

export default function VideoTile({ username, isLocal, muted, stream, isVideoOn = true }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null); 

  const showVideo = stream && isVideoOn;

  useEffect(() => {
    if (stream) {
      if (videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Video autoplay prevented", e));
      }
      
      if (audioRef.current && audioRef.current.srcObject !== stream) {
        audioRef.current.srcObject = stream;
        audioRef.current.play().catch(e => console.warn("Audio autoplay prevented", e));
      }
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
        
        <audio 
          ref={audioRef} 
          autoPlay 
          playsInline 
          muted={isLocal} 
        />

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={true} 
          style={{
            ...styles.video,
            opacity: showVideo ? 1 : 0, 
            transform: isLocal ? "scaleX(-1)" : "none", 
          }}
        />

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

// FIXED: Added the styles object back!
const styles = {
  tile: { display: "flex", flexDirection: "column", gap: 8, background: "var(--bg-tertiary)", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border-color)" },
  videoContainer: { position: "relative", width: "100%", aspectRatio: "16/9", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" },
  video: { 
    width: "100%", 
    height: "100%", 
    objectFit: "cover",
    position: "absolute", 
    top: 0,
    left: 0
  },
  avatarFallbackWrapper: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1, 
    background: "#000" 
  },
  avatarFallback: { width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #cba6f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#11111b" },
  overlay: { position: "absolute", bottom: 8, left: 8, right: 8, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 },
  nameBadge: { background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: 4, fontSize: 11, color: "white", textShadow: "0 1px 2px rgba(0,0,0,0.8)" },
  mutedBadge: { background: "rgba(231, 76, 60, 0.8)", padding: "2px 4px", borderRadius: 4, fontSize: 10 }
};
