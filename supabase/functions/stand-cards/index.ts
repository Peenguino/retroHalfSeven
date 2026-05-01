import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  console.log("STAND-CARDS - Richiesta ricevuta:", { method: req.method, url: req.url });

  if (req.method === 'OPTIONS') {
    console.log("STAND-CARDS - Preflight OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("STAND-CARDS - Iniziando elaborazione POST");

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

    // Verifica che il giocatore sia ancora in gioco
    if (player.status !== 'playing' && player.status !== 'busted') {
      return new Response(
        JSON.stringify({ error: `Non puoi stare, il tuo status è: ${player.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Aggiornamento giocatore: cambio stato a 'stood'
    const { error: playerUpdateError } = await supabaseAdmin
      .from('game_players')
      .update({ status: 'stood' })
      .eq('game_id', game_id)
      .eq('user_id', user.id);

    if (playerUpdateError) {
      return new Response(
        JSON.stringify({ error: "Errore nell'aggiornare il giocatore", details: playerUpdateError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Recupero tutti i giocatori della partita ordinati per joined_at (ordine di turno)
    const { data: allPlayers, error: playersError } = await supabaseAdmin
      .from('game_players')
      .select('user_id, status')
      .eq('game_id', game_id)
      .order('joined_at', { ascending: true });

    if (playersError) {
      return new Response(
        JSON.stringify({ error: "Errore nel recuperare i giocatori", details: playersError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Individua il prossimo giocatore ancora in gioco (status = 'playing')
    const currentPlayerIndex = allPlayers.findIndex(p => p.user_id === user.id);
    let nextTurnUserId: string | null = null;

    for (let i = 1; i < allPlayers.length; i++) {
      const nextIndex = (currentPlayerIndex + i) % allPlayers.length;
      if (allPlayers[nextIndex].status === 'playing') {
        nextTurnUserId = allPlayers[nextIndex].user_id;
        break;
      }
    }

    // Aggiornamento del turno nella partita
    const { error: gameUpdateError } = await supabaseAdmin
      .from('games')
      .update({ current_turn_user_id: nextTurnUserId })
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
        new_status: 'stood',
        next_turn_user_id: nextTurnUserId,
        all_players_finished: nextTurnUserId === null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error("Errore nella lambda stand-cards: ", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Errore sconosciuto"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
