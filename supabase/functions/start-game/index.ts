import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Helper per generare e mischiare il deck
function generateDeck() {
  const suits = ['Denari', 'Coppe', 'Spade', 'Bastoni'];
  const deck = [];
  for (const suit of suits) {
    for (let i = 1; i <= 10; i++) {
      const value = i >= 8 ? 0.5 : i;
      deck.push({ suit, rank: i, value });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

serve(async (req) => {
  console.log("START-GAME - Richiesta ricevuta:", { method: req.method, url: req.url });
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { game_id } = body;
    
    if (!game_id) {
      return new Response(JSON.stringify({ error: "game_id mancante" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', game_id)
      .single();

    if (gameError || !game || game.status !== 'waiting') {
      return new Response(JSON.stringify({ error: "Partita non trovata o già iniziata" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    const { data: players, error: playersError } = await supabaseAdmin
      .from('game_players')
      .select('*')
      .eq('game_id', game_id);

    if (playersError || !players || players.length === 0) {
      return new Response(JSON.stringify({ error: "Nessun giocatore trovato" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    // Categorizziamo in modo rigido gli stati
    const readyPlayers = players.filter(p => p.status === 'ready');
    const waitingPlayers = players.filter(p => p.status === 'waiting');

    // Prevenzione Race Condition: 
    // - Se non ci sono player pronti ma qualcuno sta 
    //   già giocando, significa che un'altra esecuzione ha appena avviato la partita.
    if (readyPlayers.length === 0 && players.some(p => p.status === 'playing')) {
      console.log("START-GAME - Partita già avviata da un'altra chiamata concorrente (Race condition bloccata).");
      return new Response(JSON.stringify({ success: true, message: "Race condition evitata" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    if (readyPlayers.length === 0) {
      return new Response(JSON.stringify({ error: "Nessun giocatore pronto" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    // Converti a spettatore SOLO chi era esplicitamente in 'waiting'
    for (const player of waitingPlayers) {
      const { error: spectatorError } = await supabaseAdmin
        .from('game_players')
        .update({ status: 'spectating' })
        .eq('game_id', game_id)
        .eq('user_id', player.user_id);

      if (spectatorError) console.error(`Errore nel convertire a spettatore ${player.user_id}:`, spectatorError);
    }

    const deck = generateDeck();
    for (const player of readyPlayers) {
      const card = deck.pop();
      const { error: updateError } = await supabaseAdmin
        .from('game_players')
        .update({ 
          status: 'playing', 
          cards: [card],
          score: card.value
        })
        .eq('game_id', game_id)
        .eq('user_id', player.user_id);

      if (updateError) console.error(`Errore nell'aggiornare il giocatore ${player.user_id}:`, updateError);
    }

    const { error: gameUpdateError } = await supabaseAdmin
      .from('games')
      .update({
        status: 'playing',
        deck: deck,
        current_turn_user_id: readyPlayers[0].user_id,
        target_start_time: null
      })
      .eq('id', game_id);

    if (gameUpdateError) {
      return new Response(JSON.stringify({ error: "Errore nell'aggiornare la partita" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }
    
    return new Response(JSON.stringify({ success: true, ready_players: readyPlayers.length, spectators: waitingPlayers.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Errore sconosciuto" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
})