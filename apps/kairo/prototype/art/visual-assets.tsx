/** Artwork for the isolated visual branch only. No production asset is replaced. */
import hero from './visual/accueil.webp';
import gym from './visual/seance.webp';
import brush from './visual/logo-brush.svg';
export const VISUAL_ART = {
  accueil: { src: hero, alt: 'Ville néon cyberpunk au coucher du soleil et athlète roux au bord de l’eau' },
  objectifs: { src: hero, alt: 'Ville cyberpunk au soleil couchant, tours néon et reflets sur l’eau' },
  bilan: { src: gym, alt: 'Athlète roux dans une salle de musculation aux lumières magenta' },
};
export function VisualLogo({ className }: { className?: string }) {
  return <img className={className} src={brush} alt="REKKA" draggable={false} />;
}
