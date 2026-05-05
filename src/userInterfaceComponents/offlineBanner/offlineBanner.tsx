// Componente banner offline riutilizzabile
import { useOfflineStatus } from "../../utils/useOfflineStatus";

interface OfflineBannerProps {
  variant?: 'simple' | 'warning'; // simple per homepage, warning per pagine critiche
}

export const OfflineBanner = ({ variant = 'simple' }: OfflineBannerProps) => {
  const isOffline = useOfflineStatus();

  if (!isOffline) return null;

  if (variant === 'warning') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 50,
          left: 0,
          right: 0,
          padding: '15px 20px',
          backgroundColor: '#ff6b6b',
          color: 'white',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '16px',
          zIndex: 50,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
      >
        SEI OFFLINE - Ritornando alla home...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '10px 15px',
        backgroundColor: '#ffd93d',
        color: '#333',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '14px',
        marginBottom: '15px',
        borderRadius: '8px',
        border: '1px solid #ffb81c'
      }}
    >
      SEI OFFLINE - I dati potrebbero non essere aggiornati
    </div>
  );
};