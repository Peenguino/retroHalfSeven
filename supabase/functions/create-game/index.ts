import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// === Generazione deck
function generateShuffledDeck() {
  const suits = ['Coppe', 'Spade', 'Bastoni', 'Denari'];
  const deck = [];

  for (const suit of suits) {
    for (let i = 1; i <= 10; i++) {
      const points = 
        (i >= 8) ? 0.5 
        : i;
      const name = 
        (i === 8) ? 'Donna' 
        : (i === 9) ? 'Cavallo' 
        : (i === 10) ? 'Re' 
        : i.toString();
      
      deck.push({ suit, value: i, points, name });
    }
  }

  // = Deck shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

// === La serve() di Deno risponde a tutti i verbi HTTPS dato che non stiamo seguendo un approccio centralizzato
// come in Express ma stiamo definendo tanti endpoint indipendenti grazie alle Edge Functions 
// Questo porta ad un comportamento per il quale non si definisce esplicitamente il tipo di verbo richiesto, come in questo caso il POST.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Recupera l'header di autorizzazione (il token dell'utente loggato su React)
    const authHeader = req.headers.get('Authorization')!;

    // Usiamo la SUPABASE_SERVICE_ROLE_KEY. BYPASSA tutte le RLS.
    // Lo facciamo perché il frontend non ha il permesso di fare INSERT nella tabella games, 
    // solo questa lambda ha l'autorità di farlo.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Identifica l'utente che sta chiamando la funzione
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Utente non autorizzato');

    // Genera un codice invito univoco
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const deck = generateShuffledDeck();

    // Crea la partita nel database
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .insert({
        invite_code: inviteCode,
        deck: deck,
        status: 'waiting',
        current_turn_user_id: user.id // Il creatore farà la prima mossa/puntata
      })
      .select('id, invite_code, status') // Non restituiamo il mazzo al client!
      .single();

    if (gameError) throw gameError;

    // Aggiungi il creatore come giocatore in attesa nella lobby
    const { error: playerError } = await supabaseAdmin
      .from('game_players')
      .insert({
        game_id: game.id,
        user_id: user.id,
        status: 'playing'
      });

    if (playerError) throw playerError;

    // Ritorna il risultato al frontend
    return new Response(
      JSON.stringify({ game_id: game.id, invite_code: game.invite_code }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error("Errore nella lambda: ", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});