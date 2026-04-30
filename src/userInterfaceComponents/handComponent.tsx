import PlayingCard from '../cardComponents/playingCard';
import { type CardProps } from '../cardComponents/types';
import './handComponent.css';

interface HandProps {
  cards: CardProps[];
}

export default function Hand({ cards }: HandProps) {
  const totalCards = cards.length;
  // gradi di rotazione tra una carta e l'altra
  const angleStep = 12; 

  return (
    <div className="hand-container">
        
      {cards.map((card, index) => {
        // calcola dinamicamente altezza e rotazione carte in base alla quantità
        const middleIndex = (totalCards - 1) / 2;
        const rotation = (index - middleIndex) * angleStep;
        const translateY = Math.abs(index - middleIndex) * 20;

        return (
          <div
            key={`${card.suit}-${card.rank}-${index}`}
            className='hand-card'
            style={{
              transform: `rotate(${rotation}deg) translateY(${translateY}px)`,
            }}
          >
            <PlayingCard rank={card.rank} suit={card.suit} />
          </div>
        );
      })}
    </div>
  );
}