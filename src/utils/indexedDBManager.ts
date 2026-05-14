interface DBConfig {
    dbName: string;
    version: number;
    stores: {
        [storeName: string]: {
            keyPath?: string;
            indexes?: Array<{ name: string; keyPath: string }>;
        };
    };
}

const DB_CONFIG: DBConfig = {
    dbName: 'RetroHalfSeven',
    version: 1,
    stores: {
        friendsList: {
            keyPath: 'id',
            indexes: [
                { name: 'userId', keyPath: 'userId' }
            ]
        },
        pendingRequests: {
            keyPath: 'id',
            indexes: [
                { name: 'userId', keyPath: 'userId' }
            ]
    },
    pendingSyncRequests: {
        keyPath: 'id',
      indexes: [
        { name: 'status', keyPath: 'status' },
        { name: 'userId', keyPath: 'userId' }
      ]
    },
}
};

// IndexedDB Manager per offline support della lista amici nella homepage
// consultabile quindi anche offline
// oltre a questo effettua lo store di invio richieste d'amicizia
// che vengono inviate al DB effettivo alla prima riconnessione

class IndexedDBManager {
    private db: IDBDatabase | null = null;
    private dbReady: Promise<void>;
    
    constructor() {
        this.dbReady = this.initializeDB();
    }
    
    // Metodo di inizializzazione IndexedDB
    private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.dbName, DB_CONFIG.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        Object.entries(DB_CONFIG.stores)
          .forEach(([storeName, storeConfig]) => {
            if (!db.objectStoreNames.contains(storeName)) {
              const objectStore = db.createObjectStore(storeName, {
                keyPath: storeConfig.keyPath
              });

              storeConfig.indexes?.forEach(index => {
                objectStore.createIndex(index.name, index.keyPath);
              });
            }
        });
      };
    });
  }

  async ensureReady(): Promise<void> {
    await this.dbReady;
    if (!this.db) {
      throw new Error('IndexedDB non disponibile');
    }
  }

  // Salva lista amici
  async saveFriendsList(userId: string, friends: any[]): Promise<void> {
    await this.ensureReady();
    const tx = this.db!.transaction('friendsList', 'readwrite');
    const store = tx.objectStore('friendsList');

    // Salva con timestamp per tracking
    const data = {
      id: `friends-${userId}`,
      userId,
      friends,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Recupera lista amici
  async getFriendsList(userId: string): Promise<any[] | null> {
    await this.ensureReady();
    const tx = this.db!.transaction('friendsList', 'readonly');
    const store = tx.objectStore('friendsList');
    const index = store.index('userId');

    return new Promise((resolve, reject) => {
      const request = index.get(userId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.friends : null);
      };
    });
  }

  // Salva richieste pendenti
  async savePendingRequests(userId: string, requests: any[]): Promise<void> {
    await this.ensureReady();
    const tx = this.db!.transaction('pendingRequests', 'readwrite');
    const store = tx.objectStore('pendingRequests');

    const data = {
      id: `pending-${userId}`,
      userId,
      requests,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Recupera richieste pendenti
  async getPendingRequests(userId: string): Promise<any[] | null> {
    await this.ensureReady();
    const tx = this.db!.transaction('pendingRequests', 'readonly');
    const store = tx.objectStore('pendingRequests');
    const index = store.index('userId');

    return new Promise((resolve, reject) => {
      const request = index.get(userId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.requests : null);
      };
    });
  }

  // Salva richiesta amicizia da sincronizzare quando online
  async savePendingSyncRequest(userId: string, addresseeId: string): Promise<void> {
    await this.ensureReady();
    const tx = this.db!.transaction('pendingSyncRequests', 'readwrite');
    const store = tx.objectStore('pendingSyncRequests');

    const data = {
      id: `sync-${userId}-${addresseeId}-${Date.now()}`,
      userId,
      addresseeId,
      type: 'friend-request',
      status: 'pending', // pending | synced
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Recupera richieste da sincronizzare
  async getPendingSyncRequests(userId: string): Promise<any[]> {
    await this.ensureReady();
    const tx = this.db!.transaction('pendingSyncRequests', 'readonly');
    const store = tx.objectStore('pendingSyncRequests');
    const index = store.index('userId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result.filter((r: any) => r.status === 'pending') || []);
      };
    });
  }

  // Marchia una richiesta di sync come completata
  async markSyncRequestAsCompleted(syncId: string): Promise<void> {
    await this.ensureReady();
    const tx = this.db!.transaction('pendingSyncRequests', 'readwrite');
    const store = tx.objectStore('pendingSyncRequests');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(syncId);
      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (data) {
          data.status = 'synced';
          const updateRequest = store.put(data);
          updateRequest.onerror = () => reject(updateRequest.error);
          updateRequest.onsuccess = () => resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Pulisci tutto (per logout)
  async clearAll(): Promise<void> {
    await this.ensureReady();
    const tx = this.db!.transaction(
      Object.keys(DB_CONFIG.stores),
      'readwrite'
    );

    return new Promise((resolve, reject) => {
      let completed = 0;
      const storeNames = Object.keys(DB_CONFIG.stores);

      storeNames.forEach(storeName => {
        const store = tx.objectStore(storeName);
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          completed++;
          if (completed === storeNames.length) resolve();
        };
      });
    });
  }
}

// Stiamo seguendo il pattern singleton dato che definiamo una
// classe IndexedDBManager ed esportiamo solo un riferimento ad una singola istanza
// della classe in questione
export const indexedDBManager = new IndexedDBManager();