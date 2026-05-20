import { useState, useEffect } from 'react';
import { useOfflineStatus } from '../../../utils/useOfflineStatus';
import { indexedDBManager } from '../../../utils/indexedDBManager';
import { supabase } from '../../../auth_supabase/supabaseClient';

export default function HomepageFriendsList({ currentUserId }: { currentUserId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Stati per le varie sezioni
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);

    const isOffline = useOfflineStatus()
    
    // Stato per tracciare le richieste inviate nella sessione corrente
    const [sentRequests, setSentRequests] = useState<string[]>([]);

    // Invocato con deps su isOpen e isOffline per ricaricare
    useEffect(() => {
        if (isOpen) {
            loadFriendsData();
        }
    }, [isOpen, isOffline]);

    // Handler per invio richiesta amicizia
    const sendFriendRequest = async (addresseeId: string) => {
        if (isOffline) return; // Blocco di sicurezza

        const { data, error } = await supabase.functions.invoke('send-friend-request', {
            body: { addressee_id: addresseeId }
        });

        if (!error) {
            setSentRequests(prev => [...prev, addresseeId]);
        } else {
            console.error("Errore invio richiesta:", error);
        }
        return { data, error };
    };

    // Handler per accettare amicizia
    const acceptFriendRequest = async (requesterId: string) => {
        if (isOffline) return;

        const { data, error } = await supabase.functions.invoke('accept-friend-request', {
            body: { requester_id: requesterId }
        });

        if (!error) {
            const acceptedReq = pendingRequests.find(req => req.requester_id === requesterId);
            setPendingRequests(prev => prev.filter(req => req.requester_id !== requesterId));
            
            if (acceptedReq) {
                setFriends(prev => [...prev, {
                    id: acceptedReq.requester.id,
                    username: acceptedReq.requester.username,
                    requester_id: requesterId,
                    addressee_id: currentUserId
                }]);
            }
        } else {
            console.error("Errore accettazione richiesta:", error);
        }
        return { data, error };
    };

    // Handler per rimuovere amico o rifiutare la pending
    const removeFriendship = async (otherUserId: string) => {
        if (isOffline) return;

        const { data, error } = await supabase.functions.invoke('remove-friendship', {
            body: { other_user_id: otherUserId }
        });

        if (!error) {
            setFriends(prev => prev.filter(f => f.id !== otherUserId));
            setPendingRequests(prev => prev.filter(req => req.requester_id !== otherUserId));
        } else {
            console.error("Errore rimozione amicizia:", error);
        }
        return { data, error };
    };

    const loadFriendsData = async () => {
        const loadFromIndexedDB = async () => {
            try {
                const cachedFriends = await indexedDBManager.getFriendsList(currentUserId);
                if (cachedFriends) {
                    setFriends(cachedFriends);
                }
            } catch (error) {
                console.error("Errore IndexedDB:", error);
            }
        };

        if (!isOffline) {
            try {
                const { data: pendingData, error: pendingError } = await supabase
                    .from('friendships')
                    .select(`
                        requester_id,
                        addressee_id,
                        status,
                        created_at,
                        requester:profiles!friendships_requester_id_fkey (id, username)
                    `)
                    .eq('addressee_id', currentUserId)
                    .eq('status', 'pending');

                if (pendingError) throw pendingError;

                const { data: friendsData, error: friendsError } = await supabase
                    .from('friendships')
                    .select(`
                        requester_id,
                        addressee_id,
                        status,
                        requester:profiles!friendships_requester_id_fkey (id, username),
                        addressee:profiles!friendships_addressee_id_fkey (id, username)
                    `)
                    .eq('status', 'accepted')
                    .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

                if (friendsError) throw friendsError;

                const formattedPending = (pendingData || []).map((req: any) => {
                    const requesterData = Array.isArray(req.requester) ? req.requester[0] : req.requester;
                    return { ...req, requester: requesterData };
                });

                const formattedFriends = (friendsData || []).map((f: any) => {
                    const rawProfile = f.requester_id === currentUserId ? f.addressee : f.requester;
                    const friendProfile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
                    return {
                        id: friendProfile?.id,
                        username: friendProfile?.username,
                        requester_id: f.requester_id,
                        addressee_id: f.addressee_id 
                    };
                });

                setPendingRequests(formattedPending);
                setFriends(formattedFriends);
                setSentRequests([]);

                // Salva nel DB locale per il prossimo utilizzo offline
                await indexedDBManager.saveFriendsList(currentUserId, formattedFriends);

            } catch (err) {
                console.error("Errore fetch Supabase, fallback su IndexedDB:", err);
                await loadFromIndexedDB(); 
            }
        } else {
            console.log("Sei offline, carico dati amici da IndexedDB");
            await loadFromIndexedDB();
        }
    };

    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.length > 2) {
            // CORRETTO: Uso isOffline invece di navigator.onLine
            if (isOffline) {
                setSearchResults([]);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .ilike('username', `%${query}%`)
                    .neq('id', currentUserId)
                    .limit(10);

                if (error) throw error;
                setSearchResults(data || []);
            } catch (error) {
                console.error("Errore durante la ricerca giocatori:", error);
                setSearchResults([]);
            }
        } else {
            setSearchResults([]);
        }
    };

    return (
        <>
            {isOpen && (
                <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 39 }}
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div style={{
                position: 'fixed', top: 0, right: isOpen ? 0 : '-350px', width: '350px', height: '100dvh',
                backgroundColor: 'rgba(0,0,0,0.95)', color: 'white', zIndex: 40,
                transition: 'right 0.3s ease-in-out', borderLeft: '1px solid rgba(255,255,255,0.1)'
            }}>
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        position: 'absolute', left: '-40px', top: '50%', transform: 'translateY(-50%)',
                        width: '40px', height: '60px', backgroundColor: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)', borderRight: 'none',
                        color: 'white', cursor: 'pointer', borderRadius: '10px 0 0 10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                    }}
                >
                    {isOpen ? '▶' : '◀'}
                </button>

                <div style={{
                    display: 'flex', flexDirection: 'column', padding: '20px', 
                    overflowY: 'auto', height: '100%' 
                }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
                        Amici
                        {isOffline && <div style={{ fontSize: '12px', color: '#ffd93d', marginTop: '5px' }}>(Modalità Offline)</div>}
                    </div>

                    {/* SEZIONE 1: Ricerca */}
                    <div style={{ marginBottom: '20px' }}>
                        <input 
                            type="text" placeholder={isOffline ? "Sei offline" : "Cerca giocatore..."} 
                            value={searchQuery} onChange={handleSearch}
                            disabled={isOffline}
                            style={{
                                width: '100%', padding: '10px', borderRadius: '5px', border: 'none',
                                backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', outline: 'none',
                                fontSize: '12px', opacity: isOffline ? 0.5 : 1, fontFamily:'"Press Start 2P", cursive'
                            }}
                        />

                        {searchResults.length > 0 && !isOffline && (
                            <div style={{ marginTop: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '5px', padding: '10px', fontSize: '12px' }}>
                                {searchResults.map(user => {
                                    const isSent = sentRequests.includes(user.id);
                                    const isAlreadyFriend = friends.some(f => f.id === user.id);
                                    
                                    return (
                                        <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <span>{user.username}</span>
                                            {isAlreadyFriend ? (
                                                <span style={{ fontSize: '10px', color: '#888' }}>
                                                    Già amico
                                                </span>
                                            ) : (
                                                <button 
                                                    onClick={() => !isSent && sendFriendRequest(user.id)} 
                                                    disabled={isSent || isOffline}
                                                    style={{
                                                        ...btnStyle(isSent || isOffline ? '#888' : '#51cf66'),
                                                        cursor: isSent || isOffline ? 'default' : 'pointer'
                                                    }}
                                                >
                                                    ✓ 
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* SEZIONE 2: Richieste Ricevute In Sospeso */}
                    {pendingRequests.length > 0 && !isOffline && (
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '14.5px', color: '#aaa', marginBottom: '10px' }}>
                                Richieste in Sospeso
                            </div>
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px' }}>
                                {pendingRequests.map(req => (
                                    <div key={req.id} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <span>{req.requester?.username}</span>
                                        <div>
                                            <div style={{ display: 'flex', flexDirection: 'row', gap: '5px' }}>
                                                <button disabled={isOffline} onClick={() => acceptFriendRequest(req.requester_id)} style={btnStyle(isOffline ? '#888' : '#51cf66')}>✓</button>
                                                <button disabled={isOffline} onClick={() => removeFriendship(req.requester_id)} style={btnStyle(isOffline ? '#888' : '#ff6b6b')}>✗</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SEZIONE 3: Lista Amici */}
                    <div>
                        <div style={{ fontSize: '16px', color: '#aaa', marginBottom: '10px' }}>
                            La tua Lista
                        </div>

                        <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px' }}>
                            {friends.length === 0 ? (
                                <div style={{ color: '#888', textAlign: 'center', padding: '10px' }}>
                                    Nessun amico trovato.
                                </div>
                            ) : (
                                friends.map(friend => (
                                    <div key={friend.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '12px' }}>
                                        <span>{friend.username}</span>
                                        <button disabled={isOffline} onClick={() => removeFriendship(friend.id)} style={{...btnStyle(isOffline ? '#888' : '#ff6b6b'), cursor: isOffline ? 'default' : 'pointer'}}> ✗ </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

const btnStyle = (color: string): React.CSSProperties => ({
    backgroundColor: 'transparent', 
    color: color, 
    border: `1px solid ${color}`,
    width: '24px',           
    height: '24px',          
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',    
    borderRadius: '10px', 
    fontSize: '12px',
    padding: '0px',
    fontWeight: 'bold',
    fontFamily: '"Press Start 2P", cursive',
});