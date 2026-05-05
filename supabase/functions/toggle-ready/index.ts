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

    const { game_id, is_ready } = await req.json();
    if (!game_id) throw new Error('ID partita mancante');

    const newStatus = is_ready ? 'ready' : 'waiting';

    const { error: updateError } = await supabaseAdmin
      .from('game_players')
      .update({ status: newStatus })
      .eq('game_id', game_id)
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    // Query di tutti i giocatori per vedere quanti sono pronti
    const { data: players } = await supabaseAdmin
      .from('game_players')
      .select('status')
      .eq('game_id', game_id);

    if (players) {
      const allReady = players.every(p => p.status === 'ready');
      const anyReady = players.some(p => p.status === 'ready');

      const { data: gameData } = await supabaseAdmin
          .from('games')
          .select('target_start_time, status')
          .eq('id', game_id)
          .single();

      if (gameData && gameData.status === 'waiting') {
        // Se tutti sono pronti, imposta il timer breve per l'avvio
        if (allReady) {
              console.log("Tutti i giocatori sono pronti. Imposto il timer.");
              const targetTime = new Date();
              targetTime.setSeconds(targetTime.getSeconds() + 3);

              await supabaseAdmin
                .from('games')
                .update({ target_start_time: targetTime.toISOString() })
                .eq('id', game_id);
        } 
        // Se c'è almeno un pronto e il timer NON è ancora stato settato allora viene settato il timer
        else if (anyReady && !allReady && !gameData.target_start_time) {
          // Imposta il timer
          console.log("Almeno un giocatore è pronto. Imposto il timer.");
          const targetTime = new Date();
          targetTime.setSeconds(targetTime.getSeconds() + 10);

          await supabaseAdmin
            .from('games')
            .update({ target_start_time: targetTime.toISOString() })
            .eq('id', game_id);
        }
        // Se nessuno è pronto ma esiste un time allora lo si azzera
        else if (!anyReady && gameData.target_start_time) {
              console.log("Nessun giocatore pronto. Azzero il timer.");
              await supabaseAdmin
                .from('games')
                .update({ target_start_time: null })
                .eq('id', game_id);
        }
      }
    }

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error("Errore nella lambda toggle-ready: ", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});