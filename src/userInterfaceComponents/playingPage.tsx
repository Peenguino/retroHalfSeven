import './playingPage.css'
import Hand from './handComponent'
import DealerHand from './dealerComponent';
import { type CardProps } from '../cardComponents/types';
import './handComponent.css';

interface HandProps {
  cards: CardProps[];
  owner: string
}

// Mockup di carte banco per testare il componente
const dealerCards = [
  { rank: "9", suit: "denari" },
  { rank: "9", suit: "denari" },
  { rank: "10", suit: "denari" },
  { rank: "7", suit: "denari" },
];

// Mockup di una mano di carte per testare il componente
const myCards = [
  { rank: "9", suit: "denari" },
  { rank: "1", suit: "denari" },
  { rank: "1", suit: "denari" },
  { rank: "9", suit: "bastoni" },
  { rank: "8", suit: "denari" },
];

function ActionButton({ buttonType }: { buttonType: string }) {
    return <button className='playing_button'>
        {buttonType}
    </button>
}

function ScoreVisualizer({ cards, owner }: HandProps) {

    function calculateScore() {
        return cards.reduce((acc, card) => {
            const value = (card.rank === "8" || card.rank === "9" || card.rank === "10")
                ? 0.5
                : parseInt(card.rank)
            return acc + value
        }, 0)
    }

    return (
        <>
        { owner === "Player"
            ?  `Score della mano: ${calculateScore()}`
            :  `Score del banco: ${calculateScore()}`
        }
        </>
    )
}

function TableContainer({ playerCards, dealerCards }: { playerCards: CardProps[], dealerCards: CardProps[] }) {
    return (
      <div className='table-container'>
        
        <div className='dealer-area'>
            <DealerHand cards={dealerCards} />
        </div>

        <div className='dealer-score-area'>
            <ScoreVisualizer cards={dealerCards} owner='Dealer' />
        </div>

        <div className='score-area'>
            <ScoreVisualizer cards={playerCards} owner='Player' />
        </div>

        <div className="actions-area">
            <ActionButton buttonType="CARTA" />
            <ActionButton buttonType="STAI" />
        </div>

        <div className="player-area">
            <Hand cards={playerCards} />
        </div>

      </div>
    );
}

export default function Playingpage() {
    return (
        <div className='outer-container'>
            <TableContainer playerCards={myCards} dealerCards={dealerCards}/>
        </div>
    );
}