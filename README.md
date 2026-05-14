# retroHalfSeven

UNIPI Web Development Class Project.

## Istruzioni per Setup e Run

Guida per il setup con e senza docker.
- Di default viene usato docker da supabase se scegliamo di runnare in locale il backend.
- La configurazione dei due **file di env** è in comune tra i due tipi di setup. Di conseguenza a prescindere dal tipo di setup scelto vanno così configurate le due `.env`:

### Setup dei file `.env` Frontend/Backend

- **Frontend `./.env.local`** Mantiene le informazioni utili al link da *frontend* a *backend*:

    ```bash
    # L'URL punterà al gateway API del Supabase locale, solitamente
    # questo è quello di default altrimenti va matchato con quello
    # che ci viene fornito a tempo di supabase start
    VITE_SUPABASE_URL=http://127.0.0.1:54321

    # La chiave verrà fornita dal terminale a tempo di supabase start
    # Dato che sono in container diversi frontend e backend possiamo
    # runnare il backend per acquisire questa chiave ed inserirla qui
    VITE_SUPABASE_ANON_KEY=inserisci_chiave

    # Chiave pubblica VAPID per le Web Push Notifications
    VITE_VAPID_PUBLIC_KEY=inserisci_chiave
    ```

    Il `./.env` presente nella repo è quindi un template vuoto del `./.env.local` atteso dal frontend per acquisire le chiavi.

- **Backend `./supabase/functions/.env`** Mantiene le chiavi VAPID al *backend*:

    Prima creiamo il file in `./supabase/functions/`, quindi se siamo nella root della repo eseguiamo:

    ```bash
    touch ./supabase/functions/.env
    ```

    Successivamente popoliamo il `./supabase/functions/.env` con le VAPID keys.

    ```bash
    VAPID_PUBLIC_KEY=inserisci_chiave
    VAPID_PRIVATE_KEY=inserisci_chiave
    ```

### Setup Docker

Si assume di aver clonato la repo e configurato gli `env` come specificato nel [punto precedente](#setup-dei-file-env-frontendbackend).

1. **Lancio Containers Backend**
    ```bash
    npx supabase start
    ```
    Una volta lanciato questo comando possiamo acquisire le due variabili `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` richieste dal `.env.local` del frontend.

2. **Serve delle Edge Functions**
    ```bash
    npx supabase functions serve
    ```
3. **Up al Docker Compose Frontend**
    ```bash
    docker compose up --build
    ```
    - La flag `--build` ci permette di costruire sulla base del `Dockerfile` a cui puntiamo nel `docker-compose.yml`. Nel caso di semplice avvio possiamo rimuovere la flag.
    - Questo comando acquisisce la CLI da cui lo si lancia ed espone l'URL che utilizzeremo per il nostro browser.

### Setup No Docker

Anche per il setup senza container è richiesto che sia avviato il servizio di Docker engine in background, dato che tutto l'ambiente Supabase in locale si basa sul suo utilizzo.

#### 01 - Prerequisiti:
- `npm` deve essere installato.
- `docker` deve essere installato ed avviato il suo servizio.

#### 02 - Clonare repo

```bash
git clone https://github.com/Peenguino/retroHalfSeven
cd retroHalfSeven
```

#### 03 - Pacchetti node via `npm`

Una volta all'interno della dir installiamo le dipendenze

```
npm install --legacy-peer-deps
```

In questo modo possiamo leggere nel `package.json` sia le dipendenze dev/runtime sia eventuali comandi custom che possiamo definire ed utilizzare tramite `npm run [comando]`

La flag `--legacy-peer-deps` è lasciata per risolvere un problema descritto nelle [note in fondo](#note).

#### 04 - Configurazione delle `env`

Vedi [sopra](#setup-dei-file-env-frontendbackend).

#### 05 - Avvio Backend

Avviamo il backend con

```bash
npx supabase start
```
- Questo ci stamperà da CLI le due chiavi menzionate nel `.env.local` del *frontend* sopra, ossia:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`

Serviamo le Edge Functions tramite

```bash
npx supabase functions serve
```

#### 06 - Avvio Frontend

Dato che stiamo utilizzando il service worker custom non utilizziamo `npm run dev` ma buildiamo e runniamo la preview:

```bash
npm run build
npm run preview
```

#### 07 - Comandi Utili per la Terminazione

```bash
# Comando per terminazione processo backend
npx supabase stop
# Comando per pulizia entry DB e riapplicazione migrazioni
npx supabase db reset
```

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