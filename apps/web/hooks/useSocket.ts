import { useEffect, useState } from "react";
import { WS_URL } from "../app/config";

export function useSocket() {
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState<WebSocket>()

    useEffect(() => {
        const ws = new WebSocket(`${WS_URL}?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhYzg4YTk5ZS0zNDkzLTRiY2ItODVmNS1mOWRhMTIxOWJkN2YiLCJpYXQiOjE3Mzk1NTg3NzJ9.TlqFN5sjs6qfuz6BMopr4iu1ytvARa1wd-wfwRiRPc8`);
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