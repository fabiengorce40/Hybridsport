import { Fragment, useEffect, useRef, useState } from 'react';
import { exerciseLabel, intensityLabel } from '@hybridsport/app-core';
import type { ReactNode } from 'react';
import type { StrengthWorkoutProps, SetsItem } from '../workout/StrengthWorkout.js';
import { SetLine, EffortRow, LightBlock, alternativesText, isSets, targetRirOf, phaseOf, PHASE_TITLES } from '../workout/StrengthWorkout.js';
import { Anatomy, SoberLogo, muscleText } from './Artwork.js';
interface Props extends StrengthWorkoutProps {onBack:()=>void;onFinish:()=>void;restTimer:ReactNode;trainingLabel:string;elapsedSeconds:number|null}
export function LiveWorkout({v,title,editable,onRecord,onTogglePain,onEffort,onUnavailable,onBack,onFinish,restTimer,trainingLabel,elapsedSeconds,context,preparation,sessionClock,eyebrow}:Props){
 const main=v.session.blocks.filter(b=>!['warmup','cooldown'].includes(b.kind)).flatMap(block=>block.items.filter(isSets).map(item=>({block,item})));
 const saved=(id:string,i:number)=>v.log?.sets.find(s=>s.itemId===id&&s.setIndex===i);
 const complete=(item:SetsItem)=>item.prescription.sets.every((_,i)=>saved(item.id,i)?.done);
 const [selected,setSelected]=useState(Math.max(0,main.findIndex(({item})=>!complete(item))));const [setSelection,setSetSelection]=useState<Record<string,number>>({});const [menu,setMenu]=useState(false);
 const commands=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!menu)return;const previous=document.activeElement as HTMLElement|null;commands.current?.querySelector<HTMLElement>('button')?.focus();return()=>previous?.focus({preventScroll:true});},[menu]);
 const selectedEntry=main[selected];
 const total=main.reduce((n,{item})=>n+item.prescription.sets.length,0);const done=main.reduce((n,{item})=>n+item.prescription.sets.filter((_,i)=>saved(item.id,i)?.done).length,0);
 return <main className="v3-workout v3-active" data-live-workout="v3" data-sport="strength" aria-label="Séance en cours">
 <header className="v3-toolbar"><button onClick={onBack} aria-label="Retour">←</button><SoberLogo/><button aria-label="Commandes de séance" aria-expanded={menu} onClick={()=>setMenu(!menu)}>⋮</button></header>
 <nav className="v3-exercise-nav" aria-label="Exercices"><p>Exercice {main.length?selected+1:0} / {main.length}<span>{done}/{total} séries</span></p><div>{main.map(({item},i)=><button key={item.id} aria-label={`Aller à l’exercice ${i+1} : ${exerciseLabel(item.exerciseId)}`} aria-current={selected===i?'step':undefined} data-complete={complete(item)} onClick={()=>setSelected(i)}><span className="sr-only">{i+1}</span></button>)}</div></nav>
 <div className="sr-only" role="progressbar" aria-label="Séries validées" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}/>{context}
 {main.map(({item},cardIndex)=>{
 const sets=item.prescription.sets;const current=sets.findIndex((_,i)=>!saved(item.id,i)?.done);const active=setSelection[item.id]??Math.max(0,current);const name=exerciseLabel(item.exerciseId);let number=0,warm=0;
 return <section className="v3-exercise" key={item.id} hidden={selected!==cardIndex} aria-label={`Exercice ${cardIndex+1} : ${name}`}>
 <div className="v3-exercise-heading"><div><h1>{name}</h1><p>{muscleText(item.exerciseId)}</p></div><Anatomy exerciseId={item.exerciseId}/></div>
 <div className="v3-sets">{sets.map((set,i)=><Fragment key={`${item.id}.${i}`}>{(i===0||phaseOf(sets[i-1]??set)!==phaseOf(set))&&<div className="v3-phase" data-set-phase={phaseOf(set)}>{PHASE_TITLES[phaseOf(set)]}{phaseOf(set)==='warmup'&&<small> · hors volume et progression</small>}</div>}<SetLine key={`${item.id}.${i}`} phaseShown appearance="v3" current={i===current} selected={i===active} position={i+1} total={sets.length} onSelect={()=>setSetSelection(s=>({...s,[item.id]:i}))} onPrevious={i?()=>setSetSelection(s=>({...s,[item.id]:i-1})):undefined} onNext={i<sets.length-1?()=>setSetSelection(s=>({...s,[item.id]:i+1})):undefined} set={set} label={set.kind==='rampup'?`Montée ${++warm}`:`Série ${++number}`} saved={saved(item.id,i)} editable={editable} onRecord={x=>{
 onRecord(item,i,x);if(x.done){const next=sets.findIndex((_,n)=>n!==i&&!saved(item.id,n)?.done);if(next>=0)setSetSelection(s=>({...s,[item.id]:next}));else{const nextExercise=main.findIndex(({item:it},n)=>n!==cardIndex&&!complete(it));if(nextExercise>=0)setSelected(nextExercise);}}else setSetSelection(s=>({...s,[item.id]:i}));
 requestAnimationFrame(()=>document.querySelector<HTMLElement>('.v3-exercise:not([hidden]) .v3-series-row[data-current="true"] .v3-series-select')?.focus({preventScroll:true}));
 }}/></Fragment>)}</div>

 </section>;
 })}
 <div className="v3-rest-host">{restTimer}</div>
 {menu&&<div ref={commands} className="v3-commands" role="dialog" aria-modal="true" aria-label="Commandes de séance" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setMenu(false);}if(e.key==='Tab'){const controls=[...(commands.current?.querySelectorAll<HTMLElement>('button:not(:disabled),summary,input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')??[])].filter(el=>el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}><header><strong>{title}</strong><button aria-label="Fermer le message" onClick={()=>setMenu(false)}>×</button></header><p>{eyebrow} · {trainingLabel} · {done}/{total} séries{elapsedSeconds!==null?` · ${Math.floor(elapsedSeconds/60)} min`:''}</p>{sessionClock}{selectedEntry&&<ExerciseOptions v={v} item={selectedEntry.item} block={selectedEntry.block} editable={editable} onEffort={onEffort} onUnavailable={onUnavailable} onTogglePain={onTogglePain}/>}<details data-preparation><summary>Objectifs & échauffement</summary>{preparation}{v.session.blocks.map(b=><LightBlock key={b.id} block={{...b,items:['warmup','cooldown'].includes(b.kind)?b.items:b.items.filter(it=>!isSets(it))}}/>)}</details><button onClick={()=>{setMenu(false);onFinish();}}>Terminer la séance</button></div>}
 </main>;
}

