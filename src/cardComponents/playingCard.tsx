import './playingCard.css'
import type { CardProps } from './types'

import semeDenari from '../assets/exportedAssets/semeDenari.png';
import semeCoppe from '../assets/exportedAssets/semeCoppe.png';
import semeBastoni from '../assets/exportedAssets/semeBastoni.png';
import semeSpade from '../assets/exportedAssets/semeSpade.png';

const SUIT_IMAGES: Record<string, string> = {
  bastoni: semeBastoni,
  denari: semeDenari,
  coppe: semeCoppe,
  spade: semeSpade,
};

import {CardCenter} from './cardCenter';

// Per estetica del gioco scelgo di inserire titoli carta in italiano, ma stiamo indicizzando tramite l'utilizzo di interi
// castati a stringhe, che utilizziamo successivamente per definire le iterazioni della map, quindi attualmente
// preferisco l'utilizzo di uno switch per la selezione del titolo

const cardTitle = (value: String) => {
  switch (value) {
    case '1':
      return "asso"
    case '2':
      return "due"
    case '3':
      return "tre"
    case '4':
      return "quattro"
    case '5':
      return "cinque"
    case '6':
      return "sei"
    case '7':
      return "sette"
    case '8':
      return "fante"
    case '9':
      return "cavallo"
    case '10':
      return "re"
  }
}


const PlayingCard = ({ rank, suit, onClick }: CardProps) => {

  const imgSuit = SUIT_IMAGES[suit.toLowerCase()];

  return (
      <div 
        className={`card-container`} 
        onClick={onClick}
        role="button"
        tabIndex={0}
      >
        
        <div className="card-corner top">
          <div>{cardTitle(rank)}</div>
        </div>

        <CardCenter rank={rank} suit={suit}/>
        {parseInt(rank) >= 8 ? (
          <div className="card-corner bottom">
            <img 
              src={imgSuit} 
              alt="seme"
              className="suit-icon"
            />
          </div>
          ) : null
        }
      </div>
    );
};

export default PlayingCard