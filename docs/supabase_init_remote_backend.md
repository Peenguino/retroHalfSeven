# Configurazione Linking con Supabase

```bash
# Assumendo di avere installato Supabase tra i node_modules

# - Effettua login e linking al progetto remoto
npx supabase login
npx supabase link --project-ref <PROJECT-ID>

# - Applica le query in migrations al db remoto
npx supabase db push

# - Deploy al remoto delle functions contenute in ./supabase/functions
npx supabase functions deploy

# - Setting della key in remoto per Supabase Admin
npx supabase secrets set SERVICE_ROLE_KEY=<SUPABASE_SERVICE_ROLE_KEY>

```