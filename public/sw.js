self.addEventListener('push', (event) => {
  let data = { title: 'Incoming Call', body: 'Someone is calling you.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Incoming Call', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'answer', title: 'Open App' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.url || '/');
      }
    })
  );
});

// Handle simulated background calls
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SIMULATE_NOTIFICATION') {
    const delay = event.data.delay || 5000;
    const peerId = event.data.peerId;
    
    // Use setTimeout inside Service Worker.
    // Note: service workers can sleep/terminate, but for a 5s delay it works perfectly.
    setTimeout(() => {
      self.registration.showNotification('Incoming Call (Simulator)', {
        body: `Call from Peer: ${peerId}`,
        icon: '/favicon.svg',
        vibrate: [200, 100, 200],
        data: {
          url: `/?call=${peerId}`
        }
      });
    }, delay);
  }
});