function ExerciseOptions({v,item,block,editable,onEffort,onUnavailable,onTogglePain}:Pick<Props,'v'|'editable'|'onEffort'|'onUnavailable'|'onTogglePain'>&{item:SetsItem;block:Props['v']['session']['blocks'][number]}) {
 const sets=item.prescription.sets;const saved=(id:string,i:number)=>v.log?.sets.find(s=>s.itemId===id&&s.setIndex===i);
 const last=sets.map((set,i)=>({set,i})).filter(({set,i})=>set.kind!=='rampup'&&!set.optional&&saved(item.id,i)?.done).at(-1);
 const first=sets.find(s=>s.kind!=='rampup')??sets[0];const name=exerciseLabel(item.exerciseId);const swap=v.log?.swaps?.filter(s=>s.itemId===item.id).at(-1);
 return <details className="v3-extra"><summary>Consignes, effort et options</summary><p>{first?intensityLabel(first):''}</p><p>{alternativesText(item.alternatives??[])}</p>{block.format==='sets'&&block.grouping!=='straight'&&<p>Organisation : {block.grouping==='superset'?'superset':'circuit'}.</p>}{sets.some(s=>s.kind==='rampup')&&<p>Séries de montée avant le travail.</p>}{item.refs?.prescriptionSource==='calibration'&&<p>Choisissez une charge qui respecte l’intensité indiquée.</p>}
 {last&&onEffort&&<EffortRow name={name} setLabel={`Série ${last.i+1}`} setIndex={last.i} itemId={item.id} target={targetRirOf(last.set)} value={saved(item.id,last.i)?.rir} editable={editable} onEffort={onEffort}/>}
 {swap&&<p role="status" data-swap={swap.substituteId?'substituted':'refused'}>{swap.substituteId?`Remplace ${exerciseLabel(swap.fromExerciseId)} : matériel indisponible, mêmes séries et répétitions, charge selon l’effort.`:'Aucun exercice de remplacement validé. Passez cet exercice ; la séance sera enregistrée comme adaptée.'}</p>}
 {editable&&onUnavailable&&!sets.some((_,i)=>saved(item.id,i)?.done)&&!(swap&&!swap.substituteId)&&<button onClick={()=>onUnavailable(item.id)} aria-label={`Matériel indisponible pour ${name}`}>Matériel indisponible</button>}
 {editable&&<button aria-label={`Douleur sur ${name}`} aria-pressed={v.log?.painItems.includes(item.id)===true} onClick={()=>onTogglePain(item.id)}>Signaler une douleur</button>}</details>;
}
