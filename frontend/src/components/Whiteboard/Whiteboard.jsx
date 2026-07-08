import React, { useCallback, useEffect, useRef } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { useRoom } from "../../context/RoomContext.jsx";

/**
 * Whiteboard
 * ---------------------------------------------------------------
 * A lightweight collaborative layer on top of tldraw. Rather than
 * pulling in tldraw's (paid) sync backend, we broadcast local
 * store diffs over the existing Socket.io connection and apply
 * remote diffs with `mergeRemoteChanges` so they don't re-trigger
 * our own listener (avoiding echo loops).
 *
 * NOTE: this is a "good enough for most use-cases" sync strategy.
 * For very high-frequency drawing with many simultaneous users,
 * consider tldraw's official sync server instead.
 * ---------------------------------------------------------------
 */
export default function Whiteboard() {
  const { socket, roomId } = useRoom();
  const editorRef = useRef(null);
  const applyingRemote = useRef(false);

  // --- NEW FIX: Prevent Tldraw from swallowing Monaco keystrokes ---
  useEffect(() => {
    const blockTldrawShortcuts = (e) => {
      const target = e.target;
      
      // Check if the user is focused on a standard input or Monaco's hidden textarea
      const isStandardInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      const isMonaco = target.classList?.contains('inputarea');

      if (isStandardInput || isMonaco) {
        // stopImmediatePropagation prevents ANY other listeners (like Tldraw's) 
        // on the window from firing for this specific keystroke.
        e.stopImmediatePropagation();
      }
    };

    // We MUST use the capture phase (the third argument set to `true`) 
    // to catch the event BEFORE it bubbles down to Tldraw's internal listeners.
    window.addEventListener('keydown', blockTldrawShortcuts, true);
    window.addEventListener('keyup', blockTldrawShortcuts, true);

    return () => {
      window.removeEventListener('keydown', blockTldrawShortcuts, true);
      window.removeEventListener('keyup', blockTldrawShortcuts, true);
    };
  }, []);
  // -----------------------------------------------------------------

  const handleMount = useCallback(
    (editor) => {
      editorRef.current = editor;

      // Broadcast local changes to peers.
      const unlisten = editor.store.listen(
        (entry) => {
          if (applyingRemote.current) return; // don't echo remote-applied changes
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

    socket.on("whiteboard:update", handleRemoteUpdate);
    return () => socket.off("whiteboard:update", handleRemoteUpdate);
  }, [socket]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Tldraw onMount={handleMount} />
    </div>
  );
}
