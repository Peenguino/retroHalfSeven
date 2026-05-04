-- GESTIONE INVITI
CREATE TABLE game_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inviter_id UUID REFERENCES profiles(id) NOT NULL,
    invitee_id UUID REFERENCES profiles(id) NOT NULL,
    invite_code TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE game_invites ENABLE ROW LEVEL SECURITY;

-- Policy RLS: Un utente può vedere gli inviti che ha inviato o ricevuto
CREATE POLICY "Users can view their own invites" 
ON game_invites FOR SELECT 
USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);