"use client";

import { Download, RefreshCw, Share, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

const INSTALL_DISMISS_KEY = "pwa-install-dismissed-at";
const INSTALL_DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function isInstallDismissed() {
  if (typeof window === "undefined") {
    return false;
  }

  const value = window.localStorage.getItem(INSTALL_DISMISS_KEY);

  if (!value) {
    return false;
  }

  const dismissedAt = Number(value);

  if (!Number.isFinite(dismissedAt)) {
    window.localStorage.removeItem(INSTALL_DISMISS_KEY);
    return false;
  }

  if (Date.now() - dismissedAt > INSTALL_DISMISS_TTL_MS) {
    window.localStorage.removeItem(INSTALL_DISMISS_KEY);
    return false;
  }

  return true;
}

export default function PWARegister() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const refreshingRef = useRef(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstallDismissedByUser, setIsInstallDismissedByUser] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");

    const syncInstalledState = () => {
      const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
      setIsInstalled(standaloneQuery.matches || navigatorWithStandalone.standalone === true);
    };

    syncInstalledState();
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
    setIsInstallDismissedByUser(isInstallDismissed());

    const handleDisplayModeChange = () => {
      syncInstalledState();
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      window.localStorage.removeItem(INSTALL_DISMISS_KEY);
      setDeferredPrompt(null);
      setIsInstallDismissedByUser(false);
      setIsInstalled(true);
    };

    standaloneQuery.addEventListener("change", handleDisplayModeChange);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      standaloneQuery.removeEventListener("change", handleDisplayModeChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const handleControllerChange = () => {
      if (refreshingRef.current) {
        return;
      }

      refreshingRef.current = true;
      window.location.reload();
    };

    const checkForUpdate = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        setUpdateAvailable(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void registrationRef.current?.update();
      }
    };

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        registrationRef.current = registration;
        checkForUpdate(registration);

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;

          if (!worker) {
            return;
          }

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    void registerServiceWorker();

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const dismissInstallPrompt = () => {
    window.localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
    setIsInstallDismissedByUser(true);
  };

  const installApp = async () => {
    if (!deferredPrompt) {
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "dismissed") {
        dismissInstallPrompt();
      }
    } finally {
      setDeferredPrompt(null);
      setIsInstalling(false);
    }
  };

  const updateApp = async () => {
    const waitingWorker = registrationRef.current?.waiting;

    if (!waitingWorker) {
      return;
    }

    setIsUpdating(true);
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  };

  const canPromptInstall = deferredPrompt !== null && !isInstallDismissedByUser && !isInstalled;
  const showIosInstallHelp = isIos && !isInstalled && !isInstallDismissedByUser;

  if (!updateAvailable && !canPromptInstall && !showIosInstallHelp) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-4 overflow-hidden rounded-3xl border border-border/70 bg-card/95 p-4 text-card-foreground shadow-2xl shadow-black/10 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold">
              {updateAvailable ? "Nouvelle version disponible" : "Installer l'application"}
            </p>
            <p className="text-muted-foreground text-sm leading-5">
              {updateAvailable
                ? "Rechargez l'application pour appliquer la dernière version."
                : canPromptInstall
                  ? "Ajoutez hitachi2 à votre bureau ou à votre écran d'accueil pour un accès plus rapide."
                  : "Sur iPhone et iPad, ouvrez le menu de partage puis choisissez “Ajouter à l’écran d’accueil”."}
            </p>
          </div>
          {!updateAvailable ? (
            <Button
              aria-label="Fermer la suggestion d'installation"
              className="shrink-0"
              size="icon-sm"
              variant="ghost"
              onClick={dismissInstallPrompt}
            >
              <X />
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {updateAvailable ? (
            <>
              <Button disabled={isUpdating} onClick={() => void updateApp()}>
                <RefreshCw className={isUpdating ? "animate-spin" : undefined} />
                {isUpdating ? "Mise à jour..." : "Mettre à jour"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setUpdateAvailable(false)}>
                Plus tard
              </Button>
            </>
          ) : canPromptInstall ? (
            <>
              <Button disabled={isInstalling} onClick={() => void installApp()}>
                <Download />
                {isInstalling ? "Ouverture..." : "Installer"}
              </Button>
              <Button size="sm" variant="outline" onClick={dismissInstallPrompt}>
                Plus tard
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={dismissInstallPrompt}>
              <Share />
              Compris
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
