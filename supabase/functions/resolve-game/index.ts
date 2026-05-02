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
  console.log("RESOLVE-GAME - Richiesta ricevuta:", { method: req.method, url: req.url });

  if (req.method === 'OPTIONS') {
    console.log("RESOLVE-GAME - Preflight OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("RESOLVE-GAME - Iniziando elaborazione POST");

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

    // Verifica che la partita sia in corso
    if (game.status !== 'playing') {
      return new Response(
        JSON.stringify({ error: "La partita non è già in corso", details: `Status attuale: ${game.status}` }),
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

    // === CALCOLO RISULTATI E IMPORTI ===
    const dealerCards = game.dealer_cards || [];
    const finalDealerScore = calculateScore(dealerCards);
    const dealerBusted = finalDealerScore > 7.5;

    console.log(`Risoluzione: Dealer score=${finalDealerScore}, Busted=${dealerBusted}`);

    const results = [];
    const profileUpdates = [];

    for (const player of players) {
      let result = 'loss'; // di default è perdita
      let winnings = 0; // importo da corrispondere

      // Se il giocatore ha già sballato
      if (player.status === 'busted') {
        result = 'loss';
        winnings = 0; // perde la puntata (già detratta)
      }
      // Se il banco sballa e il giocatore non sballa, il giocatore vince
      else if (dealerBusted && player.status !== 'busted') {
        result = 'win';
        winnings = player.bet * 2; // guadagna l'importo della puntata originale + la puntata
      }
      // Se il banco non sballa, confronta i punteggi
      else if (!dealerBusted) {
        if (player.score > finalDealerScore) {
          result = 'win';
          winnings = player.bet * 2; // guadagna l'importo della puntata originale + la puntata
        } else if (player.score === finalDealerScore) {
          result = 'draw';
          winnings = player.bet; // recupera la puntata (pareggio = push)
        } else {
          result = 'loss';
          winnings = 0; // perde la puntata
        }
      }

      results.push({
        user_id: player.user_id,
        bet: player.bet,
        score: player.score,
        status: player.status,
        result: result,
        winnings: winnings
      });

      // Recupera il bilancio attuale del giocatore
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('balance')
        .eq('id', player.user_id)
        .single();

      if (profileError || !profile) {
        console.error(`Errore nel recuperare il profilo di ${player.user_id}:`, profileError);
        continue;
      }

      const newBalance = profile.balance + winnings;

      // Aggiorna il bilancio del giocatore
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', player.user_id);

      if (updateError) {
        console.error(`Errore nell'aggiornare il bilancio di ${player.user_id}:`, updateError);
      } else {
        console.log(`Giocatore ${player.user_id}: ${result} - Puntata: ${player.bet}, Vincita: ${winnings}, Nuovo bilancio: ${newBalance}`);
      }
    }

    // === AGGIORNAMENTO STATO PARTITA A FINISHED ===
    const { error: gameUpdateError } = await supabaseAdmin
      .from('games')
      .update({ status: 'finished' })
      .eq('id', game_id);

    if (gameUpdateError) {
      console.error("Errore nell'aggiornamento dello stato della partita:", gameUpdateError);
      return new Response(
        JSON.stringify({ error: "Errore nell'aggiornamento della partita", details: gameUpdateError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log("Risoluzione completata. Stato partita cambiato a 'finished'");

    // Ritorno della risposta al client
    return new Response(
      JSON.stringify({
        success: true,
        game_id: game_id,
        dealer_score: finalDealerScore,
        dealer_busted: dealerBusted,
        dealer_cards: dealerCards,
        results: results,
        total_pot: players.reduce((sum, p) => sum + p.bet, 0)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error("Errore nella lambda resolve-game: ", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Errore sconosciuto"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
