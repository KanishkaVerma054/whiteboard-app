"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  // TODO: use react hook forms
  const [roomId, setRoomId] = useState("");
  const router = useRouter()

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      width: "100vw"
    }}>
      <input style={{
        padding: 10
      }} type="text" onChange={(e) => {
        setRoomId(e.target.value)
      }} value={roomId} placeholder="Room id"></input>

      <button style={{
        padding: 10
      }} onClick={() => {
        router.push(`/room/${roomId}`)
      }}>Join Room</button>
    </div>
  );
}
