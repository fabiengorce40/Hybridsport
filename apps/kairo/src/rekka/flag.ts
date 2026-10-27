import { IS_BETA } from '../channel.js';
/** Beta-only visual release. Build with VITE_REKKA_THEME=off to retain the previous presentation. */
export const REKKA_V2 = IS_BETA && import.meta.env.VITE_REKKA_THEME !== 'off';
