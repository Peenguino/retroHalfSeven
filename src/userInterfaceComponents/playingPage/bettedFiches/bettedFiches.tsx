import { type BettedFichesProps } from "../../../types"

// Visualizzatore dell'importo totale puntato
export default function BettedFiches({ stackedFiches }: BettedFichesProps) {
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