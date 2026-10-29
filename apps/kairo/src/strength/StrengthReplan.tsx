import { useEffect, useState } from 'react';
import { beta0Environment, exerciseLabel, replanSessionDetails, confirmStrengthWeekReplan, previewStrengthWeekReplan, requestProfileOrigin, weekPlacementExplanation, weekLoadWarnings, weekStartOf } from '@hybridsport/app-core';
import type { AppState, PersistedWeek, ProfileInput, WeekReplanPreview } from '@hybridsport/app-core';
import { useStore } from '../store.js';
import { Notice } from '../ui.js';
const names={strength:'Musculation',hyrox:'HYROX',running:'Course',crosstraining:'Cross-training'};
export function PlacementExplanation({weekStart,state:provided}:{weekStart:string;state?:AppState}) {
 const store=useStore();const state=provided??store.state;const rows=weekPlacementExplanation(state,weekStart);if(!rows)return null;
 return <section className="card" aria-label="Demandes et placements"><h3>Demandes et placements</h3>{rows.map(row=><div key={row.sport}>
  <p><strong>{row.name} : {row.placed} planifiée(s) · {row.requested} demandée(s) maintenant</strong>{row.previous>0&&<span className="small"> · {row.previous} selon l’ancien profil, non recalculée(s)</span>}</p>
  {row.deferred>0&&<p className="small">{row.deferred} nouvelle(s) demande(s) non encore générée(s) : cette semaine conserve l’ancien profil. Prévisualisez un recalcul ou appliquez aux prochaines semaines.</p>}
  {row.missing.map(m=><div key={m.requestId} className="small"><strong>{m.composed?'Séance supplémentaire non planifiée':'Demande non placée'}</strong><p>{m.text}</p><details><summary>Alternatives à prévisualiser</summary><ul>{m.alternatives.map(a=><li key={a}>{a}</li>)}</ul></details></div>)}
 </div>)}</section>;
}
function Rows({state,week}:{state:AppState;week:PersistedWeek}) {
 return <ul className="small">{week.requests.map(r=>{const detail=replanSessionDetails(r);return <li key={r.requestId}>{r.date??'Non planifiée'} · {names[r.sport]} · {r.intent?.archetypeId==='str_upper'?'haut du corps':r.intent?.archetypeId==='str_lower'?'bas du corps':r.status==='planned'?'séance planifiée':'non placée'}{r.sport==='strength'?` · ${requestProfileOrigin(state,week.weekStart,r.requestId)==='previous'?'ancien profil':'profil actuel'}`:''}{detail&&<details><summary>Prescription · {detail.minutes} min disponibles</summary><ul>{detail.items.map((i,k)=><li key={k}>{exerciseLabel(i.exerciseId)}{i.sets!==null?` · ${i.sets} série(s) de travail`:''}</li>)}</ul></details>}</li>;})}</ul>;
}
const messages:Record<string,string>={REPLAN_NOT_ALLOWED:'Cette semaine est absente ou clôturée : elle ne peut pas être recalculée.',REPLAN_STALE:'Le profil, la date ou une séance a changé. Prévisualisez de nouveau avant de confirmer.',SAFETY_PAUSE_ACTIVE_PAIN:'La pause de sécurité empêche le recalcul.',REPLAN_VOLUME_LIMIT:'Le volume de séances conservées ne permet pas ce recalcul sans dépasser la limite de récupération.',REPLAN_RECORD_UNREADABLE:'Une séance conservée est illisible. Aucun remplacement effectué.'};
export function StrengthReplanControl({profile}:{profile?:ProfileInput}) {
 const store=useStore();const [preview,setPreview]=useState<WeekReplanPreview|null>(null);const [accepted,setAccepted]=useState(false);const [message,setMessage]=useState('');const p=profile??store.state.profile;
 useEffect(()=>{setPreview(null);setAccepted(false);},[profile]);
 if(!p?.strength.personalization?.completed)return null;
 const start=()=>{setMessage('');setAccepted(false);try{setPreview(previewStrengthWeekReplan(store.state,p,store.clock(),beta0Environment()));}catch(e){setMessage(messages[(e as Error).message]??'Le recalcul n’est pas possible. Aucune donnée modifiée.');}};
 return <section className="card" aria-label="Recalcul de la semaine"><h3>Appliquer à cette semaine</h3>
 <p className="small">Prévisualisez le remplacement des séances Musculation/HYROX futures non commencées. Les séances réalisées, commencées ou avec performances restent verrouillées. Les autres sports restent en place.</p>
 <button className="btn secondary block" onClick={start}>Recalculer ma semaine</button>
 {preview&&<div aria-label="Prévisualisation du planning"><h4>Avant</h4><Rows state={store.state} week={preview.before}/><h4>Après proposé</h4><Rows state={preview.next} week={preview.after}/>
 <p className="small">{preview.protectedIds.length} séance(s) protégée(s). {preview.alternativesTried} organisations examinées. Les avertissements de récupération restent visibles : la proposition n’est pas une garantie de placer toutes les demandes.</p>
 <PlacementExplanation state={preview.next} weekStart={preview.weekStart}/>
 <ul className="small">{weekLoadWarnings(preview.next,preview.weekStart).map((w,i)=><li key={i}>{w.kind==='consecutive'?`${w.days} jours consécutifs : récupération à surveiller.`:w.kind==='multisport_conflict'?`${w.items.length} conflit(s) musculaire(s) restant(s) entre sports : consultez les séances concernées avant de les maintenir.`:w.kind==='full_body_consecutive'?'Des séances corps entier restent consécutives.':'Aucun jour de repos dans cette semaine.'}</li>)}</ul>
 <Notice>La confirmation enregistre aussi vos objectifs pour les prochaines semaines. Aucun changement n’est enregistré tant que vous n’avez pas confirmé.</Notice>
 <label className="small"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> Je confirme le remplacement des séances futures affichées et j’ai pris connaissance des avertissements.</label>
 <button className="btn primary block" disabled={!accepted} onClick={()=>{let failure='';const ok=store.apply((s,c)=>{try{return confirmStrengthWeekReplan(s,preview,c,true,beta0Environment());}catch(e){failure=messages[(e as Error).message]??'Confirmation refusée : prévisualisez de nouveau.';throw e;}});if(ok){setPreview(null);setMessage('Semaine recalculée. Séances protégées et performances conservées.');}else setMessage(failure);}}>Confirmer le nouveau planning</button>
 <button className="btn ghost block" onClick={()=>{setPreview(null);setAccepted(false);setMessage('Prévisualisation annulée. Aucune donnée modifiée.');}}>Annuler la replanification</button></div>}
 {message&&<p role="status">{message}</p>}
 </section>;
}
export function CurrentWeekReplan(){const {clock}=useStore();return <><PlacementExplanation weekStart={weekStartOf(clock().today)}/><StrengthReplanControl/></>;}
