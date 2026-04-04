import PlayingCard from '../cardComponents/playingCard';
import { type CardProps } from '../cardComponents/types';
import './dealerComponent.css';

interface DealerProps {
  cards: CardProps[];
}

export default function DealerHand({cards}: DealerProps) {
    return <>
        {cards.map((card) => {
            return <PlayingCard rank={card.rank} suit={card.suit} />
        })}
    </>
}