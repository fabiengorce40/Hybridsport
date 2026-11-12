import { useState } from 'react';
import type { ReactNode } from 'react';
import { SportIcon } from '../design/SportIcon.js';
import { approxMinutes, exerciseLabel, intensityLabel } from '@hybridsport/app-core';
import type { ProgrammeSessionView, StrengthExerciseProgress } from '@hybridsport/app-core';
import { isSets, LightBlock, alternativesText } from '../workout/StrengthWorkout.js';
import { muscleText } from './Artwork.js';
import { PLAYFIELD_V4 } from '../playfield/flag.js';
import { ExerciseDetail } from '../playfield/ExerciseDetail.js';

const repText = (r: number | { min: number; max: number }) => typeof r === 'number' ? String(r) : `${r.min}–${r.max}`;

/** Preview remains the same real prescription. V4 adds a dedicated exercise-details view. */
export function StrengthPreview({v,title,onBack,onStart,preparation,context,goalLabel,exerciseHistory}:{
  v:ProgrammeSessionView;title:string;onBack:()=>void;onStart:()=>void;
  preparation:ReactNode;context:ReactNode;goalLabel:string;exerciseHistory?:(id:string)=>StrengthExerciseProgress|undefined;
}){
 const items=v.session.blocks.filter(b=>!['warmup','cooldown'].includes(b.kind))
   .flatMap(b=>b.items.filter(isSets));
 const count=items.reduce((n,i)=>n+i.prescription.sets.length,0);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const selected=items.find(i=>i.id===selectedId);
 if(PLAYFIELD_V4&&selected){
   return <ExerciseDetail key={selected.id} id={selected.exerciseId} onBack={()=>setSelectedId(null)}
     history={exerciseHistory?.(selected.exerciseId)} prescription={<>
       <h2>Prescription réelle</h2>
       <ul>{selected.prescription.sets.map((set,i)=><li key={i}>
         {set.kind==='rampup'?'Montée en charge':`Série ${i+1}`} · {repText(set.reps)} reps · Repos {set.restAfterS} s · {intensityLabel(set)}
         {set.kind==='rampup'&&' · hors volume et progression'}
       </li>)}</ul>
       <p>{alternativesText(selected.alternatives??[])}</p>
     </>}/>;
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
           onClick={()=>{setSelectedId(item.id);try { window.scrollTo({top:0,behavior:'auto'}); } catch { /* non-browser test runtime */ }}}>
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
