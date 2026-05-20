// Header contenente il codice stanza e il pulsante di abbandono
import LeaveGameButton from '../leaveGameButton/leaveGameButton';
import './roomCodeHeader.css'

export default function RoomCodeHeader({ 
    inviteCode, 
    gameId, 
    currentUserId 
}: { 
    inviteCode: string | null | undefined;
    gameId: string | undefined;
    currentUserId: string | null;
}) {
    if (!inviteCode) return null;
    return (

        <div className='room-code-header'>

            <div>
                Codice Stanza: <strong style={{ color: '#ffd43b', letterSpacing: '2px' }}>{inviteCode}</strong>
            </div>
            <LeaveGameButton gameId={gameId} currentUserId={currentUserId} />
        </div>

    );
}