import { SOBER_V3 } from '../sober/flag.js';
/**
 * REKKA V4 Playfield Pro — activation EXPLICITE au build (`VITE_REKKA_SKIN=playfield-pro`), au-dessus de l'ossature
 * V3.1 (canal BÊTA + `VITE_REKKA_VISUAL=v3`). Sans ce drapeau, la BÊTA V3.1, la production, la préparation ESSAI et les
 * builds historiques gardent exactement leur présentation. Présentation seulement : aucune donnée ni règle métier.
 */
export const PLAYFIELD_V4 = SOBER_V3 && import.meta.env.VITE_REKKA_SKIN === 'playfield-pro';
