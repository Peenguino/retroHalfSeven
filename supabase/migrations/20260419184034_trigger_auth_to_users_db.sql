-- 1. Creiamo la funzione che inserisce il profilo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, balance)
  -- Usiamo l'email come username di default se non fornito, e diamo 1000 fiches
  VALUES (new.id, split_part(new.email, '@', 1), 1000);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Creiamo il trigger che scatta in automatico su 'auth.users'
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();