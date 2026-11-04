import { IS_BETA } from '../channel.js';
/** Explicit opt-in: production, ESSAI preparation and historical builds keep their presentation. */
export const SOBER_V3 = IS_BETA && import.meta.env.VITE_REKKA_VISUAL === 'v3';
