export interface CardProps {
  rank: string;
  suit: string;
  onClick?: () => void;
}

export interface HandProps {
  cards: CardProps[];
  owner: string;
}

export interface FichesProps {
  value: number;
}

export interface BettedFichesProps {
  stackedFiches: FichesProps[];
}

export interface OpponentProps {
    cards: CardProps[];
    gridArea: string;
    rotationClass: string;
    status: string;
}