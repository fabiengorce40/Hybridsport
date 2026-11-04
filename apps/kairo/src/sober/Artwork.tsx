import { strengthContent } from '@hybridsport/app-core';
import logo from './assets/rekka-a1.webp';
const LABELS:Record<string,string>={front_delts:'Épaules avant',side_delts:'Épaules latérales',rear_delts:'Épaules arrière',lower_back:'Lombaires',chest:'Pectoraux',lats:'Grand dorsal',upper_back_traps:'Haut du dos',biceps:'Biceps',triceps:'Triceps',deltoids_front:'Épaules',deltoids_side:'Épaules',deltoids_rear:'Épaules arrière',quadriceps:'Quadriceps',hamstrings:'Ischio-jambiers',glutes:'Fessiers',calves:'Mollets',abs_obliques:'Abdominaux'};
export function exerciseMuscles(id:string){return strengthContent().catalog.exercises().find(e=>e.id===id)?.muscles.primary??[];}
export function muscleText(id:string){const groups=[...new Set(exerciseMuscles(id).map(m=>LABELS[m]??m.replaceAll('_',' ')))];return groups.join(' · ')||'Muscles non renseignés';}
export function SoberLogo(){return <img className="v3-logo" src={logo} alt="REKKA"/>;}

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
 <g fill="none" stroke="#0b0f10" strokeWidth=".45" opacity=".8"><path d="M18 26Q31 8 52 9M26 16Q46 7 64 12M70 14Q87 25 91 42M88 62Q80 86 59 92M72 89Q53 99 31 88M11 51Q9 68 23 82M15 73Q27 89 46 92"/></g>
 <g className="p242-orbit-hairline" strokeWidth=".3"><path d="M11 39C14 23 25 12 38 8M20 20C36 6 62 6 77 17M24 14C40 4 62 5 74 12M95 42C99 62 85 86 71 91M92 65Q83 87 62 94M7 53Q6 75 26 88M13 76Q29 96 50 95M26 92Q46 101 68 93"/></g>
 </svg>;}
