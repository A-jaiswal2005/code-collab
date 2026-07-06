import React from "react";
import { RoomProvider, useRoom } from "./context/RoomContext.jsx";
import RoomJoin from "./components/Room/RoomJoin.jsx";
import MainLayout from "./components/Layout/MainLayout.jsx";

function AppInner() {
  const { roomId } = useRoom();
  return roomId ? <MainLayout /> : <RoomJoin />;
}

export default function App() {
  return (
    <RoomProvider>
      <AppInner />
    </RoomProvider>
  );
}