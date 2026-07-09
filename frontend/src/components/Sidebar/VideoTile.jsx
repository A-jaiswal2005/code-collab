import React, { useEffect, useRef } from "react";

export default function VideoTile({ username, isLocal, muted, stream, isVideoOn = true }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null); // NEW: Dedicated reference for audio

  const showVideo = stream && isVideoOn;

  useEffect(() => {
    if (stream) {
      // 1. Attach stream to the Video element (Visuals only)
      if (videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Video autoplay prevented", e));
      }
      
      // 2. Attach stream to the Audio element (Sound only)
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
        
        {/* NEW: Dedicated Audio tag. 
            Only muted if this is the LOCAL user (to stop feedback loops). */}
        <audio 
          ref={audioRef} 
          autoPlay 
          playsInline 
          muted={isLocal} 
        />

        {/* Video tag. 
            Muted is ALWAYS true here because the <audio> tag handles the sound. */}
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

// (Keep your existing styles object here)
