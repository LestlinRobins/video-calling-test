self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// ── Push: show native notification with caller info ──
self.addEventListener('push', (event) => {
  let data = {
    title: 'Incoming Call',
    body: 'Incoming call — tap to answer',
    callerPeerId: null,
    url: '/'
  }

  if (event.data) {
    try {
      Object.assign(data, event.data.json())
    } catch {
      data.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      tag: 'incoming-call',
      data: {
        callerPeerId: data.callerPeerId,
        url: data.url || '/'
      },
      actions: [
        { action: 'answer', title: '📞 Answer' },
        { action: 'decline', title: '✕ Decline' }
      ]
    })
  )
})

// ── Notification click: focus or open app tab ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'decline') return

  const callerPeerId = event.notification.data?.callerPeerId
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there's already an app tab open, focus it and message it
      for (const client of clientList) {
        if ('focus' in client) {
          if (callerPeerId) {
            client.postMessage({ type: 'INCOMING_CALL_ANSWER', callerPeerId })
          }
          return client.focus()
        }
      }
      // Otherwise open a new tab with the caller ID in the URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})

// ── Message from page: simulate delayed notification ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SIMULATE_NOTIFICATION') {
    const delay = event.data.delay || 5000
    const peerId = event.data.peerId

    setTimeout(() => {
      self.registration.showNotification('Incoming Call (Simulator)', {
        body: `Call from Peer: ${peerId}`,
        icon: '/favicon.svg',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: { callerPeerId: peerId, url: `/?caller=${peerId}` }
      })
    }, delay)
  }
})
