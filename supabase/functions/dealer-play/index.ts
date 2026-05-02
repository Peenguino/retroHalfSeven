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
  console.log("DEALER-PLAY - Richiesta ricevuta:", { method: req.method, url: req.url });

  if (req.method === 'OPTIONS') {
    console.log("DEALER-PLAY - Preflight OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("DEALER-PLAY - Iniziando elaborazione POST");

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
        JSON.stringify({ error: "La partita non è in corso" }),
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

    // === LOGICA DEL BANCO ===
    // Il banco pesca finché il suo punteggio è <= 6
    // Sette e Mezzo: il limite di pesca è 6 (diverso ad esempio da Blackjack che è 16/17)
    let dealerCards = game.dealer_cards || [];
    let deck = [...(game.deck || [])];

    console.log(`Inizio gioco del banco. Deck rimanente: ${deck.length} carte. Dealer score attuale: ${game.dealer_score}`);

    // Pesca del banco: continua finché score <= 6
    while (game.dealer_score <= 6 && deck.length > 0) {
      const card = deck.pop();
      dealerCards.push(card);
      const newDealerScore = calculateScore(dealerCards);
      
      console.log(`Banco pesca: ${card.rank} di ${card.suit}. Nuovo score: ${newDealerScore}`);
      
      // Aggiorna il game con le nuove carte del banco
      const { error: updateError } = await supabaseAdmin
        .from('games')
        .update({
          dealer_cards: dealerCards,
          dealer_score: newDealerScore,
          deck: deck
        })
        .eq('id', game_id);

      if (updateError) {
        console.error("Errore nell'aggiornare il banco:", updateError);
        return new Response(
          JSON.stringify({ error: "Errore nell'aggiornare il banco", details: updateError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Aggiorna il punteggio del banco per il prossimo ciclo
      game.dealer_score = newDealerScore;

      // Delay di 1.2 sec banco per pescare nuova carta
      await new Promise(resolve => setTimeout(resolve, 1200))

    }

    const finalDealerScore = calculateScore(dealerCards);
    const dealerBusted = finalDealerScore > 7.5;

    console.log(`Banco finisce con score: ${finalDealerScore}. Sballato: ${dealerBusted}`);

    // Calcolo risultati players
    const results = players.map(player => {
      let result = 'loss'; // di default è perdita
      
      // Se il giocatore ha già sballato
      if (player.status === 'busted') {
        result = 'loss';
      }
      // Se il banco sballa e il giocatore non sballa, il giocatore vince
      else if (dealerBusted && player.status !== 'busted') {
        result = 'win';
      }
      // Se il banco non sballa, confronta i punteggi
      else if (!dealerBusted) {
        if (player.score > finalDealerScore) {
          result = 'win';
        } else if (player.score === finalDealerScore) {
          result = 'draw';
        } else {
          result = 'loss';
        }
      }

      return {
        user_id: player.user_id,
        bet: player.bet,
        score: player.score,
        status: player.status,
        result: result
      };
    });

    console.log("Risultati della mano:", results);

    // Ritorno della risposta al client
    return new Response(
      JSON.stringify({
        success: true,
        dealer_score: finalDealerScore,
        dealer_busted: dealerBusted,
        dealer_cards: dealerCards,
        results: results,
        message: `Banco finisce con ${finalDealerScore}${dealerBusted ? ' - SBALLATO' : ''}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error("Errore nella lambda dealer-play: ", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Errore sconosciuto"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
