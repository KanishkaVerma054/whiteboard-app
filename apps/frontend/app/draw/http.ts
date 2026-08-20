import { HTTP_BACKEND } from "@/config";
import axios from "axios";

export async function getExistingShapes(roomId: string) {
    const res = await axios.get(`${HTTP_BACKEND}/chats/${roomId}`)
    const messages = res.data.messages;

    const shapes = messages.map((x : {message: string; shapeId: string | null}) => {
        const messageData = JSON.parse(x.message)
        // shapeId is how the backend identifies this shape for later updates/deletes —
        // attach it as the shape's own `id` so the frontend has one consistent field to use
        return { ...messageData.shape, id: x.shapeId };
    })

    return shapes;
  }