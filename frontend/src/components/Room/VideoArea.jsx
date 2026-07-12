import React, { useEffect, useState } from 'react';
import '@livekit/components-styles';
import { 
  LiveKitRoom, 
  GridLayout, 
  ParticipantTile, 
  ControlBar, 
  RoomAudioRenderer, 
  useTracks,
  Chat,
  LayoutContextProvider
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useRoom } from "../../context/RoomContext.jsx";

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

function CustomVideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  return (
    <div style={styles.gridContainer}>
      <GridLayout tracks={tracks} style={styles.gridLayout}>
        <ParticipantTile />
      </GridLayout>
    </div>
  );
}

function VideoArea() {
  const { roomId, username } = useRoom();
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!roomId || !username) return;

    const fetchToken = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/livekit/getToken?roomId=${roomId}&username=${username}`);
        const data = await response.json();
        setToken(data.token);
      } catch (e) {
        console.error("Failed to fetch LiveKit token", e);
      }
    };

    fetchToken();
  }, [roomId, username]);

  // Completely leaves the room and goes back to the home screen
  const handleLeaveRoom = () => {
    // Navigating away automatically unmounts LiveKit and drops the call
    window.location.reload();
  };

  if (!token) {
    return (
      <div style={styles.loadingContainer}>
        Connecting to secure video server...
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={true} 
      audio={true} 
      token={token}
      serverUrl={LIVEKIT_URL}
      data-lk-theme="default"
      style={styles.liveKitContainer}
      videoCaptureDefaults={{
        resolution: { width: 640, height: 480, frameRate: 24 }
      }}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
    >
      <LayoutContextProvider>
        
        {/* The Video Feeds */}
        <CustomVideoGrid />
        
        {/* The Chat UI */}
        <Chat style={styles.chatOverlay} />

        {/* The Controls Area */}
        <div style={styles.controlsWrapper}>
          
          {/* LiveKit Controls: Notice leave is set to false */}
          <ControlBar 
            variation="minimal" 
            controls={{ chat: true, screenShare: true, camera: true, microphone: true, leave: false }} 
          />

          {/* Big Custom Leave Button below the 4 main controls */}
          <button style={styles.leaveButton} onClick={handleLeaveRoom}>
            Leave Meeting
          </button>
          
        </div>

      </LayoutContextProvider>

      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

const styles = {
  loadingContainer: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: '100%', 
    color: 'var(--text-secondary)' 
  },
  liveKitContainer: { 
    display: 'flex', 
    flexDirection: 'column', 
    height: '100%', 
    width: '100%',
    position: 'relative'
  },
  gridContainer: { 
    flex: 1, 
    overflowY: 'auto', 
    padding: '8px',
    display: 'flex',
    flexDirection: 'column'
  },
  gridLayout: {
    display: 'flex',
    flexDirection: 'column', 
    gap: '8px',
    flex: 1
  },
  chatOverlay: {
    maxHeight: '50%', 
    borderTop: '1px solid var(--border-color)'
  },
  
  // Updated Controls Wrapper to stack items vertically
  controlsWrapper: {
    padding: '16px 12px',
    background: 'var(--bg-tertiary, #181825)',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column', // Stacks ControlBar and Leave Button
    alignItems: 'center',
    gap: '12px' // Space between the 4 icons and the leave button
  },
  
  // Custom Leave Button Styles
  leaveButton: {
    width: '100%', // Makes it stretch across the sidebar
    padding: '10px 0',
    backgroundColor: '#ef4444', // Red color
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};

export default React.memo(VideoArea);