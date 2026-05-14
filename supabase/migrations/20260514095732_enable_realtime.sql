-- Attivazione realtime sulle due tabelle utili alle websocket nella playingPage
alter publication supabase_realtime add table games, game_players;