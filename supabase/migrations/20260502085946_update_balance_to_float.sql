-- Cambia il tipo della colonna balance in FLOAT
ALTER TABLE public.profiles 
ALTER COLUMN balance TYPE FLOAT;

-- Cambia il tipo della colonna bet in FLOAT
ALTER TABLE public.game_players 
ALTER COLUMN bet TYPE FLOAT;