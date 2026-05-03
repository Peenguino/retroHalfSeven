import PlayerBustedOverlay from "../playerBustedOverlay/playerBustedOverlay";

// Pannello dei comandi in partita per carta o stai
export default function PlayActions({ isMyTurn, isActionInProgress, currentPlayerStatus, handleDrawCard, handleStand, bustedScore }: any) {
    if (!isMyTurn) {
        return (
            <div style={{ color: 'white', fontSize: '18px', padding: '10px' }}>
                In attesa banco e altri giocatori...
            </div>
        );
    }
    
    const isDisabled = isActionInProgress || currentPlayerStatus === 'busted';
    
    return (
        <>
            <PlayerBustedOverlay score={bustedScore} />
            <button 
                className='playing_button'
                onClick={handleDrawCard}
                disabled={isDisabled}
                style={{ opacity: isDisabled ? 0.5 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
            >
                {'CARTA'}
            </button>
            <button 
                className='playing_button'
                onClick={handleStand}
                disabled={isDisabled}
                style={{ opacity: isDisabled ? 0.5 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                >
                {currentPlayerStatus === 'busted' ? 'SBALLATO' : 'STAI'}
            </button>
        </>
    );
}