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
    console.log("OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // ==========================================
    // MODIFICA 1: Leggiamo il body come stringa per supportare sendBeacon
    // ==========================================
    const rawBody = await req.text();
    const { user_id, game_id } = JSON.parse(rawBody);

    const { data: game } = await supabaseAdmin
      .from('games')
      .select('status, current_turn_user_id')
      .eq('id', game_id)
      .single();

    if (game && game.status === 'playing' && game.current_turn_user_id === user_id) {
        const { data: activePlayers } = await supabaseAdmin
            .from('game_players')
            .select('user_id, status')
            .eq('game_id', game_id)
            .order('joined_at', { ascending: true });

        if (activePlayers) {
            const currentIndex = activePlayers.findIndex((p: any) => p.user_id === user_id);
            let nextPlayerId = null;
            
            for (let i = currentIndex + 1; i < activePlayers.length; i++) {
                if (activePlayers[i].status === 'playing') {
                    nextPlayerId = activePlayers[i].user_id;
                    break;
                }
            }

            await supabaseAdmin
                .from('games')
                .update({ current_turn_user_id: nextPlayerId })
                .eq('id', game_id);
        }
    }    

    if (!user_id || !game_id) {
      return new Response(
        JSON.stringify({ error: 'user_id e game_id sono obbligatori' }),
        // MODIFICA 2: Aggiunti i corsHeaders
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Disconnessione: user_id=${user_id}, game_id=${game_id}`)

    const { error: deleteError } = await supabaseAdmin
      .from('game_players')
      .delete()
      .eq('user_id', user_id)
      .eq('game_id', game_id)

    if (deleteError) {
      console.error('Errore nella rimozione del giocatore:', deleteError)
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        // MODIFICA 2: Aggiunti i corsHeaders
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Giocatore ${user_id} rimosso dalla partita ${game_id}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Giocatore disconnesso correttamente' }),
      // MODIFICA 2: Aggiunti i corsHeaders
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Errore nella funzione handle-disconnect:', error)
    return new Response(
      JSON.stringify({ error: 'Errore interno del server' }),
      // MODIFICA 2: Aggiunti i corsHeaders
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})