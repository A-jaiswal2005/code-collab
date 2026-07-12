import React, { useEffect, useState } from 'react';
import '@livekit/components-styles';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import { useRoom } from "../../context/RoomContext.jsx";

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export default function VideoArea() {
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
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
      style={{ height: '100%', width: '100%' }}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}