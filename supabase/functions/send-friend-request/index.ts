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

    // Identifica l'utente chiamante (chi invia la richiesta)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Utente non autorizzato');

    // addressee_id è l'ID dell'utente a cui stiamo chiedendo l'amicizia
    const { addressee_id } = await req.json();
    if (!addressee_id) throw new Error('ID destinatario mancante');
    if (user.id === addressee_id) throw new Error('Non puoi inviare una richiesta a te stesso');

    // Controlliamo se esiste già un'amicizia (in qualsiasi stato, in un verso o nell'altro)
    const { data: existing, error: existError } = await supabaseAdmin
      .from('friendships')
      .select('status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addressee_id}),and(requester_id.eq.${addressee_id},addressee_id.eq.${user.id})`)
      .single();

    if (existing) {
        throw new Error(`Esiste già una relazione con questo utente (Stato: ${existing.status})`);
    }

    // Inseriamo la nuova amicizia con stato di default 'pending'
    const { error: insertError } = await supabaseAdmin
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: addressee_id,
        status: 'pending'
      });

    if (insertError) throw insertError;

    return new Response(
        JSON.stringify({ success: true, message: 'Richiesta inviata con successo' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err: any) {
    console.error("Errore in send-friend-request:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});