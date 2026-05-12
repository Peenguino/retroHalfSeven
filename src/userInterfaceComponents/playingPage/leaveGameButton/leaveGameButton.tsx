import { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../../auth_supabase/supabaseClient';
import './leaveGameButton.css';

interface LeaveGameButtonProps {
  gameId: string | undefined;
  currentUserId: string | null;
}

export default function LeaveGameButton({ gameId, currentUserId }: LeaveGameButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLeaveGame = async () => {
    if (!gameId || !currentUserId) return;

    setIsLoading(true);
    try {
      // Invochiamo la edge function handle-disconnection per settare lo status a "left"
      const { data, error } = await supabase.functions.invoke('handle-disconnection', {
        body: { user_id: currentUserId, game_id: gameId }
      });

      if (error) {
        console.error('Errore durante l\'abbandono della partita:', error);
        alert('Errore: impossibile abbandonare la partita');
        return;
      }

      if (data?.error) {
        console.error('Errore dalla funzione:', data.error);
        alert('Errore: ' + data.error);
        return;
      }

      console.log('Abbandono della partita completato!');
      
      // Chiudi il modal e torna alla home
      setShowModal(false);
      navigate('/');
    } catch (error) {
      console.error('Errore durante l\'abbandono della partita:', error);
      alert('Errore: impossibile abbandonare la partita');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        className="leave-game-button" 
        onClick={() => setShowModal(true)}
        disabled={isLoading}
        title="Abbandona la partita"
      >
        ESCI
      </button>

      {showModal && (
        <div className="leave-game-modal-overlay" onClick={() => !isLoading && setShowModal(false)}>
          <div className="leave-game-modal" onClick={(e) => e.stopPropagation()}>
            <h2> Sei sicuro di voler uscire? </h2>
            
            <div className="leave-game-warning">
              Attenzione: Una volta abbandonata, non potrai più riunirti a questa stanza.
            </div>

            <div className="leave-game-modal-buttons">
              <button 
                className="leave-game-cancel-btn"
                onClick={() => setShowModal(false)}
                disabled={isLoading}
              >
                NO
              </button>
              <button 
                className="leave-game-confirm-btn"
                onClick={handleLeaveGame}
                disabled={isLoading}
              >
                {isLoading ? 'ESCO...' : 'SÌ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
