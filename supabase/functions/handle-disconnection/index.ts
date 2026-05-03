import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Gestione in raw per questione utilizzo beam lato frontend
    const rawBody = await req.text();
    const { user_id, game_id } = JSON.parse(rawBody);

    if (!user_id || !game_id) {
      return new Response(
        JSON.stringify({ error: 'Dati mancanti' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Identifichiamo i giocatori per capire chi è l'host (il primo in ordine di joined_at)
    const { data: allPlayers } = await supabaseAdmin
        .from('game_players')
        .select('user_id, status')
        .eq('game_id', game_id)
        .order('joined_at', { ascending: true });

    const isHost = allPlayers && allPlayers.length > 0 && allPlayers[0].user_id === user_id;

    if (isHost) {
        // L'host esce: Terminiamo la partita per tutti
        console.log("L'host ha abbandonato. Chiusura della partita.");
        await supabaseAdmin.from('games').update({ status: 'finished' }).eq('id', game_id);
    } 

    // Gestione del passaggio turno (se non è l'host o se vogliamo comunque passare il turno)
    const { data: game } = await supabaseAdmin
      .from('games')
      .select('status, current_turn_user_id')
      .eq('id', game_id)
      .single();

    if (game && game.status === 'playing' && game.current_turn_user_id === user_id) {
        if (allPlayers) {
            const currentIndex = allPlayers.findIndex((p: any) => p.user_id === user_id);
            let nextPlayerId = null;
            for (let i = currentIndex + 1; i < allPlayers.length; i++) {
                if (allPlayers[i].status === 'playing') {
                    nextPlayerId = allPlayers[i].user_id;
                    break;
                }
            }
            await supabaseAdmin
              .from('games')
              .update({ current_turn_user_id: nextPlayerId })
              .eq('id', game_id);
        }
    }    

    // Facciamo UPDATE dello status a 'left'
    const { error: updateError } = await supabaseAdmin
      .from('game_players')
      .update({ status: 'left' })
      .eq('user_id', user_id)
      .eq('game_id', game_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, message: 'Disconnessione (soft) avvenuta' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Errore:', error);
    return new Response(
      JSON.stringify({ error: 'Errore interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});