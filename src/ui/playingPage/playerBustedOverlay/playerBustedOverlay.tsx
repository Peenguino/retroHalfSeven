import './playerBustedOverlay.css'

// Overlay visivo quando il punteggio supera il limite
export default function PlayerBustedOverlay({ score }: { score: number | null }) {
    if (score === null) return null;
    return (
        <div className="player-busted-overlay">
            <div style={{ fontSize: '32px', marginBottom: '15px' }}>SBALLATO!</div>
            <div>Score: {score}</div>
        </div>
    );
}