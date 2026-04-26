// src/userInterfaceComponents/homePage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { type Session } from "@supabase/supabase-js";
import '../supabaseComponents/authComponents.css'
import { AuthComponent } from "../auth_supabase/authComponents";
import { supabase } from "../auth_supabase/supabaseClient";

export default function Homepage() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(false); // Stato per il bottone
    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // FUNZIONE CORE: Invocazione della Lambda
    const handleCreateGame = async () => {
        setLoading(true);
        try {
            // Invochiamo la funzione create-game. 
            // Supabase allega automaticamente il token della sessione.
            const { data, error } = await supabase.functions.invoke('create-game');

            if (error) throw error;

            console.log("Partita creata:", data);
            
            // Una volta creata la partita, navighiamo alla pagina di gioco.
            // Passiamo l'ID della partita nell'URL (es: /playingpage/uuid-della-partita)
            navigate(`/playingpage/${data.game_id}`);

        } catch (err) {
            console.error("Errore creazione partita:", err);
            alert("Non è stato possibile creare la partita. Controlla il terminale delle funzioni.");
        } finally {
            setLoading(false);
        }
    };

    if (!session) {
        return <AuthComponent/>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px' }}>
            <h1>Benvenuto in retroHalfSeven!</h1>
            <p>Accesso effettuato come: <strong>{session.user.email}</strong></p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
                {/* Nuovo bottone per creare la partita tramite Lambda */}
                <button 
                    onClick={handleCreateGame}
                    className='auth-button'
                    disabled={loading}
                >
                    {loading ? "Creazione..." : "Crea Nuova Partita"}
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