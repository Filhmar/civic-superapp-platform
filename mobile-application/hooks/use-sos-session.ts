/**
 * SOS session lifecycle: open → stream location fixes (WS when available,
 * HTTP fallback every 5s) → close. Never leaves a timer running after close.
 */
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

import { useTenantConfig } from "@/contexts/tenant-config-context";
import { closeSosSession, openSosSession, postSosLocation } from "@/services/sos";
import { sosSocket } from "@/services/sos-socket";
import type { SosSession } from "@/types/sos";

const STREAM_INTERVAL_MS = 5000;

export type SosState = "idle" | "opening" | "live" | "failed";

export function useSosSession() {
  const { config } = useTenantConfig();
  const [state, setState] = useState<SosState>("idle");
  const [session, setSession] = useState<SosSession | null>(null);
  const [fixCount, setFixCount] = useState(0);
  const [transport, setTransport] = useState<"ws" | "http">("http");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<SosSession | null>(null);

  const getFix = useCallback(async (): Promise<{
    lat: number;
    lng: number;
  }> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({});
        return { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
    } catch {
      // fall through to centroid
    }
    const centroid = config?.geo.centroid;
    return centroid
      ? { lat: centroid[0], lng: centroid[1] }
      : { lat: 0, lng: 0 };
  }, [config]);

  const stopStreaming = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    sosSocket.disconnect();
  }, []);

  const streamFix = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    const geo = await getFix();
    const viaWs = await sosSocket.emitLocation({
      session_id: current.session_id,
      ...geo,
    });
    if (!viaWs) {
      try {
        await postSosLocation(current.session_id, geo);
      } catch {
        return; // offline blip — keep streaming, do not count the fix
      }
    }
    setTransport(viaWs ? "ws" : "http");
    setFixCount((n) => n + 1);
  }, [getFix]);

  const activate = useCallback(async () => {
    if (state === "opening" || state === "live") return;
    setState("opening");
    setFixCount(0);
    try {
      const geo = await getFix();
      const opened = await openSosSession(geo);
      sessionRef.current = opened;
      setSession(opened);
      setFixCount(1); // the open call carries the first fix
      setState("live");
      // WS preferred; HTTP fallback otherwise.
      const ws = await sosSocket.connect();
      setTransport(ws ? "ws" : "http");
      timer.current = setInterval(() => void streamFix(), STREAM_INTERVAL_MS);
    } catch {
      sessionRef.current = null;
      setSession(null);
      setState("failed"); // degraded mode: caller shows native-dial fallback
    }
  }, [state, getFix, streamFix]);

  const close = useCallback(async () => {
    stopStreaming();
    const current = sessionRef.current;
    sessionRef.current = null;
    if (current) {
      try {
        await closeSosSession(current.session_id);
      } catch {
        // best effort — the backend times sessions out server-side
      }
    }
    setSession(null);
    setState("idle");
  }, [stopStreaming]);

  const reset = useCallback(() => setState("idle"), []);

  // Teardown when the screen unmounts mid-session.
  useEffect(() => stopStreaming, [stopStreaming]);

  return { state, session, fixCount, transport, activate, close, reset };
}
