// Schermata di riepilogo a fine partita per vincite e perdite
export default function ResultsOverlay({ gameResults, currentUserId, opponents }: any) {
    if (!gameResults) return null;
    
    return (
        <div style={{
            position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
            backgroundColor: 'rgba(0,0,0,0.95)', color: 'white', zIndex: 30,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '20px', overflowY: 'auto'
        }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
                RISULTATI
            </div>

            <div style={{ fontSize: '18px', marginBottom: '30px', textAlign: 'center' }}>
                <div style={ {marginBottom: '10px'} }>Banco: <strong>{gameResults.dealer_score}</strong></div>
                <div style={{ color: gameResults.dealer_busted ? '#51cf66' : '#ff6b6b' }}>
                    {gameResults.dealer_busted ? 'BANCO SBALLA' : 'BANCO NON SBALLA'}
                </div>
            </div>

            <div style={{
                backgroundColor: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '10px',
                maxWidth: '900px', maxHeight: '400px', overflowY: 'auto'
            }}>
                {gameResults.results
                    .filter((result: any) => 
                        result.user_id === currentUserId || 
                    opponents.some((opp: any) => opp.user_id === result.user_id)
                )
                .map((result: any, idx: number) => {
                    const isCurrentPlayer = result.user_id === currentUserId; 
                    
                    // Identifico l'oggetto avversario specifico nell'array opponents
                    const opponent = opponents.find((opp: any) => opp.user_id === result.user_id);
                    
                    // Valuto se lo status di questo specifico giocatore è 'left' o 'spectating'
                    const hasLeft = opponent?.status === 'left';         
                    const isSpectator = result?.status === 'spectating'
                    
                    const resultColor =
                        hasLeft ? '#888888'
                        : isSpectator ? '#888888'
                            : result.result === 'win' ? '#51cf66' : result.result === 'draw' ? '#ffd43b' : '#ff6b6b';

                    const resultText = 
                        hasLeft ? 'ABBANDONATO'
                        : isSpectator ? 'SPETTATORE'
                            : result.result === 'win' ? 'VINTO' : result.result === 'draw' ? 'PAREGGIO' : 'PERSO';
                    
                    return (
                        <div key={idx} style={{
                                padding: '16px', marginBottom: '15px', borderLeft: `4px solid ${resultColor}`,
                                backgroundColor: isCurrentPlayer ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                                borderRadius: '5px',
                                opacity: hasLeft ? 0.5 : 1 
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '30px' }}>
                                    <div>

                                        <strong style={{ 
                                            // Cambio il colore in grigio e aggiungo textDecoration sbarrato se è uscito
                                            color: isCurrentPlayer ? '#ffff00' : hasLeft ? '#888888' : 'white',
                                        }}>
                                            {isCurrentPlayer ? 'TU' : `Giocatore ${idx + 1}`}
                                        </strong>

                                        <div style={{ color: '#ccc' }}>Score: {result.score}</div>

                                    </div>

                                    <div style={{ textAlign: 'right' }}>

                                        <div style={{ color: resultColor, fontWeight: 'bold', fontSize: '16px' }}>
                                            {resultText}
                                        </div>

                                        <div style={{ color: '#aaa' }}>
                                            {/* Forzo la vincita mostrata a 0 se il giocatore ha abbandonato */}
                                            Puntata: {result.bet} | Vincita: +{hasLeft ? '0' : result.winnings}
                                        </div>

                                    </div>

                                </div>
                            </div>
                        );
                })}
            </div>
        </div>
    );
}