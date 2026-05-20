import { useState, useEffect } from 'react';
import { supabase } from '../../../auth_supabase/supabaseClient';

import './playingpageFriendList.css'

export default function PlayingPageFriendsList({ currentUserId, inviteCode, gameId }: { currentUserId: string, inviteCode: string, gameId: string }) {
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
                    invite_code: inviteCode,
                    game_id: gameId
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
        <div className='friend-list' 
            style={{
            right: isOpen ? 0 : '-300px'
        }}>
            {/* Freccia che permette apertura che chiusura del menu laterale amici */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className='arrow-button-friend-list'
            >
                {isOpen ? '▶' : '◀'}
            </button>

            <div className='invite-friend-title'>
                Invita Amici
            </div>

            <div className='friend-row-container'>
                {friends.length === 0 ? (
                    <div className='no-friend-row'>
                        Nessun amico trovato.
                    </div>
                ) : (
                    friends.map(friend => {
                        const isInvited = invitedIds.includes(friend.id);
                        return (
                            <div key={friend.id} className='friend-row'>
                                <span>{friend.username}</span>
                                <button 
                                    onClick={() => handleInviteFriend(friend.id)} 
                                    disabled={isInvited}
                                    className='invite-button'
                                    style={{
                                        backgroundColor: isInvited ? '#868e96' : '#51cf66',
                                        cursor: isInvited ? 'default' : 'pointer'
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