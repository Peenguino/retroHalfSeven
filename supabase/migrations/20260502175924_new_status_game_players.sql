-- 1. Rimuoviamo il vecchio vincolo (il nome di default solitamente segue questa sintassi)
ALTER TABLE game_players DROP CONSTRAINT IF EXISTS game_players_status_check;

-- 2. Aggiungiamo il nuovo vincolo con tutti gli stati che utilizzi nella tua app
ALTER TABLE game_players ADD CONSTRAINT game_players_status_check 
CHECK (status IN ('waiting', 'ready', 'playing', 'stood', 'busted', 'spectating'));

-- 3. Impostiamo il default corretto per l'inizio del gioco
ALTER TABLE game_players ALTER COLUMN status SET DEFAULT 'waiting';