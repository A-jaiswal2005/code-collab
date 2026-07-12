import React from 'react';
import VideoArea from '../Room/VideoArea';

export default function Sidebar() {
  return (
    <div style={styles.sidebarContainer}>
      {/* You can keep any existing chat or user list components here if you want */}
      
      <div style={styles.videoWrapper}>
        {/* LiveKit handles the entire grid and all the media controls */}
        <VideoArea />
      </div>
    </div>
  );
}

const styles = {
  sidebarContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    background: 'var(--bg-panel)',
    borderLeft: '1px solid var(--border-color)',
  },
  videoWrapper: {
    flex: 1,
    minHeight: 0, // Allows the LiveKit grid to size properly inside a flex container
    width: '100%',
  }
};