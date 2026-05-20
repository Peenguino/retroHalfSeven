# retroHalfSeven

UNIPI Web Development Class Project.

## Istruzioni e Dipendenze per Setup e Run

- Dettagli per il **setup e dipendenze**:
    - Di default viene usato docker da supabase se scegliamo di runnare in locale il backend.
        - `docker` l'engine di docker per la costruzione ed il run dei container. 
            - Si lascia un [link](https://docs.docker.com/engine/install/ubuntu/#install-using-the-convenience-script) alla configurazione rapida ufficiale di Docker tramite script in bash per l'installazione.
        - `npm` packet manager di node.
            - Installato tramite `apt install npm`
        - `npm supabase` modulo di supabase che permetterà tramite `npx supabase` operazioni come avvio, serve di funzioni, gestione del db...
            - Installato tramite `npm install supabase`

- **Setup solo Frontend**: Nel caso in cui si volesse setuppare solo il frontend vedi passi *4.* e *6.* della [sezione successiva](#passi-per-il-setup).
    - In ogni caso vanno fornite le due chiavi di un ambiente di backend e la chiave VAPID pubblica nel passo *4.*

### Passi per il Setup

1. **Clone repo**: Clonare repo e spostarsi nella dir appena creata:

    ```bash
    git clone https://github.com/Peenguino/retroHalfSeven
    cd retroHalfSeven
    ```

2. **Creazione e inserimento VAPID keys in env Backend `./supabase/functions/.env`** Mantiene le chiavi VAPID al *backend*:

    Prima creiamo il file in `./supabase/functions/`, quindi se siamo nella root della repo eseguiamo:

    ```bash
    touch ./supabase/functions/.env
    ```
    Successivamente popoliamo il `./supabase/functions/.env` con le VAPID keys.

    ```bash
    VAPID_PUBLIC_KEY=inserisci_chiave
    VAPID_PRIVATE_KEY=inserisci_chiave
    ```

3. **Lancio Containers Backend**
    ```bash
    npx supabase start
    ```
    Una volta lanciato questo comando possiamo acquisire le due variabili `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` richieste successivamente dal `.env.local` del frontend.

4. **Creazione ed inserimento keys in env Frontend `./.env.local`** Mantiene le informazioni utili al link da *frontend* a *backend*

    Prima creiamo il file in `./`, quindi se siamo nella root della repo eseguiamo:

    ```bash
    touch ./.env.local
    ```
    Popoliamo quindi l'env del frontend con le chiavi attese.

    ```bash
    # L'URL punterà al gateway API del Supabase locale, solitamente
    # questo è quello di default altrimenti va matchato con quello
    # che ci viene fornito a tempo di supabase start
    VITE_SUPABASE_URL=http://127.0.0.1:54321

    # La chiave viene dal terminale a tempo di supabase start
    VITE_SUPABASE_ANON_KEY=inserisci_chiave

    # Chiave pubblica VAPID per le Web Push Notifications
    VITE_VAPID_PUBLIC_KEY=inserisci_chiave
    ```

    - Il `./.env` presente nella repo è quindi un template vuoto del `./.env.local` atteso dal frontend per acquisire le chiavi.
    - Si sceglie di non esporre le chiavi di ambiente di prod solo perchè si assume di voler utilizzare un nuovo ambiente per il backend.
        - Nell'eventualità in cui fosse necessario interfacciarsi all'ambiente in prod basta inserire in questo `.env.local` i valori di `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` relativi a quell'ambiente.

5. **Serve delle Edge Functions Backend**: Lanciamo le funzioni di Supabase:

    ```bash
    npx supabase functions serve
    ```
    - Questo comando ci blocca il terminale su cui lo stiamo eseguendo, lasciando la console ai log delle function per eventuali debug.

6. **Up al Docker Compose Frontend**

    Se eseguito subito dopo il passo *5.* va creato un nuovo terminale, dato che quello precedente sarà bloccato sui logs delle funzioni.

    ```bash
    docker compose up --build
    ```
    - La flag `--build` ci permette di costruire sulla base del `Dockerfile` a cui puntiamo nel `docker-compose.yml`. Nel caso di semplice avvio possiamo rimuovere la flag.
    - Questo comando acquisisce la CLI da cui lo si lancia ed espone l'URL che utilizzeremo per il nostro browser.

7. **Comandi Utili per la Terminazione Backend**

    ```bash
    # Comando per terminazione processo backend
    npx supabase stop
    # Comando per pulizia entry DB e riapplicazione migrazioni
    npx supabase db reset
    ```

## Descrizione Dir Progetto

Seguendo lo stile monorepo la dir è strutturata in questo modo:

- `./src/` contiene il frontend:
    - `./src/assets` contiene tutti gli sprite delle carte.
        - [`assetsMapping.tsx`](./src/assets/assetsMapping.tsx) esporta un `Record` che mappa gli sprite.
    - `./src/authSupabase` contiene la logica di autenticazione tramite client supabase:
        - [`authComponents.tsx`](./src/auth_supabase/authComponents.tsx) esporta il componente dedicato all'autenticazione utilizzato nella homepage.
        - [`supabaseClient.tsx`](./src/auth_supabase/supabaseClient.tsx) legge i token dalla `./local.env` ed istanzia ed esporta il client di Supabase.
    - `./src/cardComponents` contiene i componenti che gestiscono la logica dietro le carte:
        - [`cardCenter.tsx`](./src/cardComponents/cardCenter.tsx) gestisce il rendering del corretto sprite rispetto alla figura ed al punteggio relativo alla carta.
        - [`playingCard.tsx`](./src/cardComponents/playingCard.tsx) gestisce ed espone l'intero componente della carta, importando quindi la logica di [`cardCenter.tsx`](./src/cardComponents/cardCenter.tsx).
## Note

Elenco di annotazioni tecniche trovate durante lo sviluppo:
### **`vite-plugin-pwa` e `Vite 8`** 
```
npm i -D vite-plugin-pwa --legacy-peer-deps
```
La flag ci permette di utilizzare le peerDependency legacy di `vite-plugin-pwa` dato che
npm assume un comportamento strict sul controllo di dipendenze e `vite-plugin-pwa` ancora
non è stato definito per `Vite 8` uscito a Marzo 2026.

### `./.env` e `./.env.local`

Il file `./.env` lasciato sulla repo è il template del `./.env.local` atteso dall'ambiente di vite. Questo può essere anche popolato e lasciato pubblico data la gestione delle operazioni su DB tramite security rules ma per poter differenziare più facilmente tra ambienti di dev/prod/test preferisco istanziarlo nella `.env.local` (non presente su repo, oscurata dalla `.gitignore`) lasciando però pubblico il template in `.env`.

### Dockerizzazione "Parziale"

Ho scelto di non creare un unico grande container per lasciare la possibilità di scegliere se costruire solo l'ambiente frontend, backend o entrambi.
- Oltre a questo tutto il backend di Supabase è già dockerizzato, di conseguenza risultava complesso contenere tutto in un singolo container.