import { useState } from 'react';
import type { ReactNode } from 'react';
import { SportIcon } from '../design/SportIcon.js';
import { approxMinutes, exerciseLabel, intensityLabel } from '@hybridsport/app-core';
import type { ProgrammeSessionView } from '@hybridsport/app-core';
import { isSets, LightBlock, alternativesText } from '../workout/StrengthWorkout.js';
import { muscleText } from './Artwork.js';
import { PLAYFIELD_V4 } from '../playfield/flag.js';
import { PlayfieldAnatomy } from '../playfield/PlayfieldAnatomy.js';

const repText = (r: number | { min: number; max: number }) => typeof r === 'number' ? String(r) : `${r.min}–${r.max}`;
type Tabs = 'infos'|'historique'|'conseils';

/** Preview remains the same real prescription. V4 adds a dedicated exercise-details view. */
export function StrengthPreview({v,title,onBack,onStart,preparation,context,goalLabel}:{
  v:ProgrammeSessionView;title:string;onBack:()=>void;onStart:()=>void;
  preparation:ReactNode;context:ReactNode;goalLabel:string;
}){
 const items=v.session.blocks.filter(b=>!['warmup','cooldown'].includes(b.kind))
   .flatMap(b=>b.items.filter(isSets));
 const count=items.reduce((n,i)=>n+i.prescription.sets.length,0);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [detailTab,setDetailTab]=useState<Tabs>('infos');
 const selected=items.find(i=>i.id===selectedId);
 if(PLAYFIELD_V4&&selected){
   const label=exerciseLabel(selected.exerciseId);
   const muscles=muscleText(selected.exerciseId);
   const setLogs=v.log?.sets.filter(s=>s.itemId===selected.id&&s.done)??[];
   const kind=/shoulder|lateral|overhead/i.test(selected.exerciseId)?'shoulders':/chest|bench|fly|pec/i.test(selected.exerciseId)?'chest':/curl|triceps/i.test(selected.exerciseId)?'arms':'back';
   const workingSets=selected.prescription.sets.filter(s=>s.kind!=='rampup');
   const firstWork=workingSets[0];
   return <main className="v3-workout pf-exercise-detail" data-exercise-detail={selected.exerciseId}>
     <header className="pf-detail-toolbar">
       <button onClick={()=>setSelectedId(null)} aria-label="Retour à la liste d'exercices">←</button>
       <strong>Détail exercice</strong><span/>
     </header>
     <div className="pf-detail-heading">
       <SportIcon sport="strength" label={false}/>
       <div><h1>{label}</h1><p>{muscles}</p></div>
     </div>
     <div className="pf-detail-art"><PlayfieldAnatomy target={kind}/></div>
     <div className="pf-detail-tabs" role="group" aria-label="Rubrique de l'exercice">
       {([['infos','Infos'],['historique','Historique'],['conseils','Conseils']] as const).map(([id,text])=>
        <button key={id} type="button" aria-pressed={detailTab===id} onClick={()=>setDetailTab(id)}>{text}</button>)}
     </div>
     {detailTab==='infos'&&<section className="pf-detail-content">
       {firstWork && <div className="pf-detail-quickfacts" aria-label="Repères prescrits pour cet exercice">
         <div><strong>{workingSets.length}</strong><span>série{workingSets.length>1?'s':''} de travail</span></div>
         <div><strong>{repText(firstWork.reps)}</strong><span>répétitions visées</span></div>
         <div><strong>{firstWork.restAfterS} s</strong><span>repos prévu</span></div>
       </div>}
       <h2>Prescription réelle</h2>
       <ul>{selected.prescription.sets.map((set,i)=><li key={i}>
         <strong>{set.kind==='rampup'?'Montée en charge':`Série ${i+1}`}</strong>
         <span>{repText(set.reps)} répétitions · repos {set.restAfterS}s</span>
         <small>{intensityLabel(set)}{set.kind==='rampup'?' · hors volume et progression':''}</small>
       </li>)}</ul>
       <p>{alternativesText(selected.alternatives??[])}</p>
     </section>}
     {detailTab==='historique'&&<section className="pf-detail-content">
       <h2>Séries enregistrées dans cette séance</h2>
       {setLogs.length===0?<p>Aucune série encore enregistrée dans cette séance.</p>:
         <ul>{setLogs.map((s,i)=><li key={i}>
          <strong>Série {s.setIndex+1}</strong><span>{s.reps??'—'} répétitions</span>
          <small>{s.loadKg===undefined?'Charge non renseignée':`${s.loadKg} kg`}</small>
         </li>)}</ul>}
       <small>L'historique de progression complet reste disponible dans l'onglet Progression.</small>
     </section>}
     {detailTab==='conseils'&&<section className="pf-detail-content">
       <h2>Repères de la séance</h2>
       <p>{muscles}</p>
       <p>Respecte l'intensité, les répétitions et les repos indiqués par ton programme.</p>
       <p>{alternativesText(selected.alternatives??[])}</p>
       <small>Illustration indicative ; elle ne remplace pas une démonstration technique.</small>
     </section>}
   </main>;
 }
 return <main className="v3-workout v3-preview" data-live-preview="v3" data-sport="strength">
   <header className="v3-toolbar"><button onClick={onBack} aria-label="Retour">←</button><span/></header>
   <div className="v3-preview-title">
     <p className="v3-discipline"><SportIcon sport="strength" label={false}/> Musculation</p>
     <h1>{title}</h1>
     <p className="v3-session-meta">◴ {approxMinutes(v.estimatedDurationS??v.session.targetDurationS)}
       <span>•</span> ☷ {count} séries</p>
   </div>
   {context}
   <details className="v3-objective">
     <summary><span className="v3-target">◎</span><span><strong>Objectif séance</strong><small>{goalLabel}</small></span><span>›</span></summary>
     {preparation}<details className="v3-extra"><summary>Consignes, échauffement et retour au calme</summary>
       {v.session.blocks.map(block=><LightBlock key={block.id} block={block}/>)}
     </details>
   </details>
   <div className="v3-exercise-list">{items.map((item,i)=>{
     const sets=item.prescription.sets;
     const first=sets.find(s=>s.kind!=='rampup')??sets[0];
     const reps=first?.reps;
     const tile=<><b className="v3-index">{String(i+1).padStart(2,'0')}</b>
       <div><h2>{exerciseLabel(item.exerciseId)}</h2><p>{muscleText(item.exerciseId)}</p>
         <p>{sets.length} séries {reps!==undefined&&<> · {repText(reps)} reps</>}</p>
       </div><span className="v3-chevron" aria-hidden="true">›</span></>;
     return PLAYFIELD_V4
       ? <button type="button" className="v3-preview-exercise pf-preview-open" key={item.id}
           onClick={()=>{setSelectedId(item.id);setDetailTab('infos');try { window.scrollTo({top:0,behavior:'auto'}); } catch { /* non-browser test runtime */ }}}>
           <span className="v3-exercise-tile">{tile}</span>
         </button>
       : <details className="v3-preview-exercise" key={item.id}>
           <summary className="v3-exercise-tile">{tile}</summary>
           <div className="v3-prescription">{sets.map((s,n)=><p key={n}>Série {n+1} · {repText(s.reps)} reps · Repos {s.restAfterS} s · {intensityLabel(s)}</p>)}
             <p>{alternativesText(item.alternatives??[])}</p>
           </div>
         </details>;
   })}</div>
   <button className="v3-primary v3-start" aria-label="Commencer la séance" onClick={onStart}>▶ Démarrer la séance</button>
 </main>;
}
