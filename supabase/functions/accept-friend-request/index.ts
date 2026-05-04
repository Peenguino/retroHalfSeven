import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    if (!authHeader) throw new Error('Authorization mancante');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Utente non autorizzato');

    // requester_id è l'ID di chi ci ha mandato la richiesta originariamente
    const { requester_id } = await req.json();
    if (!requester_id) throw new Error('ID mittente mancante');

    // Eseguiamo l'update solo se il chiamante è effettivamente l'addressee_id della richiesta pending
    const { data, error: updateError } = await supabaseAdmin
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('requester_id', requester_id)
      .eq('addressee_id', user.id) // solo il destinatario può accettare
      .eq('status', 'pending')
      .select()
      .single();

    if (updateError || !data) throw new Error('Richiesta non trovata o impossibile da accettare');

    return new Response(
        JSON.stringify({ success: true, message: 'Richiesta accettata' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err: any) {
    console.error("Errore in accept-friend-request:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});