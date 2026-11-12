// Count Me In service worker: shows push notifications and opens the right page
// when one is tapped. Kept small on purpose; it does not cache the app.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Count Me In', {
      body: data.body || '',
      icon: '/icon-192.png',
      // Status bar icon (Android): only the shape is used, so a white shield on transparent.
      badge: '/badge-96.png',
      data: { url: data.url || '/notifications' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.location.origin))
      if (open) {
        open.focus()
        return open.navigate(url)
      }
      return self.clients.openWindow(url)
    }),
  )
})
