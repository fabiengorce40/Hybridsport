import { SportIcon } from '../design/SportIcon.js';
import { approxMinutes, exerciseLabel, intensityLabel } from '@hybridsport/app-core';
import type { ProgrammeSessionView } from '@hybridsport/app-core';
import { isSets, LightBlock, alternativesText } from '../workout/StrengthWorkout.js';
import { ExerciseSketch, Mountains, SoberLogo, muscleText } from './Artwork.js';
import type { ReactNode } from 'react';
export function StrengthPreview({v,title,onBack,onStart,preparation,context,goalLabel}:{v:ProgrammeSessionView;title:string;onBack:()=>void;onStart:()=>void;preparation:ReactNode;context:ReactNode;goalLabel:string}){
 const items=v.session.blocks.filter(b=>!['warmup','cooldown'].includes(b.kind)).flatMap(b=>b.items.filter(isSets));const count=items.reduce((n,i)=>n+i.prescription.sets.length,0);
 return <main className="v3-workout v3-preview" data-live-preview="v3" data-sport="strength">
 <header className="v3-toolbar"><button onClick={onBack} aria-label="Retour">←</button><SoberLogo/><span/></header>
 <div className="v3-preview-title"><Mountains/><p className="v3-discipline"><SportIcon sport="strength" label={false}/> Musculation</p><h1>{title}</h1><p className="v3-session-meta">◴ {approxMinutes(v.estimatedDurationS??v.session.targetDurationS)} <span>•</span> ☷ {count} séries</p></div>
 {context}<details className="v3-objective"><summary><span className="v3-target">◎</span><span><strong>Objectif séance</strong><small>{goalLabel}</small></span><span>›</span></summary>{preparation}<details className="v3-extra"><summary>Consignes, échauffement et retour au calme</summary>{v.session.blocks.map(block=><LightBlock key={block.id} block={block}/>)}</details></details>
 <div className="v3-exercise-list">{items.map((item,i)=>{const sets=item.prescription.sets;const first=sets.find(s=>s.kind!=='rampup')??sets[0];const reps=first?.reps;return <details className="v3-preview-exercise" key={item.id}><summary className="v3-exercise-tile"><ExerciseSketch exerciseId={item.exerciseId}/><b className="v3-index">{String(i+1).padStart(2,'0')}</b><div><h2>{exerciseLabel(item.exerciseId)}</h2><p>{muscleText(item.exerciseId)}</p><p>{sets.length} séries {reps!==undefined&&<> · {typeof reps==='number'?reps:`${reps.min}–${reps.max}`} reps</>}</p></div><span className="v3-chevron" aria-hidden="true">›</span></summary><div className="v3-prescription">{sets.map((s,n)=><p key={n}>Série {n+1} · {typeof s.reps==='number'?s.reps:`${s.reps.min}–${s.reps.max}`} reps · Repos {s.restAfterS} s · {intensityLabel(s)}</p>)}<p>{alternativesText(item.alternatives??[])}</p></div></details>;})}</div>
 <button className="v3-primary v3-start" aria-label="Commencer la séance" onClick={onStart}>▶ Démarrer la séance</button></main>;
}
