import { useEffect } from "react";
import { Platform } from "react-native";

const UPDATE_CHECK_INTERVAL_MS = 5 * 60_000;

export function usePwaAutoUpdate() {
  useEffect(() => {
    if (
      Platform.OS !== "web" ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let isReloading = false;
    let hadController = !!navigator.serviceWorker.controller;

    const reloadForNewVersion = () => {
      if (!hadController) {
        hadController = true;
        return;
      }

      if (isReloading) {
        return;
      }

      isReloading = true;
      window.location.reload();
    };

    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          return;
        }

        await registration.update();
      } catch (error) {
        console.error("Failed to check for a newer app version", error);
      }
    };

    const handleControllerChange = () => {
      reloadForNewVersion();
    };

    const handleWindowFocus = () => {
      void checkForUpdates();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkForUpdates();
      }
    };

    const handleOnline = () => {
      void checkForUpdates();
    };

    const handleLoad = () => {
      void checkForUpdates();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("load", handleLoad);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void checkForUpdates();
      }
    }, UPDATE_CHECK_INTERVAL_MS);

    void checkForUpdates();

    return () => {
      window.clearInterval(intervalId);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("load", handleLoad);
    };
  }, []);
}
