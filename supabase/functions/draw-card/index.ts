import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Helper per calcolare il punteggio totale data un array di carte
function calculateScore(cards: Array<{ suit: string; rank: number; value: number }>) {
  return cards.reduce((total, card) => total + card.value, 0);
}

serve(async (req) => {
  console.log("DRAW-CARD - Richiesta ricevuta:", { method: req.method, url: req.url });

  if (req.method === 'OPTIONS') {
    console.log("DRAW-CARD - Preflight OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("DRAW-CARD - Iniziando elaborazione POST");

    // Recupero dell'utente autenticato dal token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Header Authorization mancante" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Creazione client admin che bypassa RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Identificazione utente tramite token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Utente non autorizzato" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Acquisizione game_id dalla richiesta
    const body = await req.json();
    const { game_id } = body;

    if (!game_id) {
      return new Response(
        JSON.stringify({ error: "game_id mancante" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Recupero dati della partita
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', game_id)
      .single();

    if (gameError || !game) {
      return new Response(
        JSON.stringify({ error: "Partita non trovata", details: gameError?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Verifica che la partita sia in corso
    if (game.status !== 'playing') {
      return new Response(
        JSON.stringify({ error: "La partita non è in corso" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verifica che sia il turno dell'utente
    if (game.current_turn_user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Non è il tuo turno" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Recupero dati del giocatore
    const { data: player, error: playerError } = await supabaseAdmin
      .from('game_players')
      .select('*')
      .eq('game_id', game_id)
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      return new Response(
        JSON.stringify({ error: "Giocatore non trovato in questa partita" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Verifica che il giocatore non sia già sballato o fermo
    if (player.status !== 'playing') {
      return new Response(
        JSON.stringify({ error: `Non puoi pescare, il tuo status è: ${player.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verifica che il mazzo non sia vuoto
    if (!game.deck || game.deck.length === 0) {
      return new Response(
        JSON.stringify({ error: "Il mazzo è finito" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Estrazione della carta dal mazzo
    const newDeck = [...game.deck];
    const drawnCard = newDeck.pop();

    // Aggiornamento delle carte del giocatore
    const updatedCards = [...player.cards, drawnCard];
    const newScore = calculateScore(updatedCards);

    // Determinazione del nuovo status basato sul punteggio
    let newStatus = 'playing';
    if (newScore > 7.5) {
      newStatus = 'busted';
    }

    // Aggiornamento giocatore
    const { error: playerUpdateError } = await supabaseAdmin
      .from('game_players')
      .update({
        cards: updatedCards,
        score: newScore,
        status: newStatus
      })
      .eq('game_id', game_id)
      .eq('user_id', user.id);

    if (playerUpdateError) {
      return new Response(
        JSON.stringify({ error: "Errore nell'aggiornare il giocatore", details: playerUpdateError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Aggiornamento deck nella partita
    const { error: gameUpdateError } = await supabaseAdmin
      .from('games')
      .update({ deck: newDeck })
      .eq('id', game_id);

    if (gameUpdateError) {
      return new Response(
        JSON.stringify({ error: "Errore nell'aggiornare la partita", details: gameUpdateError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Ritorno della risposta al client
    return new Response(
      JSON.stringify({
        success: true,
        card: drawnCard,
        new_score: newScore,
        new_status: newStatus,
        busted: newStatus === 'busted'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error("Errore nella lambda draw-card: ", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Errore sconosciuto"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
