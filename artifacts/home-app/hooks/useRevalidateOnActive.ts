import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

interface UseRevalidateOnActiveOptions {
  enabled?: boolean;
  minIntervalMs?: number;
  refreshIntervalMs?: number;
}

export function useRevalidateOnActive(
  refresh: () => Promise<void>,
  options: UseRevalidateOnActiveOptions = {},
) {
  const {
    enabled = true,
    minIntervalMs = 60_000,
    refreshIntervalMs = 5 * 60_000,
  } = options;

  const refreshRef = useRef(refresh);
  const lastRefreshAtRef = useRef(0);
  const inFlightRefreshRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let disposed = false;

    const runRefresh = async (force = false) => {
      if (disposed) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastRefreshAtRef.current < minIntervalMs) {
        return;
      }

      if (inFlightRefreshRef.current) {
        return inFlightRefreshRef.current;
      }

      lastRefreshAtRef.current = now;
      const refreshPromise = refreshRef
        .current()
        .finally(() => {
          if (inFlightRefreshRef.current === refreshPromise) {
            inFlightRefreshRef.current = null;
          }
        });

      inFlightRefreshRef.current = refreshPromise;
      return refreshPromise;
    };

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void runRefresh();
      }
    });

    const intervalId = setInterval(() => {
      if (Platform.OS === "web") {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          void runRefresh();
        }
        return;
      }

      if (AppState.currentState === "active") {
        void runRefresh();
      }
    }, refreshIntervalMs);

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          void runRefresh();
        }
      };

      const handleWindowFocus = () => {
        void runRefresh();
      };

      const handleOnline = () => {
        void runRefresh(true);
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("focus", handleWindowFocus);
      window.addEventListener("online", handleOnline);

      return () => {
        disposed = true;
        clearInterval(intervalId);
        appStateSubscription.remove();
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("focus", handleWindowFocus);
        window.removeEventListener("online", handleOnline);
      };
    }

    return () => {
      disposed = true;
      clearInterval(intervalId);
      appStateSubscription.remove();
    };
  }, [enabled, minIntervalMs, refreshIntervalMs]);
}
