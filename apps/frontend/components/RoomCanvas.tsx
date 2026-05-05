"use client";

import { WS_URL } from "@/config";
import Canvas from "./Canvas";
import { useEffect, useState } from "react";

const RoomCanvas = ({ roomId }: { roomId: string }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(
      `${WS_URL}?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkN2ViNDMxNi1mYmUwLTQxODQtOTRhZC0yOTllNzJlOWVkZTciLCJpYXQiOjE3NzQ1OTM4Mjh9.l9lewvVQLb1WmP5Q5RMFPCMQdr6I1QQDjcRtbUi7S_s`
    );

    ws.onopen = () => {
      // setLoading(false);
      setSocket(ws);
      const data = JSON.stringify({
        type: "join_room",
        roomId
      })
      ws.send(data);
    };
  }, [roomId]);

  if (!socket) {
    return <div>Connecing to server...</div>;
  }

  return (
    <div>
      <Canvas roomId={roomId} socket={socket} />
    </div>
  );
};

export default RoomCanvas;
