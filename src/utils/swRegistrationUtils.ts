export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW Registration] Service Workers non supportati');
    return;
  }

  try {
    // Vite PWA compila il service worker come /service-worker.js
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });

    console.log('[SW Registration] Service Worker registrato:', registration);

    // Ascolta aggiornamenti del service worker
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            // possiamo eventualmente utilizzare questa parte per avvisare eventuali cambiamenti
            console.log('[SW Registration] Nuovo Service Worker attivato');
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('[SW Registration] Errore nella registrazione:', error);
  }
};

// Funzione per controllare se un aggiornamento è disponibile: 
// - attualmente non utilizzato nel main.tsx
export const checkForUpdates = async () => {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      console.log('[SW Registration] Controllato aggiornamenti');
    }
  } catch (error) {
    console.error('[SW Registration] Errore nel controllo aggiornamenti:', error);
  }
};