# retroHalfSeven

Web Development Class Project.

## Note

Elenco di annotazioni tecniche trovate durante lo sviluppo:
- **`vite-plugin-pwa` e `Vite 8`** Installo `vite-plugin-pwa` con:
    ```
    npm i -D vite-plugin-pwa --legacy-peer-deps
    ```
    La flag ci permette di utilizzare le peerDependency legacy di `vite-plugin-pwa` dato che
    npm assume un comportamento strict sul controllo di dipendenze e `vite-plugin-pwa` ancora
    non è stato definito per `Vite 8` uscito a Marzo 2026.

- `.env` e `.env.local`
    - Il file `.env` lasciato sulla repo è il template del `.env.local` atteso dall'ambiente di supabase. Questo può essere anche popolato e lasciato pubblico data la gestione delle operazioni su DB tramite security rules ma per poter differenziare più facilmente tra ambienti di dev/prod/test preferisco istanziarlo nella `.env.local` (non presente su repo, oscurata dalla `.gitignore`) lasciando però pubblico il template in `.env`.