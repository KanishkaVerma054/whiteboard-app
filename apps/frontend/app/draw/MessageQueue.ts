import { OutgoingMessage } from "@/types/types";


export class MessageQueue {
    private queue: OutgoingMessage[] = [];
    private storageKey: string;

    constructor(roomId: string) {
        this.storageKey = `unsent-ws-queue:${roomId}`;
        this.loadFromStorage();
    }

    enqueue(message: OutgoingMessage) {
        this.queue.push(message);
        this.saveToStorage();
    }

    get size(): number {
        return this.queue.length;
    }

    getAll(): readonly OutgoingMessage[] {
        return this.queue;
    }

    flush(sendFn: (message: OutgoingMessage) => boolean) {
        while (this.queue.length > 0) {
            if(!sendFn(this.queue[0])) break;
            this.queue.shift();
        }
        this.saveToStorage();
    }

    private saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
        } catch {
            console.warn("Failed to persist message queue");
        }
    }

    private loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if(saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) this.queue = parsed;
            }
        } catch {
            console.warn("Failed to load message queue");
        }
    }
}