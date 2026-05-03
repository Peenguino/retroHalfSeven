import venticentesimi from './exportedAssets/20cent.png';
import cinquantacentesimi from './exportedAssets/50cent.png';
import uneuro from './exportedAssets/1euro.png';
import dueeuro from './exportedAssets/2euro.png';
import annullabutton from './exportedAssets/resetBet.png';

export const COINS_IMAGES: Record<string, string> = {
    "0.2": venticentesimi,
    "0.5": cinquantacentesimi,
    "1": uneuro,
    "2": dueeuro,
    "-1": annullabutton
};