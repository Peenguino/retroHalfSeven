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

    // other_user_id è l'ID dell'altro utente coinvolto nell'amicizia da eliminare
    const { other_user_id } = await req.json();
    if (!other_user_id) throw new Error('ID altro utente mancante');

    // Cancelliamo la riga ovunque l'utente chiamante e other_user_id compaiono insieme
    const { error: deleteError } = await supabaseAdmin
      .from('friendships')
      .delete()
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${other_user_id}),and(requester_id.eq.${other_user_id},addressee_id.eq.${user.id})`);

    if (deleteError) throw deleteError;

    return new Response(
        JSON.stringify({ success: true, message: 'Amicizia/Richiesta rimossa' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err: any) {
    console.error("Errore in remove-friendship:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});