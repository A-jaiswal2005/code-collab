import React, { useEffect, useState } from 'react';
import '@livekit/components-styles';
import { 
  LiveKitRoom, 
  GridLayout, 
  ParticipantTile, 
  ControlBar, 
  RoomAudioRenderer, 
  useTracks 
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useRoom } from "../../context/RoomContext.jsx";

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

// Custom grid that pulls only cameras and screen shares, organizing them vertically
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
    >
      {/* Video feeds take up the top portion */}
      <CustomVideoGrid />

      {/* Controls stay locked at the bottom, slimmed down to fit the sidebar */}
      <div style={styles.controlsContainer}>
        <ControlBar 
          variation="minimal" 
          controls={{ chat: false, screenShare: true, camera: true, microphone: true, leave: true }} 
        />
      </div>

      {/* Required to actually hear other people */}
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
    width: '100%' 
  },
  gridContainer: { 
    flex: 1, 
    overflowY: 'auto', 
    padding: '8px' 
  },
  gridLayout: {
    display: 'flex',
    flexDirection: 'column', // Forces stacking in the sidebar
    gap: '8px'
  },
  controlsContainer: {
    padding: '12px 8px',
    background: 'var(--bg-tertiary, #181825)',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap' // Ensures buttons wrap if screen gets too small
  }
};

// Single default export at the bottom fixes the build error
export default React.memo(VideoArea);