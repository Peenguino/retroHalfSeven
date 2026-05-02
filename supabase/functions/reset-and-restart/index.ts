import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  console.log("RESET-AND-RESTART - Richiesta ricevuta:", { method: req.method, url: req.url });

  if (req.method === 'OPTIONS') {
    console.log("RESET-AND-RESTART - Preflight OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("RESET-AND-RESTART - Iniziando elaborazione POST");

    // Creazione client admin che bypassa RLS
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

    // Verifica che la partita sia finita
    if (game.status !== 'finished') {
      return new Response(
        JSON.stringify({ error: "La partita non è ancora conclusa", details: `Status attuale: ${game.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Recupero tutti i giocatori della partita
    const { data: players, error: playersError } = await supabaseAdmin
      .from('game_players')
      .select('*')
      .eq('game_id', game_id);

    if (playersError) {
      return new Response(
        JSON.stringify({ error: "Errore nel recuperare i giocatori", details: playersError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!players || players.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nessun giocatore trovato" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // === RESET DEL TAVOLO ===
    // 1. Converte tutti gli spettatori a playing (saranno pronti per la nuova mano)
    // 2. Resetta tutti i giocatori: ripulisce carte, score, bet, status a 'waiting'
    // 3. Ripulisce il banco: dealer_cards, dealer_score
    // 4. Cambia stato partita a 'waiting'

    console.log(`Inizio reset. Giocatori totali: ${players.length}`);

    // Aggiorna status di tutti i giocatori a 'waiting' e ripulisce i loro dati
    for (const player of players) {
      const { error: updateError } = await supabaseAdmin
        .from('game_players')
        .update({
          status: 'waiting',
          cards: [],
          score: 0,
          bet: 0
        })
        .eq('game_id', game_id)
        .eq('user_id', player.user_id);

      if (updateError) {
        console.error(`Errore nel resettare il giocatore ${player.user_id}:`, updateError);
      } else {
        console.log(`Giocatore ${player.user_id} resettato a waiting`);
      }
    }

    // Ripulisci il banco e resetta la partita a 'waiting'
    const { error: gameResetError } = await supabaseAdmin
      .from('games')
      .update({
        status: 'waiting',
        deck: null,
        dealer_cards: [],
        dealer_score: 0,
        current_turn_user_id: null,
        target_start_time: null
      })
      .eq('id', game_id);

    if (gameResetError) {
      console.error("Errore nel resettare la partita:", gameResetError);
      return new Response(
        JSON.stringify({ error: "Errore nel resettare la partita", details: gameResetError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log("Tavolo resettato. Partita pronta per nuova mano.");

    // Ritorno della risposta al client
    return new Response(
      JSON.stringify({
        success: true,
        game_id: game_id,
        message: "Tavolo resettato e pronto per la prossima mano",
        players_reset: players.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error("Errore nella lambda reset-and-restart: ", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Errore sconosciuto"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
