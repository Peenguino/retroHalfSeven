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
    isCurrentTurn: boolean;
}

export interface TableContainerProps {
    playerCards: CardProps[]; 
    dealerCards: CardProps[];
    opponents: any[];
    gameId: string | undefined;
    currentPlayerStatus: string;
    targetStartTime: string | null;
    currentTurnPlayerId: string | null;
    currentUserId: String | null;
    gameStatus: string;
    gameResults?: any | null;
    userBalance?: number | null;
    inviteCode?: string | null;
}