import { useEffect, useState, useRef } from 'react'
import './playingPage.css'
import Hand from './handComponent'
import DealerHand from './dealerComponent';
import { type CardProps,
         type HandProps,
         type BettedFichesProps, 
         type FichesProps,
         type OpponentProps, 
         type TableContainerProps} from '../cardComponents/types';
import './handComponent.css';

import venticentesimi from '../assets/exportedAssets/20cent.png';
import cinquantacentesimi from '../assets/exportedAssets/50cent.png';
import uneuro from '../assets/exportedAssets/1euro.png';
import dueeuro from '../assets/exportedAssets/2euro.png';
import annullabutton from '../assets/exportedAssets/resetBet.png';
import { useParams } from 'react-router';
import { supabase } from '../auth_supabase/supabaseClient';

const COINS_IMAGES: Record<string, string> = {
    "0.2": venticentesimi,
    "0.5": cinquantacentesimi,
    "1": uneuro,
    "2": dueeuro,
    "-1": annullabutton
};

// Helper per convertire le carte dal DB (con campi numerici) al formato UI (con campi stringa)
function dbCardToCardProps(card: any): CardProps {
  return {
    rank: String(card.rank),
    suit: card.suit.toLowerCase(),
  };
}

// Helper per convertire array di carte dal DB al formato UI
function dbCardsToCardProps(cards: any[]): CardProps[] {
  if (!cards || !Array.isArray(cards)) return [];
  return cards.map(dbCardToCardProps);
}

function ScoreVisualizer({ cards, owner }: HandProps) {

    function calculateScore() {

        if (!cards) return 0;

        return cards.reduce((acc, card) => {
            const value = (card.rank === "8" || card.rank === "9" || card.rank === "10")
                ? 0.5
                : parseInt(card.rank)
            return acc + value
        }, 0)
    }

    return (
        <div>
            { owner === "Player"
                ?  `Score mano: ${calculateScore()}`
                :  `Score banco: ${calculateScore()}`
            }
        </div>
    )
}

function BettedFiches({ stackedFiches }: BettedFichesProps) {

    function calculateBet() {
        const res = stackedFiches.reduce((acc, currFiches) => acc + currFiches.value, 0)
        return res
    }

    return (
        <div>
        {`Puntata: ${calculateBet().toFixed(2)}€`}
        </div>
    )
}

function Fiches({ value, onClickFiche }: { value: number, onClickFiche: (v: number) => void }) {
    const imageSrc = COINS_IMAGES[value.toString()];

    return (
        <div
            className='fiche_container'
            onClick={() => onClickFiche(value)}
        >
            <img src={imageSrc} />
        </div>
    )
}

function OpponentHand({ cards, gridArea, rotationClass, status, isCurrentTurn }: OpponentProps) {

    if (!status) return null;

    return (
        // Il contenitore che si posiziona nella cella della griglia
        <div className={`opponent-grid-cell ${isCurrentTurn ? 'active-turn' : ''}`} style={{ gridArea: gridArea }}>
            {/* Il wrapper che applica la rotazione senza occupare spazio fisico */}
            <div className={`opponent-rotation-wrapper ${rotationClass}`}>
                {cards && cards.length > 0 ? (
                    // Se ha carte, mostra le carte
                    <Hand cards={cards} />
                ) : (
                    // Se non ha carte (appena entrato), mostra un indicatore di presenza
                    <div style={{ 
                        width: '60px', 
                        height: '60px', 
                        backgroundColor: status === 'ready' ? 'rgba(0, 200, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
                        borderRadius: '50%',
                        border: '2px solid white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '10px',
                        textAlign: 'center'
                    }}>
                        {status === 'ready' ? 'PRONTO' : 'NON PRONTO'}
                    </div>
                )}
            </div>
        </div>
    );
}

const OPPONENT_SLOTS = [
    { gridArea: 'bottom-right', rotationClass: 'rotate-right' },
    { gridArea: 'top-right', rotationClass: 'rotate-top-right' },
    { gridArea: 'top-left', rotationClass: 'rotate-top-left' },
    { gridArea: 'bottom-left', rotationClass: 'rotate-left' },
];

