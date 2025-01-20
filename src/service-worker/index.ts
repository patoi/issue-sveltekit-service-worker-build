/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = self as unknown as ServiceWorkerGlobalScope;
import { build, files, version } from "$service-worker";
const CACHE = `example-${version}`;

const ASSETS = [
  ...build, // the app itself
  ...files, // everything in `static`
];

sw.addEventListener("install", (event) => {
  async function addFilesToCacheAndSkipWaiting() {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    await sw.skipWaiting();
  }

  event.waitUntil(addFilesToCacheAndSkipWaiting());
});

sw.addEventListener("activate", (event) => {
  async function deleteOldCachesAndClaimClients() {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key);
    }

    await sw.clients.claim();
  }
  event.waitUntil(deleteOldCachesAndClaimClients());
});

sw.addEventListener("fetch", (event) => {
  // Ignore requests that should be cached
  const matchUrl = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (matchUrl.pathname.startsWith("/api")) return;

  async function respond() {
    const url = new URL(event.request.url);
    const cache = await caches.open(CACHE);
    const cacheMatch = await cache.match(event.request);
    if (ASSETS.includes(url.pathname) && cacheMatch) {
      return cacheMatch;
    }
    try {
      const response = await fetch(event.request);

      if (response.status === 200) {
        await cache.put(event.request, response.clone());
      }

      return response;
    } catch {
      const lastCacheMatchAttempt = await cache.match(event.request);

      if (lastCacheMatchAttempt) {
        return lastCacheMatchAttempt;
      } else {
        return new Response(
          "Something went very wrong. Try force closing and reloading the app.",
          {
            status: 400,
            headers: { "Content-Type": "text/html" },
          }
        );
      }
    }
  }
  event.respondWith(respond());
});

sw.addEventListener("push", function (event) {
  try {
    const payload = event.data
      ? event.data.json()
      : {
          title: "Appreciation",
          body: "There is new content in your app cache!",
        };

    if (payload) {
      const { title, ...options } = payload;

      event.waitUntil(sw.registration.showNotification(title, options));
    } else {
      console.warn("No payload for push event", event);
    }
  } catch (e) {
    console.warn("Malformed notification", e);
  }
});

sw.addEventListener("notificationclick", (event: any) => {
  const clickedNotification = event?.notification;
  clickedNotification.close();

  event.waitUntil(
    sw.clients
      .matchAll({ type: "window" })
      .then((clientsArr) => {
        const hadWindowToFocus = clientsArr.length && clientsArr.length > 0;
        if (hadWindowToFocus) {
          const client = clientsArr[0];
          if (!client.url.includes("/jar")) {
            client.navigate("/jar");
          }
          client.focus();
        } else
          sw.clients
            .openWindow("/jar")
            .then((windowClient) =>
              windowClient ? windowClient.focus() : null
            );
      })
      .catch((e) => {
        console.error(e);
      })
  );
});
