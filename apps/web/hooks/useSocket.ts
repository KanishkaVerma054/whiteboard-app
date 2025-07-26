import { useEffect, useState } from "react";
import { WS_URL } from "../app/config";

export function useSocket() {
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState<WebSocket>()

    useEffect(() => {
        const ws = new WebSocket(`${WS_URL}?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkN2ViNDMxNi1mYmUwLTQxODQtOTRhZC0yOTllNzJlOWVkZTciLCJpYXQiOjE3NTMxMjIyODZ9.Bg4Nmew1RKIfQSbRHRI4vUahtM85lunope8LlJHnAV0`);
        ws.onopen = () => {
            setLoading(false);
            setSocket(ws)
        }
    }, []);

    return {
        socket,
        loading
    }
}