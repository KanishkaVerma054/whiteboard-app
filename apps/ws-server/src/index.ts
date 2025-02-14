import { JwtPayload } from "jsonwebtoken";
import { WebSocket, WebSocketServer } from "ws";
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
    ws.close();
    return;
  }

  const userId = checkUser(token);

  if (userId == null) {
    ws.close();
    return null;
  }

  users.push({
    userId,
    rooms: [],
    ws,
  });

  ws.on("message", async function message(data) {
    //TODO: check the type first only if its a string then proceed
    
    const parsedData = JSON.parse(data as unknown as string);

    //TODO: does the roomId exists then only let the user to subscribe messages to the room, does the user have the access to join the specific room(only some people can join the room)

    if (parsedData.type === "join_room") {
      const user = users.find((x) => x.ws === ws);
      user?.rooms.push(parsedData.roomId);
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
      
      //TODO: Push over to queue; lecture: chess video
      
      try {
        await prismaClient.chat.create({
            data: {
                roomId,
                message,
                userId
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
  });
});
