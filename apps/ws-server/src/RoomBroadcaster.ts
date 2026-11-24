import { CHANNELS, connectRedis, redis } from "@repo/redis/client";

type DeliverLocal = (roomId: string, payload: object) => void;

export class RoomBroadcaster {
  private publisher = redis;
  private subscriber = redis.duplicate(); // SUBSCRIBE mode can't PUBLISH, so it needs its own
  private deliverLocal: DeliverLocal;

  constructor(deliverLocal: DeliverLocal) {
    this.deliverLocal = deliverLocal;
    this.subscriber.on("error", (err) =>
      console.error("Redis subscriber error:", err)
    );
  }

  async start() {
    await connectRedis();
    await this.subscriber.connect();
    await this.subscriber.subscribe(CHANNELS.broadcast, this.handleMessage);
  }

  publish = async (roomId: string, payload: object) => {
    try {
      await this.publisher.publish(
        CHANNELS.broadcast,
        JSON.stringify({ roomId, payload })
      );
    } catch (err) {
      console.error("Redis publish failed, broadcasting locally only:", err);
      this.deliverLocal(roomId, payload);
    }
  };

  private handleMessage = (raw: string) => {
    try {
      const { roomId, payload } = JSON.parse(raw);
      this.deliverLocal(roomId, payload);
    } catch (err) {
      console.error("Bad message on Redis channel:", err);
    }
  };

  async close() {
    await Promise.allSettled([this.publisher.close(), this.subscriber.close()]);
  }
}
