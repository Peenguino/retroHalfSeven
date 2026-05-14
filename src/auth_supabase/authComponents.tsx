import { useState } from 'react';
import { supabase } from './supabaseClient';
import { type Provider } from '@supabase/supabase-js';
import '../index.css';

export function AuthComponent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) console.error("Errore di registrazione:", error.message);
    else console.log("Registrazione avvenuta! Controlla l'email.", data);
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) console.error("Errore di login:", error.message);
    else console.log("Login effettuato!", data);
  };

  // Funzione per gestire i login con provider esterni (Google, Discord)
  const handleOAuthLogin = async (provider: Provider) => {
    const { data: _data, error } = await supabase.auth.signInWithOAuth({
      provider,
    });
    if (error) console.error(`Errore di login con ${provider}:`, error.message);
    // Nota: L'OAuth reindirizzerà automaticamente l'utente, non c'è bisogno di loggare il successo qui
  };

  return (
    <div className='auth-card'>

      <h1 style={{ textShadow: '2.5px 2.5px 0 #000, -2.5px -2.5px 0 #000, 2.5px -2.5px 0 #000, -2.5px 2.5px 0 #000' }} > Login </h1>

      <input type="email" onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      
      <button className='homepage-button' onClick={handleSignUp}>Registrati</button>
      <button className='homepage-button' onClick={handleLogin}>Accedi</button>
      
      {/* Separatore visivo */}
      <hr style={{ width: '100%', margin: '15px 0', borderColor: 'rgba(255,255,255,0.2)' }} />

      <button className='homepage-button' onClick={() => handleOAuthLogin('discord')} style={{ backgroundColor: '#5865F2', color: 'white' }}>
          Accedi con Discord
      </button>
    </div>
  );
}