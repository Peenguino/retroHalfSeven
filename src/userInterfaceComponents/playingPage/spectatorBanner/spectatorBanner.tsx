// Banner centrale mostrato ai giocatori in stato spettatore
export default function SpectatorBanner() {
    return (
        <div className="spectator-banner" style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', padding: '20px',
            borderRadius: '10px', zIndex: 10, textAlign: 'center', border: '2px solid gold',
            marginTop: '50px'
        }}>
            <h3>Stai guardando la partita</h3>
            <p>Entrerai in gioco automaticamente alla prossima mano.</p>
        </div>
    );
}