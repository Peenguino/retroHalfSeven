-- Abilita il realtime per le tabelle del gioco
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table game_players;