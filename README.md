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
