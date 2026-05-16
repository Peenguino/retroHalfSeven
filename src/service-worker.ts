// Usiamo una direttiva per specificare che non siamo in ambito DOM ma
// questo è un webworker ed utilizza le specifiche librerie per i web worker
/// <reference lib="webworker" />

// src/service-worker.ts
// Implementazione del service worker custom

const CACHE_NAME = 'retrohalfseven-v1';
const OFFLINE_URL = '/index.html';

// URL e pattern che carichiamo in cache nell'installazione
const CRITICAL_URLS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx'
];

// Evento Install - Cache risorse critiche
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[ServiceWorker] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching critical resources');

      return cache
        .addAll(CRITICAL_URLS)
        .catch((err) => {
          // Non fallisce l'install se alcuni asset mancano ma stampiamo un warning
          console.warn('[ServiceWorker] Some critical resources failed to cache:', err);
      });
    })
  );

  // Forza il service worker a diventare attivo subito
  self.skipWaiting();
});

// Evento Activate - Pulisci cache vecchie
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[ServiceWorker] Activate event');
  
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Prendi il controllo dei client subito
  self.clients.claim();
});

// Evento Fetch - Cache strategy (Network first, fallback to cache)
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora richieste non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignora richieste a domini esterni (e.g., Supabase)
  if (url.hostname !== self.location.hostname) {
    console.log('[ServiceWorker] Skipping external request:', url.hostname);
    return;
  }

  // Network first strategy: prova online, fallback cache, fallback offline page
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Se online, cache la risposta e restituiscila
        if (response.status === 200) {
          const clonedResponse = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, clonedResponse);
            });
        }
        return response;
      })
      .catch(() => {
        // Se offline, prova cache
        return caches
          .match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[ServiceWorker] Serving from cache:', request.url);
              return cachedResponse;
            }

            // Se è una richiesta di navigazione, restituisci la offline page controllando correttamente la Promise
            if (request.mode === 'navigate') {
              return caches.match(OFFLINE_URL).then((offlineResponse) => {
                // Se offlineResponse esiste restituisci quello, altrimenti la Response di emergenza
                return offlineResponse || new Response('Offline', { status: 503 });
              });
            }

            // Altrimenti restituisci errore per tutte le altre risorse (immagini, api, ecc.)
            return new Response('Risorsa non disponibile offline', { status: 503 });
          });
      })
  );
});

// Evento Push - Gestione notifiche push ricevute
self.addEventListener('push', (event: PushEvent) => {
  console.log('[ServiceWorker] Push event received');

  try {
    const data = event.data?.json() ?? {};
    const title = data.title || 'Retro Half Seven';
    const options: NotificationOptions = {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag, // Per deduplicazione notifiche con lo stesso tag
      data: data.data,
      requireInteraction: false,
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('[ServiceWorker] Errore parsing push event:', error);
  }
});

// --- Evento Notification Click - Gestione click sulla notifica
// Il SW comunica in message passing, di conseguenza in questo caso, acquisendo un evento
// di tipo notificationclick questo manda un messaggio contenente il codice verso cui effettuare
// la chiamata alla join-game

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[ServiceWorker] Notification click event');
  
  event.notification.close();
  const data = event.notification.data;

  // Invito è per unirsi ad una partita
  if (data?.action === 'JOIN_GAME') {
    const url = `/?invite_code=${data.inviteCode}`;

    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clientList) => {
        // Cerca una finestra già aperta sulla home
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          const clientUrl = new URL(client.url);
          
          if (clientUrl.pathname === '/' || clientUrl.pathname === '') {
            // Se è già aperta la home, focalizza e passa il parametro
            client.postMessage({ 
              type: 'INVITE_CODE', 
              payload: { invite_code: data.inviteCode } 
            });
            return client.focus();
          }
        }
        
        // Altrimenti apri una nuova finestra sulla home
        return self.clients.openWindow(url);
      })
    );
  }
});

// Permetti TypeScript di usare estensioni Web Workers, evitando eventuali conflitti
// con la normale visibilità ad esempio di Window ma lasciando l'utilizzo dei metodi specifici
// per il Web Worker in questione
declare const self: ServiceWorkerGlobalScope;
export {};