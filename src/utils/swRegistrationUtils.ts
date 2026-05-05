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

// Richiede il permesso di notifiche push e registra la subscription nel backend
export const requestNotificationPermissionAndRegister = async () => {
  // Se le notifiche non sono supportate, esci
  if (!('Notification' in window)) {
    console.log('[Push Notifications] Notifiche non supportate');
    return false;
  }

  try {
    // Se il permesso è già granted, registra la subscription
    if (Notification.permission === 'granted') {
      await registerPushSubscription();
      return true;
    }

    // Se il permesso è denied, non fare nulla
    if (Notification.permission === 'denied') {
      console.log('[Push Notifications] Permesso notifiche negato');
      return false;
    }

    // Se è 'default', chiedi il permesso
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      await registerPushSubscription();
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Push Notifications] Errore nella richiesta permessi:', error);
    return false;
  }
};

// Registra la push subscription nel backend
export const registerPushSubscription = async () => {
  if (!('serviceWorker' in navigator)) {
    console.log('[Push Notifications] Service Workers non supportati');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Ottieni la subscription dal push manager
    let subscription = await registration.pushManager.getSubscription();

    // Se non esiste, crea una nuova subscription
    if (!subscription) {
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VITE_VAPID_PUBLIC_KEY non configurata');
      }

      // Converti la chiave pubblica VAPID da base64 a Uint8Array
      const vapidPublicKeyUint8Array = urlBase64ToUint8Array(vapidPublicKey);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKeyUint8Array as BufferSource,
      });
    }

    // Serializza la subscription e inviala al backend
    const subscriptionJson = JSON.parse(JSON.stringify(subscription));

    // Invocazione edge function subscribe-push-notifications
    const { data, error } = await (
      await import('../auth_supabase/supabaseClient')
    ).supabase.functions.invoke('subscribe-push-notifications', {
      body: {
        endpoint: subscriptionJson.endpoint,
        keys: subscriptionJson.keys,
        device_name: `${navigator.userAgent.split(' ').slice(-2).join(' ')}`,
      },
    });

    if (error) {
      throw new Error(`Errore registrazione subscription: ${error.message}`);
    }

    console.log('[Push Notifications] Subscription registrata:', data);
  } catch (error) {
    console.error('[Push Notifications] Errore nella registrazione subscription:', error);
  }
};

// Funzione di supporto per conversione stringa base64 URL-safe to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}