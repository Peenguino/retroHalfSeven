-- Aggiunta dello status 'spectating' al CHECK constraint di game_players
ALTER TABLE public.game_players DROP CONSTRAINT IF EXISTS game_players_status_check;
ALTER TABLE public.game_players ADD CONSTRAINT game_players_status_check CHECK (status IN ('waiting', 'ready', 'playing', 'stood', 'busted', 'spectating'));
