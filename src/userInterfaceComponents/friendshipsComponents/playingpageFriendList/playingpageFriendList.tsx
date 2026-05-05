import { useState, useEffect } from 'react';
import { supabase } from '../../../auth_supabase/supabaseClient';

export default function PlayingPageFriendsList({ currentUserId, inviteCode }: { currentUserId: string, inviteCode: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [friends, setFriends] = useState<any[]>([]);
    const [invitedIds, setInvitedIds] = useState<string[]>([]); // Per feedback visivo

    useEffect(() => {
        if (isOpen) {
            loadFriendsList();
        }
    }, [isOpen]);

    const loadFriendsList = async () => {
        // Acquisizione amicizie accettate dell'utente
        const { data: friendships, error: friendError } = await supabase
            .from('friendships')
            .select('*')
            .eq('status', 'accepted')
            .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

        if (friendError || !friendships) {
            console.error("Errore nel recupero amicizie:", friendError);
            return;
        }

        if (friendships.length === 0) {
            setFriends([]);
            return;
        }

        // Prendiamo solo gli ID degli amici
        const friendIds = friendships.map(f => 
            f.requester_id === currentUserId ? f.addressee_id : f.requester_id
        );

        // Recuperiamo username dalla tabella profiles
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', friendIds);

        if (profileError) {
            console.error("Errore nel recupero profili amici:", profileError);
            return;
        }

        setFriends(profiles || []);
    };

    const handleInviteFriend = async (friendId: string) => {
        if (invitedIds.includes(friendId)) return; // Evita doppi click

        try {
            // Chiamata alla edge function
            const { error } = await supabase.functions.invoke('send-game-invite', {
                body: { 
                    inviter_id: currentUserId, 
                    invitee_id: friendId, 
                    invite_code: inviteCode 
                }
            });

            if (error) throw error;

            console.log(`Invitato amico ${friendId} alla partita con codice ${inviteCode}`);
            setInvitedIds(prev => [...prev, friendId]);
            
        } catch (err) {
            console.error("Errore durante l'invio dell'invito:", err);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: '100px', right: isOpen ? 0 : '-300px', width: '300px', height: 'auto', maxHeight: '60vh',
            backgroundColor: 'rgba(0,0,0,0.95)', color: 'white', zIndex: 40,
            transition: 'right 0.3s ease-in-out', border: '1px solid rgba(255,255,255,0.1)',
            borderRight: 'none', borderRadius: '10px 0 0 10px', display: 'flex', flexDirection: 'column', padding: '15px',
            boxShadow: '-5px 5px 15px rgba(0,0,0,0.5)'
        }}>
            {/* Bottone Freccia */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'absolute', left: '-30px', top: '20px',
                    width: '30px', height: '50px', backgroundColor: 'rgba(0,0,0,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRight: 'none',
                    color: 'white', cursor: 'pointer', borderRadius: '5px 0 0 5px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
                }}
            >
                {isOpen ? '▶' : '◀'}
            </button>

            <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>
                Invita Amici
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px', overflowY: 'auto' }}>
                {friends.length === 0 ? (
                    <div style={{ color: '#888', textAlign: 'center', padding: '10px', fontSize: '14px' }}>
                        Nessun amico trovato.
                    </div>
                ) : (
                    friends.map(friend => {
                        const isInvited = invitedIds.includes(friend.id);
                        return (
                            <div key={friend.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <span>{friend.username}</span>
                                <button 
                                    onClick={() => handleInviteFriend(friend.id)} 
                                    disabled={isInvited}
                                    style={{
                                        backgroundColor: isInvited ? '#868e96' : '#51cf66', 
                                        color: '#000', border: 'none',
                                        padding: '5px 10px', borderRadius: '5px', 
                                        cursor: isInvited ? 'default' : 'pointer', 
                                        fontSize: '12px', fontWeight: 'bold'
                                    }}
                                >
                                    ✓
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}