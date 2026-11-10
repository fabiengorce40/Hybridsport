/** Presentation only: approved artwork, backed by existing application selectors. */
import type { Sport } from '@hybridsport/app-core';
import { SOBER_V3 } from '../sober/flag.js';
import { HomeSportIcon } from '../sober/HomeSportIcon.js';
import { SoberLogo } from '../sober/Artwork.js';
import { PlayfieldLogo } from '../playfield/PlayfieldLogo.js';
import { PLAYFIELD_V4 } from '../playfield/flag.js';
import { SportIcon } from '../design/SportIcon.js';
export { REKKA_V2 } from './flag.js';
import { useStore } from '../store.js';
import { weekOf, SessionCard0 } from '../screens/beta0/common.js';
import hero from './assets/accueil.webp';
import avatar from './assets/avatar.webp';
import logo from './assets/logo-brush.svg';
import strength from './assets/icon-musculation.webp';
import running from './assets/icon-course.webp';
import hyrox from './assets/icon-hyrox.webp';
import ct from './assets/icon-crosstraining.webp';
import strengthBanner from './assets/banner-musculation.webp';
import runningBanner from './assets/banner-course.webp';
import hyroxBanner from './assets/banner-hyrox.webp';
import ctBanner from './assets/banner-crosstraining.webp';
const SPORTS: readonly Sport[] = ['strength', 'running', 'hyrox', 'crosstraining'];
export const SPORT_NAMES: Record<Sport, string> = { strength: 'Musculation', running: 'Course', hyrox: 'HYROX', crosstraining: 'Cross-training' };
const ICONS: Record<Sport, string> = { strength, running, hyrox, crosstraining: ct };
const BANNERS: Record<Sport, string> = { strength: strengthBanner, running: runningBanner, hyrox: hyroxBanner, crosstraining: ctBanner };
export function SportEmblem({ sport }: { sport: Sport }) { if (SOBER_V3) return <SportIcon sport={sport} className="rv-emblem" />; return <img className="rv-emblem" src={ICONS[sport]} alt={SPORT_NAMES[sport]} width={64} height={64} />; }
export function RekkaBrand() { if (PLAYFIELD_V4) return <div className="v3-brand pf-brand"><PlayfieldLogo/><span>Nourris ta flamme.</span></div>; if (SOBER_V3) return <div className="v3-brand"><SoberLogo/><span>Nourris ta flamme.</span></div>; return <div className="rv-brand"><img src={logo} alt="REKKA" /><span className="rv-kanji" lang="ja" aria-label="烈火" /><span>Nourris ta flamme.</span></div>; }
export function SportLinks({ onPlanning }: { onPlanning: () => void }) { return <nav className="rv-sports" aria-label="Disciplines">{SPORTS.map(s=><button type="button" key={s} data-sport={s} onClick={onPlanning}>{SOBER_V3 ? <HomeSportIcon sport={s}/> : <SportEmblem sport={s}/>}<span>{SPORT_NAMES[s]}</span></button>)}</nav>; }
export function VisualHeader({ title, sport, profile = false }: { title: string; sport?: Sport; profile?: boolean }) {
 const {state}=useStore();
 if (SOBER_V3) return <header className="v3-page-header" data-sport={sport}>{sport&&<SportEmblem sport={sport}/>}<h1>{title}</h1>{profile&&<p>{state.profile?.displayName||'Mon profil'} · Mon entraînement, mes objectifs</p>}</header>;
 return <header className={`rv-header ${sport?'rv-session-header':''} ${profile?'rv-profile-header':''}`} data-sport={sport} style={{backgroundImage:`linear-gradient(0deg,#04121f,transparent 95%),url("${sport?BANNERS[sport]:hero}")`}}>
  {sport&&<SportEmblem sport={sport}/>}<h1>{title}</h1>
  {profile&&<div className="rv-identity"><img src={avatar} alt="Avatar REKKA" width={72} height={72}/><div><strong>{state.profile?.displayName||'Mon profil'}</strong><span>Mon entraînement, mes objectifs</span></div></div>}
 </header>;
}
export function LiveSessions({onOpen}:{onOpen:(id:string)=>void}) {
 const {state,clock}=useStore();const week=weekOf(state,clock().today);
 return <section className="screen rv-sessions" aria-label="Mes séances"><VisualHeader title="Séances"/>{!week?.items.length&&<p className="empty">Aucune séance disponible cette semaine.</p>}{week?.items.map(v=><SessionCard0 key={v.requestId} v={v} onOpen={onOpen}/>)}</section>;
}
