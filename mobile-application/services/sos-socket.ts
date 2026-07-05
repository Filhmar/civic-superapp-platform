/**
 * SOS realtime singleton (STACK_BASIS §10): typed socket.io client for the
 * /sos namespace, auth via the shared tokenRefreshManager + tenant id.
 * Callers fall back to HTTP when `connect()` resolves false.
 */
import { io, type Socket } from "socket.io-client";

import { ENV } from "@/constants/env";
import { getTenantId } from "@/lib/tenant";
import { tokenRefreshManager } from "@/lib/token-refresh";

interface ServerToClient {
  "sos:ack": (payload: { received: boolean }) => void;
}

interface ClientToServer {
  "sos:location": (
    payload: { session_id: string; lat: number; lng: number },
    ack?: (res: { received: boolean }) => void,
  ) => void;
}

const CONNECT_TIMEOUT_MS = 4000;

class SosSocketService {
  private socket: Socket<ServerToClient, ClientToServer> | null = null;

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /** Resolve true when connected; false → caller uses the HTTP fallback. */
  async connect(): Promise<boolean> {
    if (this.socket?.connected) return true;
    const token = await tokenRefreshManager.refreshIfNeeded();
    try {
      this.socket = io(`${ENV.API_URL}/sos`, {
        transports: ["websocket"],
        timeout: CONNECT_TIMEOUT_MS,
        reconnectionAttempts: 2,
        auth: { token: token ?? "", tenant: getTenantId() },
      });
      const socket = this.socket;
      return await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), CONNECT_TIMEOUT_MS);
        socket.once("connect", () => {
          clearTimeout(timer);
          resolve(true);
        });
        socket.once("connect_error", () => {
          clearTimeout(timer);
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  /** Emit a location fix with ack; resolves false when not delivered. */
  emitLocation(payload: {
    session_id: string;
    lat: number;
    lng: number;
  }): Promise<boolean> {
    const socket = this.socket;
    if (!socket?.connected) return Promise.resolve(false);
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 3000);
      socket.emit("sos:location", payload, () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const sosSocket = new SosSocketService();
