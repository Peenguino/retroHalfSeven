import { useEffect, useState } from 'react'
import { supabase } from '../../../auth_supabase/supabaseClient';
import { type TableContainerProps, type FichesProps } from '../../../types';


// === Importazione componenti mani
import Hand from '../../handComponent/handComponent';
import DealerHand from '../../dealerHand/dealerHand';

// === Importazione sottocomponenti di PlayingPage
import ScoreVisualizer from '../scoreVisualizer/scoreVisualizer';
import BettedFiches from '../bettedFiches/bettedFiches';
import OpponentHand from '../opponentHand/opponentHand';
import RoomCodeHeader from '../roomCodeHeader/roomCodeHeader';
import SpectatorBanner from '../spectatorBanner/spectatorBanner';
import ResultsOverlay from '../resultsOverlay/resultsOverlay';
import PlayActions from '../playActions/playActions';
import BettingPhase from '../bettingPhase/bettingPhase';

const OPPONENT_SLOTS = [
    { gridArea: 'bottom-right', rotationClass: 'rotate-right' },
    { gridArea: 'top-right', rotationClass: 'rotate-top-right' },
    { gridArea: 'top-left', rotationClass: 'rotate-top-left' },
    { gridArea: 'bottom-left', rotationClass: 'rotate-left' },
];

// Contenitore principale del tavolo con logica per API e stato temporaneo della UI
export default function TableContainer({ 
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

    const [getBettedFiches, setBettedFiches] = useState<FichesProps[]>([])
    const totalBet = getBettedFiches.reduce((acc, curr) => acc + curr.value, 0);

    const [isActionInProgress, setIsActionInProgress] = useState(false);
    const [bustedScore, setBustedScore] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null)

    const isReady = currentPlayerStatus === 'ready'
    const isSpectator = currentPlayerStatus === 'spectating'
    const isMyTurn = currentTurnPlayerId === currentUserId

    // useEffect per gestione bust dello score
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
    }, [targetStartTime])

    // useEffect per gestione invocazione edge function start-time a scadenza timer
    useEffect(() => {
        const triggerStartGame = async () => {
            console.log("DEBUG start-game conditions:", { timeLeft, gameId, isReady, gameStatus });
            if (timeLeft === 0 && gameId && gameStatus === 'waiting') {
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
    }, [timeLeft, gameId, gameStatus]);

    const handleAddFiche = (ficheValue: number) => {
        if (gameStatus !== 'waiting' || currentPlayerStatus !== 'waiting') return;
        setBettedFiches(prevFiches => [...prevFiches, {value: ficheValue}])
    };

    const handleResetFiche = () => {
        if (isReady) return;
        setBettedFiches(() => [])
    };

    // Handler registrata al listener sul tasto punta/annulla, invoca edge function place-bet/cancel-bet
    const handleReadyClick = async () => {
        if (totalBet <= 0) return;
        try {
            if (isReady) {
                console.log("Annullamento stato PRONTO e rimborso puntata...");
                
                const { data: cancelData, error: cancelError } = await supabase.functions.invoke('cancel-bet', {
                    body: { game_id: gameId }
                });

                if (cancelError || (cancelData && cancelData.error)) {
                    console.error("Errore durante l'annullamento della puntata:", cancelError || cancelData.error);
                    alert("Errore durante l'annullamento.");
                    return;
                }

                setBettedFiches([]); 
                console.log("Puntata annullata con successo!");
                return;
            }

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

    // Handler per invocare edge function draw-card su tasto CARTA e stand-cards per bust
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
            
            if (data.busted) {
                setBustedScore(data.new_score);
                console.log("Giocatore sballato! Score:", data.new_score);
                
                setTimeout(async () => {
                    try {
                        const { error: standError } = await supabase.functions.invoke('stand-cards', {
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

    // Handler per invocare edge function stand-cards su tasto STAI
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
        <RoomCodeHeader inviteCode={inviteCode} gameId={gameId} currentUserId={currentUserId} />

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
            <SpectatorBanner />
        ) : gameStatus === 'finished' && gameResults ? (
            <ResultsOverlay 
                gameResults={gameResults} 
                currentUserId={currentUserId} 
                opponents={opponents} 
            />
        ) : gameStatus === 'playing' ? (
            <div className="actions-area">
                <PlayActions 
                    isMyTurn={isMyTurn}
                    isActionInProgress={isActionInProgress}
                    currentPlayerStatus={currentPlayerStatus}
                    handleDrawCard={handleDrawCard}
                    handleStand={handleStand}
                    bustedScore={bustedScore}
                />
            </div>
        ) : (
            <BettingPhase 
                handleAddFiche={handleAddFiche}
                handleResetFiche={handleResetFiche}
                timeLeft={timeLeft}
                isReady={isReady}
                totalBet={totalBet}
                handleReadyClick={handleReadyClick}
            />
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

        <div className={`player-area ${isMyTurn ? 'active-turn' : ''}`}>
            <Hand cards={playerCards} />
        </div>

      </div>
    );
}