import React from "react";
import VideoTile from "./VideoTile.jsx";
import { useRoom } from "../../context/RoomContext.jsx";
import { useWebRTC } from "../../hooks/useWebRTC.js";

export default function Sidebar() {
  const { users, socket, leaveRoom } = useRoom();
  
  const { 
    localStream, 
    remoteStreams, 
    muted, 
    toggleMute, 
    cameraOff, 
    toggleCamera, 
    micError,
    remoteCameraStates // Grab the new state here
  } = useWebRTC();

  return (
    <aside style={styles.wrapper}>
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span>Participants ({users.length})</span>
          
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={styles.muteBtn} onClick={toggleCamera}>
              {cameraOff ? "📷 (Off)" : "📸"}
            </button>
            <button style={styles.muteBtn} onClick={toggleMute}>
              {muted ? "🔇" : "🎙️"}
            </button>
          </div>
        </div>

        <div style={styles.tileList}>
          {users.map((u) => {
            const isLocal = u.socketId === socket?.id;
            
            // Determine if the video should be shown based on local/remote logic
            const isVideoOn = isLocal 
              ? !cameraOff 
              // If it's a remote user, check their state. Default to true if undefined.
              : (remoteCameraStates[u.socketId] ?? true);
            
            return (
              <VideoTile
                key={u.socketId}
                username={u.username}
                isLocal={isLocal}
                muted={isLocal ? muted : false} 
                stream={isLocal ? localStream : remoteStreams[u.socketId]}
                isVideoOn={isVideoOn} // Pass the calculated boolean
              />
            );
          })}
        </div>

        {micError && <p style={styles.micWarning}>Media unavailable: {micError}</p>}
      </div>

      <button style={styles.leaveBtn} onClick={leaveRoom}>
        Leave Room
      </button>
    </aside>
  );
}

// (Keep your existing styles object here)
