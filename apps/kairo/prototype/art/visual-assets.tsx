/** Artwork for the isolated visual branch only. No production asset is replaced. */
import hero from './visual/accueil.webp';
import landscape from './visual/paysage.webp';
import gym from './visual/seance.webp';
import brush from './visual/logo-brush.svg';
export const VISUAL_ART = {
  accueil: { src: hero, alt: 'Ville néon cyberpunk au coucher du soleil et athlète roux au bord de l’eau' },
  objectifs: { src: landscape, alt: 'Vallée japonaise, montagnes, lac turquoise et torii au soleil' },
  bilan: { src: gym, alt: 'Athlète roux dans une salle de musculation aux lumières magenta' },
};
export function VisualLogo({ className }: { className?: string }) {
  return <img className={className} src={brush} alt="REKKA" draggable={false} />;
}
