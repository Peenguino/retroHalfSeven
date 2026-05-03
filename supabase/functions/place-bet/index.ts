import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Utente non autorizzato');

    // Recupero dati dalla POST del client frontend
    const { game_id, bet_amount } = await req.json();

    if (!game_id) throw new Error('ID partita mancante');
    if (!bet_amount || bet_amount <= 0) throw new Error('La puntata deve essere maggiore di zero');

    // Acquisizione dati player
    const { data: player, error: playerError } = await supabaseAdmin
      .from('game_players')
      .select('bet')
      .eq('game_id', game_id)
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) throw new Error('Non fai parte di questa partita');
    if (player.bet > 0) throw new Error('Hai già effettuato la tua puntata per questa mano');

    // Check fondi player
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) throw new Error('Profilo non trovato');
    if (profile.balance < bet_amount) throw new Error('Fondi insufficienti');    

    const newBalance = profile.balance - bet_amount;

    // Rimozione fondi player
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id);
    if (updateProfileError) throw updateProfileError;

    // Aggiorna il tavolo (piazza la puntata e cambia status a "ready")
    const { error: updateBetError } = await supabaseAdmin
      .from('game_players')
      .update({ 
        bet: bet_amount,
        status: 'ready'
      })
      .eq('game_id', game_id)
      .eq('user_id', user.id);
    if (updateBetError) throw updateBetError;

    return new Response(
      JSON.stringify({ success: true, new_balance: newBalance, bet: bet_amount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error("Errore nella lambda place-bet: ", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

})