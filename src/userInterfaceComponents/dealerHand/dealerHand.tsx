import PlayingCard from '../../cardComponents/playingCard';
import { type CardProps } from '../../types';
import './dealerHand.css';

interface DealerProps {
  cards: CardProps[];
}

export default function DealerHand({cards}: DealerProps) {
  return (
    <div className="dealer-hand-container">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className="dealer-card"
          style={{ 
            // Opzionale: Z-index per assicurarsi che la carta successiva copra la precedente
            zIndex: index 
          }}
        >
          <PlayingCard rank={card.rank} suit={card.suit} />
        </div>
      ))}
    </div>
  );
};
