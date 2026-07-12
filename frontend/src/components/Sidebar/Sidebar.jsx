// Sidebar.jsx
// Right-hand panel of MainLayout. Hosts the LiveKit video call, controls, and chat.
// All the LiveKit-specific logic lives in VideoArea.jsx — this component just
// provides the sidebar chrome (header + scroll-safe flex container).
import VideoArea from "../Room/VideoArea";

export default function Sidebar({ roomId, username }) {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>Room · {roomId}</span>
      </div>

      {/* flex:1 + minHeight:0 lets VideoArea fill remaining space and manage
          its own internal scrolling without growing the sidebar itself */}
      <div style={styles.videoAreaWrapper}>
        <VideoArea roomId={roomId} username={username} />
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "340px",
    minWidth: "280px",
    backgroundColor: "#181825",
    borderLeft: "1px solid #313244",
    flexShrink: 0,
  },
  header: {
    flexShrink: 0,
    padding: "14px 16px",
    borderBottom: "1px solid #313244",
    backgroundColor: "#11111b",
  },
  headerTitle: {
    color: "#cdd6f4",
    fontSize: "13px",
    fontWeight: 600,
    letterSpacing: "0.02em",
  },
  videoAreaWrapper: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
};