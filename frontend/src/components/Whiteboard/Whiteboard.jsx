import React, { useCallback, useEffect, useRef } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { useRoom } from "../../context/RoomContext.jsx";

/**
 * Whiteboard
 * ---------------------------------------------------------------
 * A lightweight collaborative layer on top of tldraw. Includes
 * an auto-sync feature where the server requests the room's admin
 * to send the initial board state directly to new joiners.
 * ---------------------------------------------------------------
 */
export default function Whiteboard() {
  const { socket, roomId } = useRoom();
  const editorRef = useRef(null);
  const applyingRemote = useRef(false);

  // Prevent Tldraw from swallowing Monaco keystrokes
  useEffect(() => {
    const blockTldrawShortcuts = (e) => {
      const target = e.target;
      const isStandardInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      const isMonaco = target.classList?.contains('inputarea');

      if (isStandardInput || isMonaco) {
        e.stopImmediatePropagation();
      }
    };

    window.addEventListener('keydown', blockTldrawShortcuts, true);
    window.addEventListener('keyup', blockTldrawShortcuts, true);

    return () => {
      window.removeEventListener('keydown', blockTldrawShortcuts, true);
      window.removeEventListener('keyup', blockTldrawShortcuts, true);
    };
  }, []);

  const handleMount = useCallback(
    (editor) => {
      editorRef.current = editor;

      // Broadcast local changes to peers.
      const unlisten = editor.store.listen(
        (entry) => {
          if (applyingRemote.current) return;
          socket?.emit("whiteboard:update", { roomId, snapshot: entry.changes });
        },
        { source: "user", scope: "document" }
      );

      return () => unlisten();
    },
    [socket, roomId]
  );

  useEffect(() => {
    if (!socket) return undefined;

    // 1. LIVE DRAWING (Everyone)
    const handleRemoteUpdate = (changes) => {
      const editor = editorRef.current;
      if (!editor) return;

      applyingRemote.current = true;
      editor.store.mergeRemoteChanges(() => {
        const { added = {}, updated = {}, removed = {} } = changes;
        Object.values(added).forEach((record) => editor.store.put([record]));
        Object.values(updated).forEach(([, next]) => editor.store.put([next]));
        Object.keys(removed).forEach((id) => editor.store.remove([id]));
      });
      applyingRemote.current = false;
    };

    // 2. THE ADMIN: Hears the server ask for a snapshot for a new user
    const handlePleaseSendSync = (requesterSocketId) => {
      const editor = editorRef.current;
      if (!editor) return;
      
      const currentSnapshot = editor.store.getSnapshot();
      
      socket.emit("whiteboard:send-sync", {
        toSocketId: requesterSocketId,
        snapshot: currentSnapshot
      });
    };

    // 3. THE JOINER: Receives the full snapshot from the Admin
    const handleInitialSync = (snapshot) => {
      const editor = editorRef.current;
      if (!editor || !snapshot) return;

      applyingRemote.current = true;
      editor.store.loadSnapshot(snapshot);
      applyingRemote.current = false;
    };

    socket.on("whiteboard:update", handleRemoteUpdate);
    socket.on("whiteboard:please-send-sync", handlePleaseSendSync);
    socket.on("whiteboard:initial-sync", handleInitialSync);

    return () => {
      socket.off("whiteboard:update", handleRemoteUpdate);
      socket.off("whiteboard:please-send-sync", handlePleaseSendSync);
      socket.off("whiteboard:initial-sync", handleInitialSync);
    };
  }, [socket]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Tldraw onMount={handleMount} />
    </div>
  );
}
