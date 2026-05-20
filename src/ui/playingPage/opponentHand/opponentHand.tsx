import { type OpponentProps } from "../../../types";
import Hand from "../../handComponent/handComponent";

// Gestione visiva della mano degli avversari in base alla posizione e allo stato
export default function OpponentHand({ cards, gridArea, rotationClass, status, isCurrentTurn }: OpponentProps) {
    if (!status) return null;

    if (status === 'left') {
        return (
            <div className={`opponent-grid-cell`} style={{ gridArea: gridArea }}>
                <div className={`opponent-rotation-wrapper ${rotationClass}`}>
                    <div style={{ 
                        width: '60px', height: '60px', backgroundColor: 'rgba(50, 50, 50, 0.8)',
                        borderRadius: '50%', border: '2px solid gray', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: 'gray',
                        fontSize: '9px', textAlign: 'center'
                    }}>
                        USCITO
                    </div>
                </div>
            </div>            
        )
    }

    return (
        <div className={`opponent-grid-cell ${isCurrentTurn ? 'active-turn' : ''}`} style={{ gridArea: gridArea }}>
            <div className={`opponent-rotation-wrapper ${rotationClass}`}>
                {cards && cards.length > 0 ? (
                    <Hand cards={cards} />
                ) : (
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