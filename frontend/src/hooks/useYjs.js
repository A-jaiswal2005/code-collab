import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const YWEBSOCKET_URL = import.meta.env.VITE_YWEBSOCKET_URL || "ws://localhost:4000/yjs";

/**
 * useYjs
 * ---------------------------------------------------------------
 * Creates (once per roomId) a Y.Doc + WebsocketProvider pair that
 * connects to the backend's /yjs endpoint. The returned `ydoc` is
 * shared by the Monaco binding (y-monaco) so every keystroke is
 * synced conflict-free across all connected clients.
 * ---------------------------------------------------------------
 */
export function useYjs(roomId, username) {
  const [status, setStatus] = useState("connecting"); // connecting | connected | disconnected
  const [provider, setProvider] = useState(null);
  const docRef = useRef(null);

  if (!docRef.current) {
    docRef.current = new Y.Doc();
  }

  useEffect(() => {
    if (!roomId) return undefined;

    const wsProvider = new WebsocketProvider(YWEBSOCKET_URL, roomId, docRef.current, {
      connect: true,
    });

    wsProvider.on("status", ({ status: s }) => setStatus(s));

    // Awareness lets peers see each other's cursor position/name -
    // y-monaco automatically renders remote cursors using this.
    wsProvider.awareness.setLocalStateField("user", {
      name: username || "Anonymous",
      color: stringToColor(username || "Anonymous"),
    });

    setProvider(wsProvider);

    return () => {
      wsProvider.destroy();
      setProvider(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  return {
    ydoc: docRef.current,
    provider,
    status,
  };
}

// Deterministic color per username, so cursors are stable across sessions.
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}