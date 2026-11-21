import { HTTP_BACKEND } from "@/config";
import { StoredShapeRow } from "@/types/types";
import axios from "axios";

export function toShape(row: StoredShapeRow): unknown {
    try {
        const messageData = JSON.parse(row.message);
        return { ...messageData.shape, id: row.shapeId, rotation: messageData.shape.rotation ?? 0}
    } catch {
        return null;
    }
}

export async function getExistingShapes(roomId: string) {
    const res = await axios.get<{ messages: StoredShapeRow[] }>(`${HTTP_BACKEND}/chats/${roomId}`)
    return res.data.messages.map(toShape)
}