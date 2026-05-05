import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "https://esm.sh/web-push@3.6.6"; // Aggiunta libreria push

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Impostazione delle chiavi VAPID
webPush.setVapidDetails(
  'mailto:giuseppe_acocella@outlook.it',
  Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { inviter_id, invitee_id, invite_code, game_id } = body;
    
    // Recupera le sottoscrizioni attive dei client dell'amico
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', invitee_id);

    if (subError || !subscriptions || subscriptions.length === 0) {
        // L'amico non ha abilitato le notifiche push. Ritorna comunque successo per l'invito nel DB.
        return new Response(JSON.stringify({ success: true, message: "Invito creato, ma l'utente non ha notifiche push abilitate." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // Costruzione payload atteso dal Service Worker
    const payload = JSON.stringify({
        title: "Nuovo Invito a Giocare!",
        body: "Un tuo amico ti ha appena invitato ad unirti alla sua lobby.",
        action: "JOIN_GAME",
        data: {
             action: "JOIN_GAME",
             inviteCode: invite_code
        }
    });

    // Invio notifica ai vari dispositivi dell'utente
    // - La sottoscrizione include la possibilità di più dispositivi per utente
    // per lasciare quanto più generico possibile lo schema, ma nel reale utilizzo la
    // notifica viene mandata al singolo sw del client web dell'utente invitato
    const pushPromises = subscriptions.map(sub => {
        const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
                auth: sub.auth_key,
                p256dh: sub.p256dh_key
            }
        };
        return webPush.sendNotification(pushSubscription, payload).catch(err => {
            console.error(`Errore invio push all'endpoint ${sub.endpoint}:`, err);
        });
    });

    await Promise.all(pushPromises);
    
    return new Response(JSON.stringify({ success: true, message: "Invito e notifica inviati con successo" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Errore sconosciuto" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});