import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  console.log("SEND-GAME-INVITE - Richiesta ricevuta:", { method: req.method, url: req.url });
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Inizializzazione Admin Client per scavalcare RLS in scrittura se necessario
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { inviter_id, invitee_id, invite_code } = body;
    
    if (!inviter_id || !invitee_id || !invite_code) {
      return new Response(JSON.stringify({ error: "Parametri mancanti" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    // Verifichiamo che i due utenti siano effettivamente amici
    const { data: friendship, error: friendError } = await supabaseAdmin
      .from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or(`and(requester_id.eq.${inviter_id},addressee_id.eq.${invitee_id}),and(requester_id.eq.${invitee_id},addressee_id.eq.${inviter_id})`)
      .single();

    if (friendError || !friendship) {
      console.error("Tentativo di invito tra non amici bloccato.");
      return new Response(JSON.stringify({ error: "Non puoi invitare un utente che non è tuo amico." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    // Inserimento nella tabella degli inviti
    const { error: insertError } = await supabaseAdmin
      .from('game_invites')
      .insert([{
        inviter_id,
        invitee_id,
        invite_code
      }]);

    if (insertError) {
      console.error("Errore inserimento invito:", insertError);
      return new Response(JSON.stringify({ error: "Errore durante la creazione dell'invito" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }
    
    return new Response(JSON.stringify({ success: true, message: "Invito inviato con successo" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Errore sconosciuto" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});