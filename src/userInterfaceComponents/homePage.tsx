// src/userInterfaceComponents/homePage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { type Session } from "@supabase/supabase-js";
import '../supabaseComponents/authComponents.css'
import { AuthComponent } from "../supabaseComponents/authComponents";
import { supabase } from "../supabaseComponents/supabaseClient";

export default function Homepage() {
    const [session, setSession] = useState<Session | null>(null);
    const navigate = useNavigate();

    // Nel componente Homepage setto grazie ad useEffect l'operazione da eseguire a tempo di rendering del componente
    // di conseguenza 
    useEffect(() => {
        // Ottieni la sessione iniziale
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        // Ascolta i cambiamenti di stato (login, logout)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Se non c'è nessuna sessione, mostra la schermata di Login/Registrazione
    if (!session) {
        return <AuthComponent/>;
    }

    // Placeholder Post-Accesso
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px' }}>
            <h1>Benvenuto in retroHalfSeven!</h1>
            <p>Accesso effettuato come: <strong>{session.user.email || 'Utente OAuth'}</strong></p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                    onClick={() => navigate('/playingpage')}
                    className='auth-button'
                >
                    Gioca Ora
                </button>
                <button 
                    onClick={() => supabase.auth.signOut()}
                    className='auth-button'
                >
                    Esci
                </button>
            </div>
        </div>
    );
}