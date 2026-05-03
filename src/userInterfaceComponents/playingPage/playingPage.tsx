import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from "react-router";
import { supabase } from '../../auth_supabase/supabaseClient';

import './playingPage.css'
import '../../userInterfaceComponents/handComponent/handComponent.css';

import { type CardProps } from '../../types';
import TableContainer from './tableContainer/tableContainer';

// Convertitore carte database a proprieta UI
function dbCardToCardProps(card: any): CardProps {
  return {
    rank: String(card.rank),
    suit: card.suit.toLowerCase(),
  };
}

// Convertitore array carte database a array proprieta UI
function dbCardsToCardProps(cards: any[]): CardProps[] {
  if (!cards || !Array.isArray(cards)) return [];
  return cards.map(dbCardToCardProps);
}

// Entrypoint della pagina che contiene la gestione Supabase, Realtime e Hooks globali
export default function Playingpage() {
    const { gameId } = useParams()
    const [currentUserId, setCurrentUserId] = useState<String | null>(null)
    const [players, setPlayers] = useState<any[]>([])
    const [targetStartTime, setTargetStartTime] = useState<string | null>(null)
    const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null)
    const [gameStatus, setGameStatus] = useState<string>('waiting')
    const [dealerCards, setDealerCards] = useState<CardProps[]>([])
    const [gameResults, setGameResults] = useState<any | null>(null)
    const [userBalance, setUserBalance] = useState<number | null>(null);
    const [inviteCode, setInviteCode] = useState<string | null>(null)
    const navigate = useNavigate();

    // Dato l'utilizzo dei time in funzioni asincrone successive definite con le setTimeout uso in combinazione
    // useRef e useEffect per garantire che l'accesso ai dati sia fatto su quelli più recenti disponibili
    // a tempo di esecuzione e non all'inizio del timer
    const playersRef = useRef(players);
    useEffect(() => {
        playersRef.current = players;
    }, [players]);

    // useEffect per acquisire utente dall'autenticazione
    useEffect(() => {
        const fetchUser = async () => {
            const { data : { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('balance')
                    .eq('id', user.id)
                    .single();

                if (profile) setUserBalance(profile.balance)
            }
        };
        fetchUser();
    }, [gameResults])

    // useEffect per invocazione dealer-play e resolve-game, quindi chiusura turno di gioco
    useEffect(() => {
        if (!gameId || gameStatus !== 'playing' || players.length === 0) return;

        const allPlayersFinished = players.every(p => p.status !== 'playing');

        if (allPlayersFinished) {
            console.log("Tutti i giocatori hanno finito. Invocazione dealer-play e resolve-game...");
            
            const processEndGame = async () => {
                try {
                    console.log("Invocazione dealer-play...");
                    const { error: dealerError } = await supabase.functions.invoke('dealer-play', {
                        body: { game_id: gameId }
                    });
                    
                    if (dealerError) {
                        console.error("Errore durante il turno del banco:", dealerError);
                        return;
                    }

                    const stillGameBeforeResolving = setTimeout(async () => {
                        console.log("Invocazione resolve-game...");
                        const { data: resolveData, error: resolveError } = await supabase.functions.invoke('resolve-game', {
                            body: { game_id: gameId }
                        });
    
                        if (resolveError) {
                            console.error("Errore nel risolvimento della partita:", resolveError);
                        } else if (resolveData && !resolveData.error) {
                            console.log("Partita risolta:", resolveData);
                            setGameResults(resolveData);
                        }
                    // Tempo fissato attualmente di attesa prima di risoluzione a tabella risultati
                    }, 7500)

                    return () => clearTimeout(stillGameBeforeResolving)

                } catch (err) {
                    console.error("Eccezione durante la fine della partita:", err);
                }
            };

            processEndGame();
        }
    }, [gameId, gameStatus, players]);

    // useEffect per invocazione edge reset-and-restart per nuovo turno
    useEffect(() => {
        if (gameStatus === 'finished') {
            console.log("Partita finita. Preparazione per la prossima mano...");
            
            const restartTimer = setTimeout(async () => {
                try {
                    const currentPlayers = playersRef.current;
                    const isRoomHost = currentPlayers.length > 0 && currentPlayers[0].user_id === currentUserId;
                    
                    if (isRoomHost) {
                        console.log("Esecuzione reset-and-restart...");
                        const { error } = await supabase.functions.invoke('reset-and-restart', {
                            body: { game_id: gameId }
                        });
                        
                        if (!error) setGameResults(null); 
                    }
                } catch (err) {
                    console.error("Eccezione durante il reset-and-restart:", err);
                }
            }, 8000);

            return () => clearTimeout(restartTimer);
        }
    }, [gameStatus, gameId, currentUserId]);


    useEffect(() => {
        if (gameStatus === 'waiting') {
            setGameResults(null);
        }
    }, [gameStatus]);

    // useEffect per fetch iniziale ai dati della partita e registrazione al realtime di supabase
    useEffect(() => {
        if (!gameId) return;

        const fetchInitialData = async () => {
            const { data: gameData } = await supabase
                .from('games')
                .select('target_start_time, current_turn_user_id, status, dealer_cards, invite_code')
                .eq('id', gameId)
                .single()
            if (gameData) {
                setTargetStartTime(gameData.target_start_time)
                setCurrentTurnPlayerId(gameData.current_turn_user_id)
                setGameStatus(gameData.status)
                setDealerCards(dbCardsToCardProps(gameData.dealer_cards))
                setInviteCode(gameData.invite_code)
            }            

            const { data : playersData } = await supabase
                .from('game_players')
                .select('*')
                .eq('game_id', gameId)
                .order('joined_at', {ascending: true});
            if (playersData) setPlayers(playersData)
        }
        fetchInitialData();

        const channel = supabase.channel(`game-${gameId}`)

        // Channel volontariamente registrato su operazioni diverse sul DB e non direttamente su *
        // questo per risolvere problematica causata a tempo di disconnessione di un utente e/o disconnessione host
        channel
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'game_players',
                    filter: `game_id=eq.${gameId}`
                },
                (payload) => {
                    console.log('Nuovo giocatore:', payload);
                    setPlayers(prev => [...prev, payload.new]);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'game_players',
                    filter: `game_id=eq.${gameId}`
                },
                (payload) => {
                    console.log('Giocatore aggiornato:', payload);
                    setPlayers(prev => prev.map(p => p.user_id === payload.new.user_id ? payload.new : p));
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'game_players'
                },
                (payload) => {
                    console.log('Giocatore rimosso:', payload);
                    if (payload.old && payload.old.user_id) {
                        setPlayers(prev => prev.filter(p => p.user_id !== payload.old.user_id));
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'games',
                    filter: `id=eq.${gameId}`
                },
                (payload) => {
                    console.log("Gioco aggiornato (Timer o Turno):", payload)
                    setTargetStartTime(payload.new.target_start_time)
                    setCurrentTurnPlayerId(payload.new.current_turn_user_id)
                    setGameStatus(payload.new.status)
                    if (payload.new.dealer_cards) {
                        setDealerCards(dbCardsToCardProps(payload.new.dealer_cards))
                    }
                }
            )
            .subscribe((status) => {
                console.log(`Stato sottoscrizione per ${gameId}:`, status);
                if (status === 'CHANNEL_ERROR') {
                    console.error("Errore di connessione. Verifica le RLS o Supabase.");
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };

    }, [gameId])

    // useEffect per gestione disconnessione utente generico
    useEffect(() => {
        if (!currentUserId || !gameId) return;

        const handleUnload = () => {
            const payload = JSON.stringify({ user_id: currentUserId, game_id: gameId });
            navigator.sendBeacon(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-disconnection`, payload);
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [currentUserId, gameId]);

    // useEffect per gestione disconnessione host
    useEffect(() => {
        if (players.length > 0 && players[0].status === 'left') {
            alert("L'host ha abbandonato la partita. La stanza è stata chiusa.");
            navigate(`/`);
        }
    }, [players]);    

    const mainPlayer = players.find(player => player.user_id === currentUserId)
    const opponents = currentUserId 
        ? players.filter(player => player.user_id !== currentUserId)
        : [];

    return (
        <div className='outer-container'>
            <TableContainer 
                playerCards={dbCardsToCardProps(mainPlayer?.cards || [])}
                dealerCards={dealerCards}
                opponents={opponents.map(opp => ({ ...opp, cards: dbCardsToCardProps(opp.cards || []) }))}
                gameId={gameId}
                currentPlayerStatus={mainPlayer?.status || 'waiting'}
                targetStartTime={targetStartTime}
                currentTurnPlayerId={currentTurnPlayerId}
                currentUserId={currentUserId}
                gameStatus={gameStatus}
                gameResults={gameResults}
                userBalance={userBalance}
                inviteCode={inviteCode}
            />
        </div>
    );
}