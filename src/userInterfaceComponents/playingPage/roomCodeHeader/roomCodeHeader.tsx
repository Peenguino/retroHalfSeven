// Header contenente il codice stanza
export default function RoomCodeHeader({ inviteCode }: { inviteCode: string | null | undefined }) {
    if (!inviteCode) return null;
    return (

        <div style={{
            position: 'absolute', top: '15px', left: '15px', 
            backgroundColor: 'rgba(0, 0, 0, 0.6)', color: 'white', 
            padding: '8px 12px', borderRadius: '8px', zIndex: 10,
            border: '1px solid rgba(255,255,255,0.2)',
            fontFamily: 'Press Start 2P, cursive', fontSize: '16px'
        }}>

            <div>
                Codice Stanza: <strong style={{ color: '#ffd43b', letterSpacing: '2px' }}>{inviteCode}</strong>
            </div>
        </div>

    );
}