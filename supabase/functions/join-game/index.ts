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

    // Permettiamo le operazioni effettuate dal backend ignorando le RLS imposte sullo schema
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );
  
    // Handling oggetto utente ed eventuale errore utente
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Utente non autorizzato');

    const { invite_code } = await request.json();
    if (!invite_code) throw new Error('Codice invito mancante');
  
    // Handling oggetto game ed eventuale errore game
    // - Nello specifico stiamo facendo una query al DB sulla tabella games, filtrando su id e status e matchando l'invite_code
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('id, status')
      .eq('invite_code', invite_code.toUpperCase())
      .single();
  
    if (gameError || !game) throw new Error('Partita non trovata');
    // TODO: successivamente lasciamo entrare giocatori a partita in corso
    if (game.status !== 'waiting') throw new Error('La partita è già iniziata o terminata');
  
    // Check quanti giocatori ci sono o se l'utente è già dentro
    const { data: existingPlayers, error: playersError } = await supabaseAdmin
      .from('game_players')
      .select('user_id')
      .eq('game_id', game.id);
  
    if (playersError) throw playersError;
    if (existingPlayers.some(p => p.user_id === user.id)) {
        throw new Error('Sei già in questa partita');
    }
    // Limite della lobby: 5 players
    if (existingPlayers.length >= 5) {
        throw new Error('La stanza è piena (max 5 giocatori)');
    }
    
    // Handling inserimento nuovo utente in partita
    const { error: joinError } = await supabaseAdmin
      .from('game_players')
      .insert({
        game_id: game.id,
        user_id: user.id,
        status: 'playing'
      });
  
    if (joinError) throw joinError;

    console.log(`Lobby a cui ci siamo uniti ha invite-code: ${invite_code}`)

    return new Response(
      JSON.stringify({ success: true, game_id: game.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error("Errore nella lambda join-game: ", error);
    return new Response(
      JSON.stringify({error: error.message}),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});