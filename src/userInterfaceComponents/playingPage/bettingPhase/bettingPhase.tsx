import Fiches from "../fiches/fiches";

// Pannello di comando pre-partita per selezionare e confermare le fiches
export default function BettingPhase({ handleAddFiche, handleResetFiche, timeLeft, isReady, totalBet, handleReadyClick }: any) {
    return (
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
    );
}