function TableContainer({ 
    playerCards, 
    dealerCards,
    opponents,
    gameId,
    currentPlayerStatus,
    targetStartTime,
    currentTurnPlayerId,
    currentUserId,
    gameStatus,
    gameResults,
    userBalance,
    inviteCode
}: TableContainerProps) {

    // Mantengo lo stato delle fiches nel componente genitore, quindi TableContainer
    const [getBettedFiches, setBettedFiches] = useState<FichesProps[]>([])
    const totalBet = getBettedFiches.reduce((acc, curr) => acc + curr.value, 0);

    // State per indicare se un'azione è in corso (evita double-click)
    const [isActionInProgress, setIsActionInProgress] = useState(false);

    // State per gestire il busted: memorizza lo score quando sballa
    const [bustedScore, setBustedScore] = useState<number | null>(null);

    // State del timer del pronto, con variabile per lo stato del giocatore
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const isReady = currentPlayerStatus === 'ready'

    const isSpectator = currentPlayerStatus === 'spectating'
    const isMyTurn = currentTurnPlayerId === currentUserId

    // useEffect per resettare bustedScore quando lo status cambia
    useEffect(() => {
        if (currentPlayerStatus !== 'busted') {
            setBustedScore(null);
        }
    }, [currentPlayerStatus]);

    // useEffect per gestione timer pronto
    useEffect(() => {

        if (!targetStartTime) {
            setTimeLeft(null)
            return;
        }
        const calculateDiff = () => Math.floor((new Date(targetStartTime).getTime() - new Date().getTime()) / 1000);
        
        const initialDiff = calculateDiff();
        setTimeLeft(initialDiff > 0 ? initialDiff : 0);

        const interval = setInterval(async () => {
            const diff = calculateDiff()
            if (diff > 0){
                setTimeLeft(diff)
            } else {
                setTimeLeft(0)
                clearInterval(interval)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [targetStartTime, ])

    // useEffect per invocazione edge function start-game
    useEffect(() => {
        const triggerStartGame = async () => {
            // Controlliamo che il timer sia a zero, che il gioco esista,
            // - che siamo effettivamente pronti e che il gioco non sia già in esecuzione
            console.log("DEBUG start-game conditions:", { timeLeft, gameId, isReady, gameStatus });
            if (timeLeft === 0 && gameId && isReady && gameStatus === 'waiting') {
                console.log("Timer a 0. Richiedo l'inizio della partita...");
                try {
                    const { data, error } = await supabase.functions.invoke('start-game', {
                        body: { game_id: gameId }
                    });
                    
                    console.log("Response da start-game:", { data, error });
                    if (error) {
                         console.error("Errore nell'avvio della partita:", error);
                    } else {
                        console.log("Partita avviata con successo!");
                    }
                } catch (err) {
                    console.error("Eccezione durante l'avvio della partita:", err);
                }
            }
        };

        triggerStartGame();
    }, [timeLeft, gameId, isReady, gameStatus]);

    const handleAddFiche = (ficheValue: number) => {
        if (gameStatus !== 'waiting' || currentPlayerStatus !== 'waiting') return;
        setBettedFiches(prevFiches => [...prevFiches, {value: ficheValue}])
    };

    const handleResetFiche = () => {
        if (isReady) return;
        setBettedFiches(() => [])
    };

const handleReadyClick = async () => {
    if (totalBet <= 0) return;
    try {
        if (isReady) {
            // ==========================================
            // TASTO ANNULLA (Rimborso e reset)
            // ==========================================
            console.log("Annullamento stato PRONTO e rimborso puntata...");
            
            // 1. Chiamiamo la nuova lambda per il rimborso
            const { data: cancelData, error: cancelError } = await supabase.functions.invoke('cancel-bet', {
                body: { game_id: gameId }
            });

            if (cancelError || (cancelData && cancelData.error)) {
                console.error("Errore durante l'annullamento della puntata:", cancelError || cancelData.error);
                alert("Errore durante l'annullamento.");
                return;
            }

            // 2. Resettiamo localmente la UI svuotando le fiches sul tavolo
            setBettedFiches([]); 
            console.log("Puntata annullata con successo!");
            return;
        }

        // ==========================================
        // TASTO PRONTO (Conferma puntata)
        // ==========================================
        console.log("Piazzamento della puntata in corso...");
        
        const { data: betData, error: betError } = await supabase.functions.invoke('place-bet', {
            body: { game_id: gameId, bet_amount: totalBet }
        });

        if (betError || (betData && betData.error)) {
            console.error("Errore piazzamento puntata:", betError || betData.error);
            alert("Errore durante la puntata: " + (betData?.error || "Fondi insufficienti?"));
            return;
        }

        console.log("Puntata piazzata! Imposto stato su pronto...");

        const { data: readyData, error: readyError } = await supabase.functions.invoke('toggle-ready', {
            body: { game_id: gameId, is_ready: true }
        });

        if (readyError || (readyData && readyData.error)) {
            console.error("Errore cambio stato:", readyError || readyData.error);
            return;
        }

        console.log("Sei PRONTO per giocare!");

    } catch (error) {
        console.error("Errore imprevisto:", error);
    }
};

    // === Gestione tasto PESCA carta ===
    const handleDrawCard = async () => {
        if (!gameId || !isMyTurn || isActionInProgress) return;
        
        setIsActionInProgress(true);
        try {
            console.log("DRAW-CARD: Richiesta carta...");
            const { data, error } = await supabase.functions.invoke('draw-card', {
                body: { game_id: gameId }
            });

            if (error) {
                console.error("Errore nel estrazione della carta:", error);
                alert("Errore: " + (error.message || "Impossibile pescare la carta"));
                setIsActionInProgress(false);
                return;
            }

            if (data?.error) {
                console.log("Errore dalla funzione:", data.error);
                alert("Errore: " + data.error);
                setIsActionInProgress(false);
                return;
            }

            console.log("Carta pescata:", data.card, "Nuovo score:", data.new_score);
            
            // Se player va in busted, setta lo score di sballo e passa il turno automaticamente
            if (data.busted) {
                setBustedScore(data.new_score);
                console.log("Giocatore sballato! Score:", data.new_score);
                
                // Attendi un breve delay per far vedere il componente di sballo, poi passa il turno
                setTimeout(async () => {
                    try {
                        const { data: standData, error: standError } = await supabase.functions.invoke('stand-cards', {
                            body: { game_id: gameId }
                        });
                        if (standError) {
                            console.error("Errore nel passaggio turno automatico:", standError);
                        } else {
                            console.log("Turno passato automaticamente dopo sballo");
                        }
                    } catch (e) {
                        console.error("Eccezione nel passaggio turno automatico:", e);
                    } finally {
                        setIsActionInProgress(false);
                    }
                }, 1500);
            } else {
                setIsActionInProgress(false);
            }
        } catch (error) {
            console.error("Errore durante draw-card:", error);
            alert("Errore imprevisto durante il pescamento");
            setIsActionInProgress(false);
        }
    };

    // === Gestione tasto STAI ===
    const handleStand = async () => {
        if (!gameId || !isMyTurn || isActionInProgress) return;
        
        setIsActionInProgress(true);
        try {
            console.log("STAND-CARDS: Effettuo stand del turno...");
            const { data, error } = await supabase.functions.invoke('stand-cards', {
                body: { game_id: gameId }
            });

            if (error) {
                console.error("Errore nello stand del turno:", error);
                alert("Errore: " + (error.message || "Impossibile passare turno"));
                return;
            }

            if (data?.error) {
                console.log("Errore dalla funzione:", data.error);
                alert("Errore: " + data.error);
                return;
            }

            console.log("Turno passato. Prossimo giocatore:", data.next_turn_user_id);
            if (data.all_players_finished) {
                console.log("Tutti i giocatori hanno finito. Il banco ora gioca...");
            }
        } catch (error) {
            console.error("Errore durante stand-cards:", error);
            alert("Errore imprevisto nel passaggio turno");
        } finally {
            setIsActionInProgress(false);
        }
    };

    return (
      <div className='table-container'>

        {/* Gestione codice invito in alto a sinistra */}
        {inviteCode && (
            <div style={{
                position: 'absolute', top: '15px', left: '15px', 
                backgroundColor: 'rgba(0, 0, 0, 0.6)', color: 'white', 
                padding: '8px 12px', borderRadius: '8px', zIndex: 10,
                border: '1px solid rgba(255,255,255,0.2)',
                fontFamily: 'monospace', fontSize: '16px'
            }}>
                Codice Stanza: <strong style={{ color: '#ffd43b', letterSpacing: '2px' }}>{inviteCode}</strong>
            </div>
        )}

        {/* Gestione rendering opponents con posizione parametrica */}
        {opponents.map((opponent, index) => {
            if (index >= OPPONENT_SLOTS.length) return null;
            const slot = OPPONENT_SLOTS[index]
            return (
                <OpponentHand
                    key={`opponent-${opponent.user_id}`}
                    cards={opponent.cards || []}
                    gridArea={slot.gridArea}
                    rotationClass={slot.rotationClass}
                    status={opponent.status}
                    isCurrentTurn={currentTurnPlayerId === opponent.user_id}
                />
            )
        })}        

        <div className='dealer-area'>
            <DealerHand cards={dealerCards} />
        </div>

        

        {isSpectator ? (
            <div className="spectator-banner" style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', padding: '20px',
                borderRadius: '10px', zIndex: 10, textAlign: 'center', border: '2px solid gold'
            }}>
                <h3>Stai guardando la partita</h3>
                <p>Entrerai in gioco automaticamente alla prossima mano.</p>
            </div>
        ) : gameStatus === 'finished' && gameResults ? (
            // === Overlay Risultati ===
            <div style={{
                position: 'absolute', top: '0', left: '0', right: '0', bottom: '0',
                backgroundColor: 'rgba(0,0,0,0.95)', color: 'white', zIndex: 30,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '20px', overflowY: 'auto'
            }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
                    RISULTATI
                </div>

                <div style={{ fontSize: '18px', marginBottom: '30px', textAlign: 'center' }}>
                    <div>Banco: <strong>{gameResults.dealer_score}</strong></div>
                    <div style={{ color: gameResults.dealer_busted ? '#ff6b6b' : '#51cf66' }}>
                        {gameResults.dealer_busted ? 'BANCO SBALLA' : 'BANCO NON SBALLA'}
                    </div>
                </div>

                <div style={{
                    backgroundColor: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '10px',
                    maxWidth: '600px', maxHeight: '400px', overflowY: 'auto'
                }}>
                    {gameResults.results
                        .filter((result: any) => 
                            result.user_id === currentUserId || 
                            opponents.some(opp => opp.user_id === result.user_id)
                        )
                        .map((result: any, idx: number) => {
                        const isCurrentPlayer = result.user_id === currentUserId;
                        const resultColor = result.result === 'win' ? '#51cf66' : result.result === 'draw' ? '#ffd43b' : '#ff6b6b';
                        const resultText = result.result === 'win' ? 'VINTO' : result.result === 'draw' ? 'PAREGGIO' : 'PERSO';

                        return (
                            <div key={idx} style={{
                                padding: '12px', marginBottom: '10px', borderLeft: `4px solid ${resultColor}`,
                                backgroundColor: isCurrentPlayer ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                                borderRadius: '5px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <strong style={{ color: isCurrentPlayer ? '#ffff00' : 'white' }}>
                                            {isCurrentPlayer ? 'TU' : `Giocatore ${idx + 1}`}
                                        </strong>
                                        <div style={{ color: '#ccc' }}>Score: {result.score}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: resultColor, fontWeight: 'bold', fontSize: '16px' }}>
                                            {resultText}
                                        </div>
                                        <div style={{ color: '#aaa' }}>
                                            Puntata: {result.bet} | Vincita: +{result.winnings}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: '30px', fontSize: '16px', textAlign: 'center' }}>
                    <div>Montepremi totale: {gameResults.total_pot}</div>
                </div>
            </div>
        ) : gameStatus === 'playing' ? (
            // === FASE DI GIOCO ATTIVA ===
            <div className="actions-area">
                {isMyTurn ? (
                    <>
                        {/* === COMPONENTE PLAYER BUSTED === */}
                        {bustedScore !== null && (
                            <div style={{
                                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                backgroundColor: 'rgba(200, 0, 0, 0.9)', color: 'white', padding: '30px',
                                borderRadius: '15px', zIndex: 20, textAlign: 'center', border: '3px solid #ff0000',
                                boxShadow: '0 0 20px rgba(255, 0, 0, 0.5)', fontSize: '24px', fontWeight: 'bold',
                                animation: 'pulse 1.5s ease-in-out'
                            }}>
                                <div style={{ fontSize: '32px', marginBottom: '15px' }}>SBALLATO!</div>
                                <div>Score: {bustedScore}</div>
                            </div>
                        )}

                        <button 
                            className='playing_button'
                            onClick={handleDrawCard}
                            disabled={isActionInProgress || currentPlayerStatus === 'busted'}
                            style={{ 
                                opacity: isActionInProgress || currentPlayerStatus === 'busted' ? 0.5 : 1, 
                                cursor: isActionInProgress || currentPlayerStatus === 'busted' ? 'not-allowed' : 'pointer' 
                            }}
                        >
                            {isActionInProgress ? 'In corso...' : 'CARTA'}
                        </button>
                        <button 
                            className='playing_button'
                            onClick={handleStand}
                            disabled={isActionInProgress || currentPlayerStatus === 'busted'}
                            style={{ 
                                opacity: isActionInProgress || currentPlayerStatus === 'busted' ? 0.5 : 1, 
                                cursor: isActionInProgress || currentPlayerStatus === 'busted' ? 'not-allowed' : 'pointer' 
                            }}
                        >
                            {isActionInProgress ? 'In corso...' : currentPlayerStatus === 'busted' ? 'SBALLATO' : 'STAI'}
                        </button>
                    </>
                ) : (
                    <div style={{ color: 'white', fontSize: '18px', padding: '10px' }}>
                        In attesa degli altri giocatori...
                    </div>
                )}
            </div>
        ) : (
            // === FASE DI PUNTATA (WAITING) ===
            <>
                <div className="score-coins">
                    <Fiches value={0.2} onClickFiche={handleAddFiche} />
                    <Fiches value={0.5} onClickFiche={handleAddFiche} />
                    <Fiches value={1} onClickFiche={handleAddFiche} />
                    <Fiches value={2} onClickFiche={handleAddFiche} />
                    <Fiches value={-1} onClickFiche={handleResetFiche} />
                </div>

                <div className="actions-area">
                    {timeLeft !== null && (
                        <div style={{ color: 'white', marginBottom: '10px', fontSize: '18px', fontFamily: 'monospace' }}>
                            {timeLeft > 0 ? `Inizio tra ${timeLeft}...` : "Iniziando..."}
                        </div>
                    )}

                    <button 
                        className='playing_button' 
                        disabled={!isReady && totalBet <= 0} 
                        onClick={handleReadyClick}
                        style={{
                            opacity: totalBet > 0 ? 1 : 0.5,
                            cursor: totalBet > 0 ? 'pointer' : 'not-allowed',
                            backgroundColor: isReady ? '#d9534f' : '' 
                        }}
                    >
                        {isReady ? 'ANNULLA' : 'PRONTO'}
                    </button>
                </div>
            </>
        )}

        <div className='dealer-score-area'>
            <ScoreVisualizer cards={dealerCards} owner='Dealer' />
        </div>


        <div className='sum-score-fiches-area'>
            <ScoreVisualizer cards={playerCards} owner='Player' />
            <BettedFiches stackedFiches={getBettedFiches} />
            {userBalance !== null && (
                <div>
                    {`Saldo: ${userBalance?.toFixed(2)}€`}
                </div>
            )}
        </div>

        {/* Aggiunta della classe active-turn alla player-area se è il nostro turno */}
        <div className={`player-area ${isMyTurn ? 'active-turn' : ''}`}>
            <Hand cards={playerCards} />
        </div>

      </div>
    );
}

export default function Playingpage() {
    // Hook grazie al quale acquisiamo il gameId dal parametro :gameId della route
    const { gameId } = useParams()

    // Hooks rispettivamente per userId e players
    const [currentUserId, setCurrentUserId] = useState<String | null>(null)
    const [players, setPlayers] = useState<any[]>([])

    // Hook per data inizio timer pronto
    const [targetStartTime, setTargetStartTime] = useState<string | null>(null)

    // Hook per tracciare a chi tocca in questo momento
    const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null)

    // Hook per stato partita
    const [gameStatus, setGameStatus] = useState<string>('waiting')

    // Hook per le carte del banco (realtime)
    const [dealerCards, setDealerCards] = useState<CardProps[]>([])

    // Hook per i risultati della mano
    const [gameResults, setGameResults] = useState<any | null>(null)

    // Hook per il saldo utente
    const [userBalance, setUserBalance] = useState<number | null>(null);

    // Hook per codice invito
    const [inviteCode, setInviteCode] = useState<string | null>(null)

    // useEffect per credito utente
    useEffect(() => {
        const fetchUser = async () => {
            const { data : { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id)

                // Fetch al db del saldo
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

    // useEffect che triggera resolve-game quando tutti i giocatori hanno finito
    useEffect(() => {
        if (!gameId || gameStatus !== 'playing' || players.length === 0) return;

        // Controlla se tutti i giocatori hanno terminato
        const allPlayersFinished = players.every(p => p.status !== 'playing');

        if (allPlayersFinished) {
            console.log("Tutti i giocatori hanno finito. Invocazione dealer-play e resolve-game...");
            
            const processEndGame = async () => {
                try {
                    // Gioca il banco (tramite dealer-play)
                    console.log("Invocazione dealer-play...");
                    const { error: dealerError } = await supabase.functions.invoke('dealer-play', {
                        body: { game_id: gameId }
                    });
                    
                    if (dealerError) {
                        console.error("Errore durante il turno del banco:", dealerError);
                        return;
                    }

                    const stillGameBeforeResolving = setTimeout(async () => {
                        // Risoluzione partita (tramite resolve-game)
                        console.log("Invocazione resolve-game...");
                        const { data: resolveData, error: resolveError } = await supabase.functions.invoke('resolve-game', {
                            body: { game_id: gameId }
                        });
    
                        // Se ci sono più client, il primo che chiama resolve-game cambierà lo status 
                        // in finished. I successivi riceveranno errore 400 "La partita non è già in corso".
                        // Salviamo i risultati per la UI se la chiamata va a buon fine.
                        if (resolveError) {
                            console.error("Errore nel risolvimento della partita:", resolveError);
                        } else if (resolveData && !resolveData.error) {
                            console.log("Partita risolta:", resolveData);
                            setGameResults(resolveData);
                        }
                    }, 7500)

                    return () => clearTimeout(stillGameBeforeResolving)

                } catch (err) {
                    console.error("Eccezione durante la fine della partita:", err);
                }
            };

            processEndGame();
        }
    }, [gameId, gameStatus, players]);

    // useEffect per l'invocazione di reset-and-restart per generazione nuova partita in automatico
    useEffect(() => {
        // Se la partita è finita, avviamo un timer per ricominciare
        if (gameStatus === 'finished') {
            console.log("Partita finita. Preparazione per la prossima mano...");
            
            const restartTimer = setTimeout(async () => {
                try {
                    // Usiamo playersRef per non triggerare loop infiniti, ma avere i dati aggiornati
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


    // UseEffect per cleanup della UI quando il backend resetta la partita tramite reset-and-restart
    useEffect(() => {
        if (gameStatus === 'waiting') {
            setGameResults(null);
        }
    }, [gameStatus]);

    // UseEffect per la gestione dei channel, ossia API per webSocket di Supabase Realtime
    // --- In questo caso come dipendenza settiamo il gameId
    useEffect(() => {
        if (!gameId) return;

        // Prima effettuiamo il fetch dei player e dei timer nella stanza
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

        // Effettivo utilizzo di channel realtime di Supabase
        const channel = supabase.channel(`game-${gameId}`)

        channel
            .on(
                // Ascoltiamo INSERT con il filtro (normale)
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
                // Ascoltiamo UPDATE con il filtro (normale)
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
                // Ascoltiamo DELETE SENZA filtro
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'game_players'
                },
                (payload) => {
                    console.log('Giocatore rimosso (senza filtro):', payload);
                    if (payload.old && payload.old.user_id) {
                        // Rimuoviamo l'utente. Se è di un'altra partita, il filter non farà nulla.
                        setPlayers(prev => prev.filter(p => p.user_id !== payload.old.user_id));
                    }
                }
            )
            .on(
                // Listener sulla tabella games per ricevere l'avvio del timer
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
                    // === PUNTO 8: Aggiornamento dealer_cards in realtime ===
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

        // Ritorniamo la funzione di cleanup nel useEffect, in questo caso rimozione del channel realtime
        return () => {
            supabase.removeChannel(channel);
        };

    }, [gameId])

// Gestione disconnessione (chiusura tab o refresh)
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

    const playersRef = useRef(players);
    useEffect(() => {
        playersRef.current = players;
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