import { useEffect, useState } from 'react'
import './playingPage.css'
import Hand from './handComponent'
import DealerHand from './dealerComponent';
import { type CardProps,
         type HandProps,
         type BettedFichesProps, 
         type FichesProps,
         type OpponentProps } from '../cardComponents/types';
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

// Mockup di carte banco per testare il componente
const dealerCards = [
  { rank: "9", suit: "denari" },
  { rank: "9", suit: "denari" },
  { rank: "10", suit: "denari" },
  { rank: "7", suit: "denari" },
];

// Mockup di una mano di carte per testare il componente
const myCards = [
  { rank: "9", suit: "denari" },
  { rank: "1", suit: "denari" },
  { rank: "8", suit: "denari" },
];

function ActionButton({ buttonType }: { buttonType: string }) {
    return (
        <button className='playing_button'>
            {buttonType}
        </button>
    )
}

function ScoreVisualizer({ cards, owner }: HandProps) {

    function calculateScore() {
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

function OpponentHand({ cards, gridArea, rotationClass, status }: OpponentProps) {
    return (
        // Il contenitore che si posiziona nella cella della griglia
        <div className="opponent-grid-cell" style={{ gridArea: gridArea }}>
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
    targetStartTime
}: { 
    playerCards: CardProps[], 
    dealerCards: CardProps[],
    opponents: any[],
    gameId: string | undefined,
    currentPlayerStatus: string,
    targetStartTime: string | null
}) {

    // Mantengo lo stato delle fiches nel componente genitore, quindi TableContainer
    const [getBettedFiches, setBettedFiches] = useState<FichesProps[]>([])
    const totalBet = getBettedFiches.reduce((acc, curr) => acc + curr.value, 0);

    // Stato del timer del pronto, con variabile per lo stato del giocatore
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const isReady = currentPlayerStatus === 'ready'

    // useEffect per gestione timer pronto
    useEffect(() => {

        if (!targetStartTime) {
            setTimeLeft(null)
            return;
        }
        const calculateDiff = () => Math.floor((new Date(targetStartTime).getTime() - new Date().getTime()) / 1000);
        
        const initialDiff = calculateDiff();
        setTimeLeft(initialDiff > 0 ? initialDiff : 0);

        const interval = setInterval(() => {
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

    const handleAddFiche = (ficheValue: number) => {
        if (isReady) return;
        setBettedFiches(prevFiches => [...prevFiches, {value: ficheValue}])
    };

    const handleResetFiche = () => {
        if (isReady) return;
        setBettedFiches(() => [])
    };

    const handleReadyClick = async () => {
        if (totalBet <= 0 ) return;
        try {
            
            if (isReady) {
                // Logica tasto annulla pronto
                console.log("Annullamento stato PRONTO...");
                const { error } = await supabase.functions.invoke('toggle-ready', {
                    body: { game_id: gameId, is_ready: false }
                });

                if (error) throw error;
                return;
            }

            // Logica tasto pronto
            if (totalBet <= 0) return;
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

    return (
      <div className='table-container'>

        {/* Gestione rendering opponents con posizione parametrica */}
        {opponents.map((opponent, index) => {
            if (index >= OPPONENT_SLOTS.length) return null;
            const slot = OPPONENT_SLOTS[index]
            return (
                <OpponentHand
                    key={opponent.user_id}
                    cards={opponent.cards || []}
                    gridArea={slot.gridArea}
                    rotationClass={slot.rotationClass}
                    status={opponent.status}
                />
            )
        })}        

        <div className='dealer-area'>
            <DealerHand cards={dealerCards} />
        </div>

        <div className="score-coins">
            <Fiches value={0.2} onClickFiche={handleAddFiche} />
            <Fiches value={0.5} onClickFiche={handleAddFiche} />
            <Fiches value={1} onClickFiche={handleAddFiche} />
            <Fiches value={2} onClickFiche={handleAddFiche} />
            <Fiches value={-1} onClickFiche={handleResetFiche} />
        </div>



        <div className="actions-area">
            { /* <ActionButton buttonType="CARTA" /> */ }
            { /* <ActionButton buttonType="STAI" /> */ }

            { /* Visualizzazione Timer */}
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
                    backgroundColor: isReady ? '#d9534f' : '' // Colore rosso per il tasto annulla
                }}
            >
                {isReady ? 'ANNULLA' : (totalBet > 0 ? 'PRONTO' : 'PRONTO') }
            </button>
        </div>

        <div className='dealer-score-area'>
            <ScoreVisualizer cards={dealerCards} owner='Dealer' />
        </div>


        <div className='sum-score-fiches-area'>
            <ScoreVisualizer cards={playerCards} owner='Player' />
            <BettedFiches stackedFiches={getBettedFiches} />
        </div>

        <div className="player-area">
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

    // Fetch del user ed estrazione dell'user.id
    // --- Non definiamo nessuna dipendenza nell'array secondo arg della useEffect: assumiamo che si debba eseguire ad ogni rirender
    useEffect(() => {
        const fetchUser = async () => {
            const { data : { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id)
        };
        fetchUser();
    }, [])

    // UseEffect per la gestione dei channel, ossia API per webSocket di Supabase Realtime
    // --- In questo caso come dipendenza settiamo il gameId
    useEffect(() => {
        if (!gameId) return;

        // Prima effettuiamo il fetch dei player e dei timer nella stanza
        const fetchInitialData = async () => {

            const { data : playersData } = await supabase
                .from('game_players')
                .select('*')
                .eq('game_id', gameId)
                .order('joined_at', {ascending: true});
            if (playersData) setPlayers(playersData)

            const { data: gameData } = await supabase
                .from('games')
                .select('target_start_time')
                .eq('id', gameId)
                .single()
            if (gameData) setTargetStartTime(gameData.target_start_time)
        }
        fetchInitialData();

        // Effettivo utilizzo di channel realtime di Supabase
        const channel = supabase.channel(`game-${gameId}`)

        channel
            .on(
                // Listener su tutti i cambi sulla tabella game_players, dove matcha il corrente gameId
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'game_players',
                    filter: `game_id=eq.${gameId}`
                },
                (payload) => {
                    console.log('Cambio in game_players:', payload);
                    // Logica rispettivamente in caso di inserimento, aggiornamento o cancellazione nella
                    // tabella game_players dove matcha il gameId
                    if (payload.eventType === 'INSERT') {
                        setPlayers(prev => [...prev, payload.new]);
                    } else if (payload.eventType === 'UPDATE') {
                        setPlayers(prev => prev.map(p => p.user_id === payload.new.user_id ? payload.new : p));
                    } else if (payload.eventType === 'DELETE') {
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
                    console.log("Timer aggiornato:", payload)
                    setTargetStartTime(payload.new.target_start_time)
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

    const mainPlayer = players.find(player => player.user_id === currentUserId)
    const opponents = currentUserId 
        ? players.filter(player => player.user_id !== currentUserId)
        : [];

    return (
        <div className='outer-container'>
            <TableContainer 
                playerCards={myCards} // TODO: da sostituire con mainPlayer?.cards
                dealerCards={dealerCards}
                opponents={opponents}
                gameId={gameId}
                currentPlayerStatus={mainPlayer?.status || 'waiting'}
                targetStartTime={targetStartTime}
            />
        </div>
    );
}