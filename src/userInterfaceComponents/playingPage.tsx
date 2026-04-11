import { use, useState } from 'react'
import './playingPage.css'
import Hand from './handComponent'
import DealerHand from './dealerComponent';
import { type CardProps,
         type HandProps,
         type BettedFichesProps, 
         type FichesProps} from '../cardComponents/types';
import './handComponent.css';

import venticentesimi from '../assets/exportedAssets/20cent.png';
import cinquantacentesimi from '../assets/exportedAssets/50cent.png';
import uneuro from '../assets/exportedAssets/1euro.png';
import dueeuro from '../assets/exportedAssets/2euro.png';
import annullabutton from '../assets/exportedAssets/resetBet.png';

const COINS_IMAGES: Record<string, string> = {
    "0.2": venticentesimi,
    "0.5": cinquantacentesimi,
    "1": uneuro,
    "2": dueeuro,
    "-1": annullabutton
};

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
  { rank: "8", suit: "denari" },
];

function ActionButton({ buttonType }: { buttonType: string }) {
    return (
        <button className='playing_button'>
            {buttonType}
        </button>
    )
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
        <div>
            { owner === "Player"
                ?  `Score mano: ${calculateScore()}`
                :  `Score banco: ${calculateScore()}`
            }
        </div>
    )
}

function BettedFiches({ stackedFiches }: BettedFichesProps) {

    function calculateBet() {
        const res = stackedFiches.reduce((acc, currFiches) => acc + currFiches.value, 0)
        return res
    }

    return (
        <div>
        {`Puntata: ${calculateBet().toFixed(2)}€`}
        </div>
    )
}

function Fiches({ value, onClickFiche }: { value: number, onClickFiche: (v: number) => void }) {
    const imageSrc = COINS_IMAGES[value.toString()];

    return (
        <div
            className='fiche_container'
            onClick={() => onClickFiche(value)}
        >
            <img src={imageSrc} />
        </div>
    )
}

function TableContainer({ playerCards, dealerCards }: { playerCards: CardProps[], dealerCards: CardProps[] }) {

    // Mantengo lo stato delle fiches nel componente genitore, quindi TableContainer
    const [getBettedFiches, setBettedFiches] = useState<FichesProps[]>([])

    const handleAddFiche = (ficheValue: number) => {
        setBettedFiches(prevFiches => [...prevFiches, {value: ficheValue}])
    };

    const handleResetFiche = () => {
        setBettedFiches(() => [])
    };


    return (
      <div className='table-container'>
        
        <div className='dealer-area'>
            <DealerHand cards={dealerCards} />
        </div>

        <div className="score-coins">
            <Fiches value={0.2} onClickFiche={handleAddFiche} />
            <Fiches value={0.5} onClickFiche={handleAddFiche} />
            <Fiches value={1} onClickFiche={handleAddFiche} />
            <Fiches value={2} onClickFiche={handleAddFiche} />
            <Fiches value={-1} onClickFiche={handleResetFiche} />
        </div>

        <div className="actions-area">
            <ActionButton buttonType="CARTA" />
            <ActionButton buttonType="STAI" />
        </div>

        <div className='dealer-score-area'>
            <ScoreVisualizer cards={dealerCards} owner='Dealer' />
        </div>


        <div className='sum-score-fiches-area'>
            <ScoreVisualizer cards={playerCards} owner='Player' />
            <BettedFiches stackedFiches={getBettedFiches} />
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