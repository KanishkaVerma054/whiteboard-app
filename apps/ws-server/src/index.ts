import { JwtPayload } from "jsonwebtoken";
import { RawData, WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/db/client";

const wss = new WebSocketServer({ port: 4000 });

// ugly state management using global variable
interface User {
  ws: WebSocket;
  rooms: string[];
  userId: string;
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

  users.push({
    userId,
    rooms: [],
    ws,
  });

  // Handle this connection's messages one at a time, in the order they arrived.
  // Without this, an async handler for "move A" can finish before "create A",
  // and updateMany matches 0 rows.
  let messageChain: Promise<void> = Promise.resolve();
  ws.on("message", (data) => {
    messageChain = messageChain
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
      if(!user) return;

      const roomId = parsedData.roomId;
      if(!user.rooms.includes(roomId)) {
        user.rooms.push(roomId);
      }

      try {
        const chats = await prismaClient.chat.findMany({
          where: { roomId: Number(roomId)},
          orderBy: { id: "asc"}
        });

        // Reply to this socket only, not the broadcast
        ws.send(
          JSON.stringify({
            type: "existing_shapes",
            roomId,
            messages: chats.map((c) => ({ message: c.message, shapeId: c.shapeId }))
          })
        )
      } catch (e) {
        ws.send(JSON.stringify({type: "error", message: "Failed to load shapes"}))
      }
    }

    if (parsedData.type === "leave_room") {
      const user = users.find((x) => x.ws === ws);
      if (!user) {
        return;
      }
      user.rooms = user?.rooms.filter((x) => x === parsedData.room);
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
                shapeId
            }
        })

        users.forEach((user) => {
            if (user.rooms.includes(roomId)) {
              user.ws.send(
                JSON.stringify({
                  type: "chat",
                  message: message,
                  roomId,
                })
              );
            }
        });

      } catch (error) {
        ws.send(
            JSON.stringify({
                type: "error",
                message: "Failed to send message. Please try again."
            })
        )
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

        users.forEach((user) => {
          if (user.rooms.includes(roomId)) {
            user.ws.send(
              JSON.stringify({
                type: "shape_update",
                message,
                shapeId,
                roomId,
              })
            );
          }
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

        users.forEach((user) => {
          if (user.rooms.includes(roomId)) {
            user.ws.send(
              JSON.stringify({
                type: "shape_delete",
                shapeId,
                roomId,
              })
            );
          }
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
    if(index !== -1) {
      users.splice(index, 1);
    }
  })
});
