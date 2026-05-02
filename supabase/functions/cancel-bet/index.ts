import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (request) => {

  if(request.method === 'OPTIONS') {
    return new Response('ok', {headers: corsHeaders});
  }

  try {
    const authHeader = request.headers.get('Authorization')!;

    // Client Admin per bypassare le RLS ed eseguire operazioni sicure lato server
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
  
    // Verifica utente
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Utente non autorizzato');

    // Acquisizione payload
    const { game_id } = await request.json();
    if (!game_id) throw new Error('ID Partita mancante');

    // 3. Recupero dei dati attuali del giocatore in questa partita
    const { data: player, error: playerError } = await supabaseAdmin
      .from('game_players')
      .select('bet, status')
      .eq('game_id', game_id)
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) throw new Error('Giocatore non trovato nella partita');

    // Se la puntata è già 0, non c'è nulla da rimborsare
    if (player.bet <= 0) {
        return new Response(
            JSON.stringify({ success: true, message: 'Nessuna puntata da rimborsare' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    }

    const refundAmount = player.bet;

    // Lettura saldo attuale dal profilo
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) throw new Error('Profilo utente non trovato');

    // Eseguiamo il rimborso sul profilo (vecchio saldo + rimborso)
    const { error: refundError } = await supabaseAdmin
      .from('profiles')
      .update({ balance: profile.balance + refundAmount })
      .eq('id', user.id);

    if (refundError) throw new Error('Errore durante il rimborso sul saldo');

    // Azzeriamo la bet e riportiamo lo status a 'waiting'
    const { error: resetError } = await supabaseAdmin
      .from('game_players')
      .update({ 
        bet: 0, 
        status: 'waiting' 
      })
      .eq('game_id', game_id)
      .eq('user_id', user.id);

    if (resetError) throw new Error('Errore durante il reset dello stato in partita');

    // Handle update del timer per tutti gli utenti in caso di annullamento bet
    const { error: gameUpdateError } = await supabaseAdmin
      .from('games')
      .update({ target_start_time: null })
      .eq('id', game_id);

    if (gameUpdateError) {
      console.error("Errore durante il reset del timer della partita:", gameUpdateError);
    }

    console.log(`Puntata annullata per ${user.id} nel game ${game_id}. Rimborsati: €${refundAmount}`);

    return new Response(
      JSON.stringify({ success: true, refunded: refundAmount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error("Errore nella lambda cancel-bet: ", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});