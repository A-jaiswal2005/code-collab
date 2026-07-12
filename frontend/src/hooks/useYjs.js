import { useEffect, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const YWEBSOCKET_URL = import.meta.env.VITE_YWEBSOCKET_URL || "wss://code-collab-n4p0.onrender.com/yjs";

export function useYjs(roomId, username) {
  const [status, setStatus] = useState("connecting"); 
  const [yjsState, setYjsState] = useState({ ydoc: null, provider: null });

  useEffect(() => {
    if (!roomId) return undefined;

    // THE FIX 1: Create a fresh document scoped EXACTLY to this room session.
    // (Using a ref previously caused old data to leak across room changes)
    const doc = new Y.Doc();
    
    const wsProvider = new WebsocketProvider(YWEBSOCKET_URL, roomId, doc, {
      connect: true,
    });

    wsProvider.on("status", ({ status: s }) => setStatus(s));

    wsProvider.awareness.setLocalStateField("user", {
      name: username || "Anonymous",
      color: stringToColor(username || "Anonymous"),
    });

    setYjsState({ ydoc: doc, provider: wsProvider });

    return () => {
      wsProvider.disconnect();
      wsProvider.destroy();
      doc.destroy();
      setYjsState({ ydoc: null, provider: null });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, username]); 

  return {
    ydoc: yjsState.ydoc,
    provider: yjsState.provider,
    status,
  };
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}