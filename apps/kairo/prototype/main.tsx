/**
 * REKKA V2 — point d'entrée du prototype isolé (lot V2-2). Build séparée (`vite.prototype.config.ts`) : aucun service
 * worker, aucun manifeste, aucun accès au stockage de l'application. Thème V2 forcé (`<html data-theme="v2">`).
 * `?ecran=planning|seance|progression|seances|profil` ouvre directement un écran (captures, revue).
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/design/rekka-v2.css';
import '../src/design/rekka-components.css';
import './prototype.css';
import { Prototype } from './Prototype.js';
import type { ProtoTab } from './Prototype.js';

const SCREENS: Readonly<Record<string, ProtoTab | 'workout'>> = { accueil: 'home', planning: 'plan', seance: 'workout', progression: 'progress', seances: 'sessions', profil: 'profile' };
const initial = SCREENS[new URLSearchParams(location.search).get('ecran') ?? ''] ?? 'home';
const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><Prototype initial={initial} /></StrictMode>);
