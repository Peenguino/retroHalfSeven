// Overlay visivo quando il punteggio supera il limite
export default function PlayerBustedOverlay({ score }: { score: number | null }) {
    if (score === null) return null;
    return (
        <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(200, 0, 0, 0.9)', color: 'white', padding: '30px',
            borderRadius: '15px', zIndex: 20, textAlign: 'center', border: '3px solid #ff0000',
            boxShadow: '0 0 20px rgba(255, 0, 0, 0.5)', fontSize: '24px', fontWeight: 'bold',
            animation: 'pulse 1.5s ease-in-out'
        }}>
            <div style={{ fontSize: '32px', marginBottom: '15px' }}>SBALLATO!</div>
            <div>Score: {score}</div>
        </div>
    );
}