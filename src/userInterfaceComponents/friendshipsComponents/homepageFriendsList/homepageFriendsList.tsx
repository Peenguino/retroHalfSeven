import { useState, useEffect } from 'react';
import { supabase } from '../../../auth_supabase/supabaseClient';

// Limitazione tecnica volontaria: La lista amici per essere rirenderizzata, in caso di arrivo richiesta di amicizia,
// deve essere aperta e chiusa, questo per evitare di fare polling o l'utilizzo di un realtime.

export default function HomepageFriendsList({ currentUserId }: { currentUserId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Stati per le varie sezioni
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    
    // Nuovo stato per tracciare le richieste inviate nella sessione corrente
    const [sentRequests, setSentRequests] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadFriendsData();
            // TODO (IndexedDB): Qui controllerai se ci sono richieste salvate in locale 
            // durante lo stato offline e le invierai (sync) se la connessione è tornata.
        }
    }, [isOpen]);

    // Handler per invio richiesta amicizia
    const sendFriendRequest = async (addresseeId: string) => {
        // TODO: Se offline: salva la richiesta in IndexedDB con status "sync_pending"

        const { data, error } = await supabase.functions.invoke('send-friend-request', {
            body: { addressee_id: addresseeId }
        });

        if (!error) {
            // Aggiorniamo lo stato locale per disattivare il bottone
            setSentRequests(prev => [...prev, addresseeId]);
        } else {
            console.error("Errore invio richiesta:", error);
        }

        return { data, error };
    };

    // Handler per accettare amicizia
    const acceptFriendRequest = async (requesterId: string) => {
        const { data, error } = await supabase.functions.invoke('accept-friend-request', {
            body: { requester_id: requesterId }
        });

        if (!error) {
            // Trova la richiesta per avere i dati dell'utente
            const acceptedReq = pendingRequests.find(req => req.requester_id === requesterId);
            
            // Rimuovi la richiesta dalle pending
            setPendingRequests(prev => prev.filter(req => req.requester_id !== requesterId));
            
            // Aggiungi subito il nuovo amico alla lista senza dover ricaricare dal DB
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
        const { data, error } = await supabase.functions.invoke('remove-friendship', {
            body: { other_user_id: otherUserId }
        });

        if (!error) {
            // Aggiorna la UI istantaneamente rimuovendo l'utente sia dagli amici che dalle richieste
            setFriends(prev => prev.filter(f => f.id !== otherUserId));
            setPendingRequests(prev => prev.filter(req => req.requester_id !== otherUserId));
        } else {
            console.error("Errore rimozione amicizia:", error);
        }

        return { data, error };
    };

    // Assunzione per cui localDB sia il tuo wrapper per IndexedDB
    // - import { get, set } from 'idb-keyval'; -> localDB.get / localDB.put

    const loadFriendsData = async () => {
        // Funzione helper per caricare i dati offline
        const loadFromIndexedDB = async () => {
            /*
            try {
                const cachedPending = await localDB.get('pendingRequests') || [];
                const cachedFriends = await localDB.get('friendsList') || [];
                setPendingRequests(cachedPending);
                setFriends(cachedFriends);
            } catch (error) {
                console.error("Errore lettura IndexedDB:", error);
            }
            */
        };

        // Check se siamo online
        if (navigator.onLine) {
            try {
                // Scaricamento richieste in sospeso
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

                // Scaricamento lista amici accettati
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

                // Formattazione
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

                // Pulizia delle richieste appena inviate se ricarichiamo da zero
                setSentRequests([]);

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
            if (!navigator.onLine) {
                console.warn("Impossibile cercare giocatori mentre sei offline.");
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
                
                // Opzionale: potresti filtrare qui i risultati se un utente è già nella lista amici,
                // ma per ora lasciamo così o gestiamolo visivamente
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
            {/* Overlay scuro */}
            {isOpen && (
                <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 39 }}
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar a tendina (Contenitore Esterno) */}
            <div style={{
                position: 'fixed', top: 0, right: isOpen ? 0 : '-350px', width: '350px', height: '100vh',
                backgroundColor: 'rgba(0,0,0,0.95)', color: 'white', zIndex: 40,
                transition: 'right 0.3s ease-in-out', borderLeft: '1px solid rgba(255,255,255,0.1)'
            }}>
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        position: 'absolute', left: '-40px', top: '50%', transform: 'translateY(-50%)',
                        width: '40px', height: '60px', backgroundColor: 'rgba(0,0,0,0.95)',
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
                    </div>

                    {/* SEZIONE 1: Ricerca */}
                    <div style={{ marginBottom: '20px' }}>

                        <input 
                            type="text" placeholder="Cerca giocatore..." value={searchQuery} onChange={handleSearch}
                            style={{
                                width: '100%', padding: '10px', borderRadius: '5px', border: 'none',
                                backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', outline: 'none',
                                fontSize: '12px'
                            }}
                        />

                        {searchResults.length > 0 && (
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
                                                    disabled={isSent}
                                                    style={{
                                                        ...btnStyle(isSent ? '#888' : '#51cf66'),
                                                        cursor: isSent ? 'default' : 'pointer'
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
                    {pendingRequests.length > 0 && (
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
                                                <button onClick={() => acceptFriendRequest(req.requester_id)} style={btnStyle('#51cf66')}>✓</button>
                                                <button onClick={() => removeFriendship(req.requester_id)} style={btnStyle('#ff6b6b')}>✗</button>
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
                                        <button onClick={() => removeFriendship(friend.id)} style={btnStyle('#ff6b6b')}> ✗ </button>
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
    cursor: 'pointer', 
    fontSize: '12px',
    padding: '0px',
    fontWeight: 'bold',
    fontFamily: '"Press Start 2P", cursive',
});