import './playingCard.css'

import semeDenari from '../assets/exportedAssets/semeDenari.png';
import semeCoppe from '../assets/exportedAssets/semeCoppe.png';
import semeBastoni from '../assets/exportedAssets/semeBastoni.png';
import semeSpade from '../assets/exportedAssets/semeSpade.png';
import reImg from '../assets/exportedAssets/re.png';
import cavalloImg from '../assets/exportedAssets/cavallo.png';
import donnaImg from '../assets/exportedAssets/donna.png';


import type { CardProps } from './types'

const SUIT_IMAGES: Record<string, string> = {
  bastoni: semeBastoni,
  denari: semeDenari,
  coppe: semeCoppe,
  spade: semeSpade,
};

const FIGURES_IMAGES: Record<string, string> = {
  "8": donnaImg,
  "9": cavalloImg,
  "10": reImg,
}

// Prendo in considerazione solo le classi layout-#0n di cui sto modificando il CSS
// in modo specifico. Le altre faranno riferimento al normale comportamento di .card-center

function findLayoutClass (count: number) {
  switch (count) {
    case 1:
      return 'layout-1'
    case 2:
      return 'layout-2'
    case 3:
      return 'layout-3'
    case 4:
      return 'layout-4'
    case 7:
      return 'layout-7'
    default:
      if (count >= 8) {
        return 'layout-figure'
      } else {
        return ''
      }
  }
}

const CardCenter = ({ rank, suit }: CardProps) => {
    const imgSuit = SUIT_IMAGES[suit.toLowerCase()];
    const imgFigure = FIGURES_IMAGES[rank.toLowerCase()];
    const count = parseInt(rank);
    const layoutClass = findLayoutClass(count)

    return ( 
      (count < 8) ?
        <div className={`card-center ${layoutClass}`}>
        {Array.from({ length: count }).map((_, i) => (
          <img 
            key={i} 
            src={imgSuit} 
            alt={`Seme ${suit}`} 
            className="suit-icon"
          />
        ))}
      </div>
      :
      <div className={`card-center ${layoutClass}`}>
          <img 
            src={imgFigure} 
            alt={`Seme ${suit}`} 
            className="suit-icon"
          />
      </div>
    );
}

export {CardCenter};