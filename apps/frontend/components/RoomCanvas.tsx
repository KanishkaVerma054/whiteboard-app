"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Canvas from "./Canvas";
import { getToken } from "@/lib/auth";

const RoomCanvas = ({ roomId }: { roomId: string }) => {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.push("/signin");
      return;
    }
    setTokenState(t);
  }, [router]);

  if (!token) return <div>Loading...</div>;

  return (
    <div>
      <Canvas roomId={roomId} token={token} />
    </div>
  );
};

export default RoomCanvas;