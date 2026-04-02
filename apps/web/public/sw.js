self.addEventListener("install", () => {});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "SKIP_WAITING") {
    return;
  }

  void self.skipWaiting();
});
