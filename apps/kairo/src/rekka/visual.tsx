/** Presentation only: approved artwork, backed by existing application selectors. */
import type { Sport } from '@hybridsport/app-core';
import { selectFieldHistory, selectFreeRuns } from '@hybridsport/app-core';
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
export function SportEmblem({ sport }: { sport: Sport }) { return <img className="rv-emblem" src={ICONS[sport]} alt={SPORT_NAMES[sport]} width={64} height={64} />; }
export function RekkaBrand() { return <div className="rv-brand"><img src={logo} alt="REKKA" /><span className="rv-kanji" lang="ja" aria-label="烈火" /><span>Nourris ta flamme.</span></div>; }
export function SportLinks({ onPlanning }: { onPlanning: () => void }) { return <nav className="rv-sports" aria-label="Disciplines">{SPORTS.map(s=><button type="button" key={s} data-sport={s} onClick={onPlanning}><SportEmblem sport={s} /><span>{SPORT_NAMES[s]}</span></button>)}</nav>; }
export function VisualHeader({ title, sport, profile = false }: { title: string; sport?: Sport; profile?: boolean }) {
 const {state}=useStore();
 return <header className={`rv-header ${sport?'rv-session-header':''} ${profile?'rv-profile-header':''}`} data-sport={sport} style={{backgroundImage:`linear-gradient(0deg,#04121f,transparent 95%),url("${sport?BANNERS[sport]:hero}")`}}>
  {sport&&<SportEmblem sport={sport}/>}<h1>{title}</h1>
  {profile&&<div className="rv-identity"><img src={avatar} alt="Avatar REKKA" width={72} height={72}/><div><strong>{state.profile?.displayName||'Mon profil'}</strong><span>Mon entraînement, mes objectifs</span></div></div>}
 </header>;
}
export function LiveSessions({onOpen}:{onOpen:(id:string)=>void}) {
 const {state,clock}=useStore();const week=weekOf(state,clock().today);
 return <section className="screen rv-sessions" aria-label="Mes séances"><VisualHeader title="Séances"/>{!week?.items.length&&<p className="empty">Aucune séance disponible cette semaine.</p>}{week?.items.map(v=><SessionCard0 key={v.requestId} v={v} onOpen={onOpen}/>)}</section>;
}
export function LiveProgress() {
 const {state}=useStore();const entries=selectFieldHistory(state).filter(e=>e.completion!=='missed');const runs=selectFreeRuns(state);
 const seconds=entries.reduce((n,e)=>n+(e.durationS??e.run?.realizedDurationS??0),0)+runs.reduce((n,r)=>n+r.durationS,0);
 return <section className="rv-metrics" aria-label="Progression réelle"><div><b>{entries.length+runs.length}</b><span>séances enregistrées</span></div><div><b>{Math.floor(seconds/3600)} h {Math.floor(seconds%3600/60)}</b><span>durée renseignée</span></div><div><b>{new Set([...entries.map(e=>e.sport),...(runs.length?['running']:[])]).size}</b><span>sports pratiqués</span></div></section>;
}
