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
    console.log("START-GAME - Preflight OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("START-GAME - Iniziando elaborazione POST");
    // Settings iniziali, creazione client che bypassa RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Acquisizione game_id dalla richiesta
    const body = await req.json();
    const { game_id } = body;
    
    if (!game_id) {
      return new Response(
        JSON.stringify({ error: "game_id mancante" }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Query game con error checking
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', game_id)
      .single();

    if (gameError || !game) {
      return new Response(
        JSON.stringify({ error: "Partita non trovata", details: gameError?.message }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (game.status !== 'waiting') {
      return new Response(
        JSON.stringify({ error: "Il gioco è già iniziato" }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Acquisizione dei player pronti con error checking
    const { data: players, error: playersError } = await supabaseAdmin
      .from('game_players')
      .select('*')
      .eq('game_id', game_id)
      .eq('status', 'ready');

    if (playersError) {
      return new Response(
        JSON.stringify({ error: "Errore nel recuperare i giocatori", details: playersError.message }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!players || players.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nessun giocatore pronto" }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Definizione mazzo, distribuzione carta per ciascun giocatore
    const deck = generateDeck();
    for (const player of players) {
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

      if (updateError) {
        console.error(`Errore nell'aggiornare il giocatore ${player.user_id}:`, updateError);
      }
    }

    // Aggiornamento stato della partita
    const { error: gameUpdateError } = await supabaseAdmin
      .from('games')
      .update({
        status: 'playing',
        deck: deck,
        current_turn_user_id: players[0].user_id,
        target_start_time: null
      })
      .eq('id', game_id);

    if (gameUpdateError) {
      return new Response(
        JSON.stringify({ error: "Errore nell'aggiornare la partita", details: gameUpdateError.message }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error("Errore nella lambda start-game: ", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Errore sconosciuto" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})
