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
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token || token === 'undefined' || token === 'null') {
      throw new Error('Token JWT mancante o non pronto');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Identifica l'utente chiamante
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) throw new Error('Utente non autorizzato');

    // Parse request body
    const body = await req.json();
    const { endpoint, keys, device_name } = body;

    if (!endpoint || !keys || !keys.auth || !keys.p256dh) {
      throw new Error('Parametri subscription mancanti (endpoint, keys.auth, keys.p256dh)');
    }

    // Se esiste già subscription per questo endpoint, 
    // aggiorna last_used_at, altrimenti crea nuova
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)
      .maybeSingle();

    let result;

    if (existing) {
      // Aggiornamento sottoscrizione push già esistente
      const { error: updateError } = await supabaseAdmin
        .from('push_subscriptions')
        .update({
          last_used_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
      result = { subscription_id: existing.id, action: 'updated' };
    } else {
      // Inserimento sottoscrizione push nuova
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          endpoint,
          auth_key: keys.auth,
          p256dh_key: keys.p256dh,
          device_name: device_name || 'Unknown Device',
          created_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      result = { subscription_id: inserted.id, action: 'created' };
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err: any) {
    console.error("Errore in subscribe-push-notifications:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});