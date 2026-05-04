// src/userInterfaceComponents/homePage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { type Session } from "@supabase/supabase-js";
import { AuthComponent } from "../auth_supabase/authComponents";
import HomepageFriendsList from "./friendshipsComponents/homepageFriendsList/homepageFriendsList";
import { supabase } from "../auth_supabase/supabaseClient";

export default function Homepage() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
        return () => subscription.unsubscribe();
    }, []);

    const handleCreateGame = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-game');
            if (error) throw error;
            console.log(data.invite_code);
            navigate(`/playingpage/${data.game_id}`);
        } catch (err) {
            alert("Errore creazione partita");
        } finally {
            setLoading(false);
        }
    };

    const handleJoinGame = async () => {
        if (!inviteCode) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('join-game', {
                body: { invite_code: inviteCode }
            });
            if (error) throw error;
            navigate(`/playingpage/${data.game_id}`);
        } catch (err) {
            alert("Codice non valido o partita piena");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="homepage-container">
            <div className='game-title'> retroHalfSeven </div>

            {!session ? (
                <AuthComponent />
            ) : (

                <>
                    <div className="auth-card">
                        <p className="welcome-text">
                            BENVENUTO, <br/> {session.user.email}
                        </p>
                        
                        {/* Sezione Creazione */}
                        <button className='homepage-button' onClick={handleCreateGame} disabled={loading}>
                            {loading ? "CARICAMENTO..." : "CREA PARTITA"}
                        </button>

                        <hr style={{ width: '100%', borderColor: '#000' }} />

                        {/* Sezione Unisciti */}
                        <input 
                            type="text" 
                            placeholder="CODICE INVITO" 
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        />
                        <button className='homepage-button' onClick={handleJoinGame} disabled={loading || !inviteCode}>
                            ENTRA NELLA LOBBY
                        </button>

                        <button className='homepage-button' onClick={() => supabase.auth.signOut()} style={{ marginTop: '20px', backgroundColor: '#8b0000', color: '#fff' }}>
                            ESCI
                        </button>
                    </div>
                    <HomepageFriendsList currentUserId={session.user.id} />

                </>

            )}
        </div>
    );
}