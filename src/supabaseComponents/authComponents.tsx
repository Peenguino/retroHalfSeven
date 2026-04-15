import { useState } from 'react';
import { supabase } from './supabaseClient';
import './authComponents.css'

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

  // Funzione per il logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className='auth-container'>
        <div className='game-title'> retroHalfSeven </div>
      <div className='auth-card'>
        <input type="email" onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button onClick={handleSignUp}>Registrati</button>
        <button onClick={handleLogin}>Accedi</button>
        <button onClick={handleLogout}>Esci</button>
      </div>
    </div>
  );
}