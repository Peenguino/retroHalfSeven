-- TABELLA PER ISCRIZIONI PUSH NOTIFICATIONS
CREATE TABLE push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    device_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Index per query veloce per user_id
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Abilita RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy RLS: Gli utenti possono leggere, inserire e aggiornare solo i propri record
CREATE POLICY "Users can view their own subscriptions"
ON push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
ON push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
ON push_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
ON push_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- ESTENSIONE DELLA TABELLA game_invites
ALTER TABLE game_invites
ADD COLUMN notification_sent_at TIMESTAMPTZ,
ADD COLUMN notification_clicked BOOLEAN DEFAULT FALSE;
