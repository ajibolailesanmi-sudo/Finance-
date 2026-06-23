/* ============================================================
   sw.js — minimal service worker for FinTrack.
   Purpose: let desktop notifications render reliably (even when the tab
   is backgrounded) and focus/open the app when one is clicked.
   It intentionally does NOT cache anything — there is no offline layer to
   keep in sync, and no server, so this stays tiny.
   ============================================================ */
self.addEventListener("install", function () { self.skipWaiting(); });

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

// Clicking a bill notification focuses an existing FinTrack tab, or opens one.
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./index.html");
    })
  );
});
