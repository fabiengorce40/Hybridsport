import { strengthContent } from '@hybridsport/app-core';
import logo from '../rekka/assets/logo-brush.svg';
const LABELS:Record<string,string>={front_delts:'Épaules avant',side_delts:'Épaules latérales',rear_delts:'Épaules arrière',lower_back:'Lombaires',chest:'Pectoraux',lats:'Grand dorsal',upper_back_traps:'Haut du dos',biceps:'Biceps',triceps:'Triceps',deltoids_front:'Épaules',deltoids_side:'Épaules',deltoids_rear:'Épaules arrière',quadriceps:'Quadriceps',hamstrings:'Ischio-jambiers',glutes:'Fessiers',calves:'Mollets',abs_obliques:'Abdominaux'};
export function exerciseMuscles(id:string){return strengthContent().catalog.exercises().find(e=>e.id===id)?.muscles.primary??[];}
export function muscleText(id:string){const groups=[...new Set(exerciseMuscles(id).map(m=>LABELS[m]??m.replaceAll('_',' ')))];return groups.join(' · ')||'Muscles non renseignés';}
export function SoberLogo(){return <span className="v3-logo" role="img" aria-label="REKKA" style={{maskImage:`url(${logo})`,WebkitMaskImage:`url(${logo})`}}/>;}
/** Decorative native vector, independent from every prescription and training engine. */
export function Mountains(){return <svg className="v3-mountains" viewBox="0 0 600 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path fill="#172c35" d="M0 220V190Q80 151 120 168L218 84 239 101 309 31 333 62 355 54 430 122 460 93 600 177V220Z"/><path fill="#10232c" d="m50 220 190-120-20 39 88-105-29 83 53-55 15 43 43 14 70 65 24-27 116 63Z"/><path fill="#0b1c23" d="M0 220v-30l61-9 39 17 39-32 67 54 96-63 46 37 45-25 55 34 29-22 60 39Z"/><path d="m399 170 159-34-125 42 130-25-91 34" stroke="#dcff35" strokeWidth="3" opacity=".28" fill="none"/></svg>;}
/** Schematic catalogue highlight, not a biomechanical or technique prescription. */
export function Anatomy({exerciseId,small=false}:{exerciseId:string;small?:boolean}){
 const muscles=exerciseMuscles(exerciseId);const chest=muscles.includes('chest');const back=muscles.some(m=>m==='lats'||m==='upper_back_traps');const arms=muscles.some(m=>m==='biceps'||m==='triceps');const legs=muscles.some(m=>['quadriceps','hamstrings','glutes'].includes(m));const shoulders=muscles.some(m=>m.includes('delt'));
 return <svg className={`v3-anatomy ${small?'small':''}`} viewBox={small?"0 0 110 170":"0 0 110 105"} role="img" aria-label={`Illustration schématique : ${muscleText(exerciseId)}`}>
 <g fill="#0a161e" stroke="#a8b9c4" strokeWidth="1.3" strokeLinejoin="round"><path d="M44 24Q41 3 54 3T66 24L63 33 65 40 78 45Q88 48 90 65L96 99 104 125 98 131 87 107 78 77 76 101 72 119 74 167 60 167 55 126 49 167 35 167 38 120 34 99 32 76 24 105 13 132 7 126 15 100 20 66Q22 49 31 46L45 40 46 33Z"/><path d="m43 48 12 7 12-7M55 55v62m-17-19 17 5 18-5m-31-27 13 4 15-4m-31 15 16 4 16-4m-17 30-15 7m15-7 17 7" fill="none" opacity=".4"/></g>
 <g fill="#DCFF35" opacity=".9">{chest&&<path d="M34 48q11-3 19 8v15q-17 2-22-10Zm42 0q-11-3-19 8v15q17 2 22-10Z"/>}{back&&<path d="m33 53 19 7v35L40 86Zm44 0-19 7v35l12-9Z"/>}{shoulders&&<path d="M31 46q-12 4-11 21l12-4 9-15Zm48 0q12 4 11 21l-12-4-9-15Z"/>}{arms&&<path d="m23 68 9 2-7 31-9 6Zm64 0-9 2 7 31 9 6Z"/>}{legs&&<path d="m39 112 13 5-5 37-10 2Zm32 0-13 5 5 37 10 2Z"/>}</g></svg>;
}

/** Decorative movement sketch. Exact source illustrations are not available; no technique instruction is inferred. */
export function ExerciseSketch({exerciseId}:{exerciseId:string}) {
 const bench=exerciseId.includes('bench');const row=exerciseId.includes('row');const fly=exerciseId.includes('fly')||exerciseId.includes('lateral');const curl=exerciseId.includes('curl');const triceps=exerciseId.includes('triceps');
 if(!bench&&!row&&!fly&&!curl&&!triceps)return <Anatomy exerciseId={exerciseId} small/>;
 return <svg className="v3-exercise-sketch" viewBox="0 0 120 100" role="img" aria-label={`Schéma décoratif : ${muscleText(exerciseId)}`}>
 <g stroke="#7e929f" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
 {bench&&<><path d="m12 70 65-14m-55 12-4 22m48-31 8 28" strokeWidth="5"/><path d="m34 56 23-9 20 5 10 23 17 4M47 51 36 38 44 23m12 28 12-17-1-17" stroke="#d0dbe2" strokeWidth="7"/><circle cx="24" cy="58" r="8" fill="#c7d2d9"/><path d="m39 18 10 7m13-12 11 4" stroke="#d9e2e7" strokeWidth="8"/><path d="m34 53 13-5" stroke="#DCFF35" strokeWidth="8"/></>}
 {row&&<><path d="M17 68h77M28 68 22 91m59-23 7 23m7-72v51m-7-48h17"/><circle cx="49" cy="24" r="8" fill="#c7d2d9"/><path d="m44 36-13 25 16 5 17 22m-15-50 17 12 22-14m-44 8 20 14 23-13" stroke="#c7d2d9" strokeWidth="6"/><path d="m44 36-8 15" stroke="#DCFF35" strokeWidth="7"/></>}
 {fly&&<><path d="M14 9v81m92-81v81M14 17l31 26m61-26L75 43" strokeWidth="1.5"/><circle cx="60" cy="18" r="8" fill="#c7d2d9"/><path d="M60 31v31m0-24-21 7-16-5m37-2 21 7 16-5M60 62 47 90m13-28 14 28" stroke="#c7d2d9" strokeWidth="6"/><path d="m49 34 11 4 12-4" stroke="#DCFF35" strokeWidth="7"/></>}
 {curl&&<><path d="m38 67 37-10m-30 8-2 25m24-31 8 30" strokeWidth="5"/><circle cx="54" cy="16" r="8" fill="#c7d2d9"/><path d="m53 29 2 32-15 9-3 21m20-30 17 8 11 20m-33-54-9 17-8-12m25-7 10 19 9-16" stroke="#c7d2d9" strokeWidth="6"/><path d="m48 39-4 11m20-12 5 12" stroke="#DCFF35" strokeWidth="5"/><path d="m29 35 11 6m35-10 11 4" stroke="#c7d2d9" strokeWidth="7"/></>}
 {triceps&&<><path d="M20 89V8h75m-2 0L68 63" strokeWidth="1.5"/><circle cx="54" cy="18" r="8" fill="#c7d2d9"/><path d="m53 31 2 32-10 28m10-28 13 28m-16-55-6 16 19 12m-7-27 10 15-1 14" stroke="#c7d2d9" strokeWidth="6"/><path d="m48 36-3 12m17-12 5 13" stroke="#DCFF35" strokeWidth="5"/></>}
 </g></svg>;
}

/** Intentionally drawn brush contours; decorative, no temporal state. */
export function RecoveryBrush(){return <svg className="p242-energy-ring v3-brush-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
 <g className="p242-orbit-halo"><path d="M10 59C0 33 22 7 47 7S94 28 93 53 73 95 49 94 9 80 8 53"/></g>
 <g className="p242-orbit-ink">
 <path d="M9 45C10 18 33 3 55 6 77 7 94 24 95 46 90 24 72 13 53 13 32 11 17 23 9 45Z"/>
 <path d="M92 36C105 61 83 92 59 96 37 100 15 87 9 66 19 85 40 94 58 89 79 85 92 66 92 36Z"/>
 <path d="M13 30C2 58 16 85 37 92 11 87 1 60 8 40 11 31 16 24 20 21 16 25 15 27 13 30Z"/>
 <path d="M23 17C42 1 69 5 83 20 65 9 46 7 23 17ZM88 66C83 83 65 94 45 94 67 92 78 82 88 66Z"/>
 </g>
 <g className="p242-orbit-hairline"><path d="M6 49C3 27 20 11 33 8M16 25C34 7 59 8 77 21M23 13C42 1 59 2 72 8M96 43C100 64 87 85 69 92M7 65C13 86 32 98 51 97M21 87C37 96 59 96 76 85M14 67C7 47 16 26 33 18M50 88C68 90 83 75 87 63"/><path d="M8 28q2-5 5-7M37 4l5-1M81 12q5 2 7 5M97 66l-2 5M81 90l-5 3M14 86l-3-4M4 57l-1-5"/></g>
 <g fill="none" stroke="#0b1a21" strokeWidth=".45" opacity=".8"><path d="M18 26Q31 8 52 9M26 16Q46 7 64 12M70 14Q87 25 91 42M88 62Q80 86 59 92M72 89Q53 99 31 88M11 51Q9 68 23 82M15 73Q27 89 46 92"/></g>
 <g className="p242-orbit-hairline" strokeWidth=".3"><path d="M11 39C14 23 25 12 38 8M20 20C36 6 62 6 77 17M24 14C40 4 62 5 74 12M95 42C99 62 85 86 71 91M92 65Q83 87 62 94M7 53Q6 75 26 88M13 76Q29 96 50 95M26 92Q46 101 68 93"/></g>
 </svg>;}
