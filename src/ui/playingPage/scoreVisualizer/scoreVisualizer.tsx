import { type HandProps } from '../../../types';

// Visualizzatore del punteggio della mano
export default function ScoreVisualizer({ cards, owner }: HandProps) {
    function calculateScore() {
        if (!cards) return 0;
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