// === Importazione mapping per assets .png monete
import { COINS_IMAGES } from "../../../assets/assetsMapping";

// Singolo gettone cliccabile
export default function Fiches({ value, onClickFiche }: { value: number, onClickFiche: (v: number) => void }) {
    const imageSrc = COINS_IMAGES[value.toString()];

    return (
        <div
            className='fiche_container'
            onClick={() => onClickFiche(value)}
        >
            <img src={imageSrc} alt={`Fiche ${value}`} />
        </div>
    )
}
