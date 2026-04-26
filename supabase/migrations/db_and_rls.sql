-- 1. PROFILI
CREATE TABLE profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    username TEXT UNIQUE,
    balance INTEGER DEFAULT 100 NOT NULL, -- Fiches iniziali
    last_daily_claim TIMESTAMPTZ DEFAULT NOW(), -- Per il bonus giornaliero
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security): Abilita la sicurezza sulla tabella
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Un utente può leggere tutti i profili, ma modificare solo il proprio
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. AMICIZIE
CREATE TABLE friendships (
    requester_id UUID REFERENCES profiles(id) NOT NULL,
    addressee_id UUID REFERENCES profiles(id) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (requester_id, addressee_id)
);


-- Policy + RLS su Amicizie: Puoi vedere o modificare le amicizie solo se sei coinvolto (requester o addressee)
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their friendships" ON friendships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- 3. GESTIONE PARTITA E LOBBY
CREATE TABLE games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invite_code TEXT UNIQUE, -- Es: 'ABC-123' per i link di invito
    status TEXT CHECK (status IN ('waiting', 'playing', 'finished')) DEFAULT 'waiting',
    deck JSONB, -- L'array delle carte mischiate (nascosto al client tramite funzioni)
    dealer_cards JSONB DEFAULT '[]'::jsonb, -- Le carte del banco visibili
    dealer_score INTEGER DEFAULT 0,
    current_turn_user_id UUID REFERENCES profiles(id), -- Di chi è il turno
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
-- Chiunque può leggere lo stato del gioco, ma nessuno può modificarlo direttamente dal client.
CREATE POLICY "Anyone can view games" ON games FOR SELECT USING (true);

-- 4. GESTIONE GAME_PLAYERS
CREATE TABLE game_players (
    game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    bet INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('playing', 'stood', 'busted')) DEFAULT 'playing',
    cards JSONB DEFAULT '[]'::jsonb, -- Carte in mano al giocatore
    score FLOAT DEFAULT 0.0, -- Punteggio attuale (es. 7.5)
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (game_id, user_id)
);

ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view players in a game" ON game_players FOR SELECT USING (true);
-- Anche qui, nessuna policy di scrittura per i client. Gestirà tutto il backend.