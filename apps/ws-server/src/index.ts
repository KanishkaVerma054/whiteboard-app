import { RawData, WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/db/client";
import { RoomBroadcaster } from "./RoomBroadcaster.ts";

const PORT = Number(process.env.PORT ?? 4000);
const broadcaster = new RoomBroadcaster(broadcastLocal);
interface User {
  ws: WebSocket;
  rooms: string[];
  userId: string;
  isAlive: boolean;
  chain: Promise<void>;
}

const users: User[] = [];

const checkUser = (token: string): string | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // better way to get away from the type error instead of defining it as a jwtPayload in decode

    if (typeof decoded == "string") {
      return null;
    }

    if (!decoded || !decoded.userId) {
      return null;
    }
    return decoded.userId;
  } catch (e) {
    return null;
  }
  return null;
};

function broadcastLocal(roomId: string, payload: object) {
  const data = JSON.stringify(payload);
  users.forEach((user) => {
    if (user.rooms.includes(roomId) && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(data);
    }
  });
}

async function main() {
  await broadcaster.start();

  const wss = new WebSocketServer({ port: PORT });

  const HEARTBEAT_MS = 30_000;

  const heartbeat = setInterval(() => {
    for (const user of [...users]) {
      if(!user.isAlive) {
        console.log("terminated dead socket")
        user.ws.terminate();
        continue;
      }
      user.isAlive = false;
      user.ws.ping();
    }
  }, HEARTBEAT_MS);

  wss.on("close", () => clearInterval(heartbeat));

  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if(shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down...`);

    setTimeout(() => process.exit(1), 10_000).unref();

    clearInterval(heartbeat);
    wss.close();

    const closing = [...users];

    closing.forEach((u) => u.ws.close(1001, "Server restarting"));

    await Promise.allSettled(closing.map((u) => u.chain));

    await broadcaster.close();
    await prismaClient.$disconnect();
    console.log("shutdown complete");
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  wss.on("connection", function connection(ws, request) {
    const url = request.url;
    if (!url) {
      return;
    }
    const queryParams = new URLSearchParams(url.split("?")[1]);
    const token = queryParams.get("token");

    if (!token) {
      ws.close(1008, "User not authenticated");
      return;
    }

    const userId = checkUser(token);

    if (userId == null) {
      ws.close(1008, "User not authenticated");
      return null;
    }

    const currentUser: User = {
      userId,
      rooms: [],
      ws,
      isAlive: true,
      chain: Promise.resolve(),
    }
    users.push(currentUser);

    // Heartbeat: To know which servers are dead or alive
    ws.on("pong", () => {
      currentUser.isAlive = true
    })

    // Handle this connection's messages one at a time, in the order they arrived.
    // Without this, an async handler for "move A" can finish before "create A",
    // and updateMany matches 0 rows.
    ws.on("message", (data) => {
      currentUser.chain = currentUser.chain
        .then(() => handleMessage(data))
        .catch((err) => console.error("Message handler failed:", err));
    });

    const handleMessage = async (data: RawData) => {
      let parsedData;
      if (typeof data !== "string") {
        parsedData = JSON.parse(data.toString());
      } else {
        parsedData = JSON.parse(data);
      }

      //TODO: does the roomId exists then only let the user to subscribe messages to the room, does the user have the access to join the specific room(only some people can join the room)

      if (parsedData.type === "join_room") {
        const user = users.find((x) => x.ws === ws);
        if (!user) return;

        const roomId = parsedData.roomId;
        if (!user.rooms.includes(roomId)) {
          user.rooms.push(roomId);
        }

        try {
          const chats = await prismaClient.chat.findMany({
            where: { roomId: Number(roomId) },
            orderBy: { id: "asc" },
          });

          // Reply to this socket only, not the broadcast
          ws.send(
            JSON.stringify({
              type: "existing_shapes",
              roomId,
              messages: chats.map((c) => ({
                message: c.message,
                shapeId: c.shapeId,
              })),
            })
          );
        } catch (e) {
          ws.send(
            JSON.stringify({ type: "error", message: "Failed to load shapes" })
          );
        }
      }

      if (parsedData.type === "leave_room") {
        const user = users.find((x) => x.ws === ws);
        if (!user) {
          return;
        }
        user.rooms = user?.rooms.filter((x) => x !== parsedData.roomId);
      }

      if (parsedData.type === "chat") {
        //TODO: check if the message isn't too long; also check if the message doesnot have something abnoxious written in it

        const roomId = parsedData.roomId;
        const message = parsedData.message;
        const shapeId = parsedData.shapeId;

        //TODO: Push over to queue; lecture: chess video

        try {
          await prismaClient.chat.create({
            data: {
              roomId: Number(roomId),
              message,
              userId,
              shapeId,
            },
          });
          await broadcaster.publish(roomId, {
            type: "chat",
            message: message,
            roomId,
          });
        } catch (error) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Failed to send message. Please try again.",
            })
          );
        }

        //TODO: fix: we are not persisting things to the database,
        // TODO: THIS SHOULD BE FIXED: there is no auth(anyone can send messages to any room e.g. I subscribe to room1 but sending message to room2)
      }

      // Persists an edited (moved/resized) shape by overwriting the Chat row that owns its shapeId,
      // instead of inserting a new row — keeps the shape's history as one row, not a duplicate.
      if (parsedData.type === "shape_update") {
        const roomId = parsedData.roomId;
        const message = parsedData.message;
        const shapeId = parsedData.shapeId;

        if (!shapeId) return;

        try {
          const updated = await prismaClient.chat.updateMany({
            where: { roomId: Number(roomId), shapeId },
            data: { message },
          });

          if (updated.count === 0) return; // unknown shapeId — nothing to update
          await broadcaster.publish(roomId, {
            type: "shape_update",
            message,
            shapeId,
            roomId,
          });
        } catch (error) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Failed to update shape. Please try again.",
            })
          );
        }
      }

      if (parsedData.type === "shape_delete") {
        const roomId = parsedData.roomId;
        const shapeId = parsedData.shapeId;

        if (!shapeId) return;

        try {
          await prismaClient.chat.deleteMany({
            where: { roomId: Number(roomId), shapeId },
          });
          await broadcaster.publish(roomId, {
            type: "shape_delete",
            shapeId,
            roomId,
          });
        } catch (error) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Failed to delete shape. Please try again.",
            })
          );
        }
      }
    };

    ws.on("close", () => {
      const index = users.findIndex((u) => u.ws === ws);
      if (index !== -1) {
        users.splice(index, 1);
      }
    });
  });

  console.log(`ws-server listening on port :${PORT}`);
}

main().catch((err) => {
  console.error("ws-server failed to start:", err);
  process.exit(1);
});
