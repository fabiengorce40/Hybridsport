import { writeFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';
import { createBeta0Programme, emptyState, withStrengthPersonalization, defaultStrengthPersonalization, strengthWeekVolume, updateStrengthPersonalization, exportState, decodeState, CURRENT_SCHEMA_VERSION, EQUIPMENT_PRESETS, regenerateSession, UNKNOWN_CORE_STATE, beta0Environment, startProgrammeSession, zProfile } from '../src/index.js';
import type { StrengthPersonalization, StrengthOutcome, StrengthZone, AppState } from '../src/index.js';
import { profile,clock,MONDAY } from './fixtures.js';
import { plannedSession,workSetsDone } from './executions.js';
import { recordSessionExecution } from '../src/programme.js';

function athlete(outcome: StrengthOutcome, zones: StrengthZone[], extra: Partial<StrengthPersonalization> = {}, hybrid=false) {
  const base=profile({ priorities: hybrid ? ['running','hyrox','strength'] : ['strength'], availability: [90,90,90,90,90,90,90], strength: { enabled: true,goal:'hypertrophy',sessionsPerWeek:3 },
    hyrox: hybrid ? {enabled:true,sessionsPerWeek:1,focus:'balanced',goal:'GENERAL',returnState:'NONE'} : {enabled:false},
    running: { enabled: hybrid,population:'P_R2',goal:'GENERAL_RUNNING',wearable:false,sessionsPerWeek:2,returnState:'NONE' } });
  if (hybrid) { const preset = EQUIPMENT_PRESETS.find(x=>x.id==='preset.hybrid_race_gym'); if(preset) base.equipment={presetId:preset.id,items:[...preset.equipment]}; }
  const config: StrengthPersonalization={ ...defaultStrengthPersonalization(base),completed:true,outcome,priorities:zones.map(zone=>({zone,intention:'volume'})),experience:{months:24,regularSessions:3,technique:'confident'},sessionMinutes:90,...extra };
  const p=withStrengthPersonalization(base,config);
  return createBeta0Programme(emptyState(),p,clock(),hybrid ? {lastRun:{realizedDurationS:1800,distanceM:5000,difficulty:'AS_EXPECTED'}} : {});
}
const requests=(s:AppState)=>s.planner.weeks[MONDAY]!.requests.filter(r=>r.sport==='strength' && r.status==='planned');
const volume=(s:AppState,g:string)=>strengthWeekVolume(s,MONDAY)!.groups.find(x=>x.group===g)!.planned;
const exercises=(s:AppState)=>requests(s).flatMap(r=>plannedSession(s,r.requestId).blocks.flatMap(b=>b.items.map(i=>i.exerciseId)));
describe('V2.1 personnalisation réelle dans le moteur existant',()=>{
 it('rapport A–E : volumes E1 et exercices réellement prescrits',()=>{
  const cases=[['A · Fessiers',athlete('muscle',['glutes'])],['B · Silhouette bras/abdos',athlete('silhouette',['arms','abs'],{priorities:[{zone:'arms',intention:'appearance'},{zone:'abs',intention:'endurance_control'}]})],['C · Pectoraux/épaules',athlete('muscle',['chest','shoulders'])],['D · Débutant',athlete('fitness',[],{experience:{months:0,regularSessions:0,technique:'learning'}})],['E · Course + HYROX',athlete('performance',[],{},true)]] as const;
  const rows=cases.map(([name,s])=>({name,state:s,vol:strengthWeekVolume(s,MONDAY)}));
  for(const row of rows){expect(row.vol?.plannedSessions).toBeGreaterThan(0);expect(row.vol?.groups.every(g=>g.high===null||g.planned<=g.high)).toBe(true);}
  if(process.env.REKKA_WRITE_V21_REPORT){
   const lines=['# V2.1 — profils A–E : résultats de programmation','', 'Données fictives, même matériel complet et 3 demandes Musculation sauf contraintes de la semaine. Volumes = séries difficiles E1, contributions secondaires pondérées. Les cibles sont expérimentales.','', '| Profil | Séances placées | Fessiers | Pectoraux | Épaules | Bras | Tronc | Quadriceps |','|---|---:|---:|---:|---:|---:|---:|---:|',...rows.map(r=>`| ${r.name} | ${r.vol?.plannedSessions}/3 | ${['glutes','chest','shoulders','arms','core','quads'].map(g=>r.vol?.groups.find(x=>x.group===g)?.planned??0).join(' | ')} |`),''];
   for(const r of rows){lines.push(`## ${r.name}`,'');for(const req of requests(r.state)){const items=plannedSession(r.state,req.requestId).blocks.filter(b=>b.kind!=='warmup'&&b.kind!=='cooldown').flatMap(b=>b.items);lines.push(`- ${req.date} : ${items.map(i=>i.exerciseId+' '+(i.prescription.type==='sets'?i.prescription.sets.filter(s=>s.kind!=='rampup'&&!s.optional).map(s=>typeof s.reps==='number'?s.reps:`${s.reps.min}–${s.reps.max}`).join('/') : i.prescription.type)).join(' ; ')}`);}lines.push('');}
   writeFileSync('docs/kairo/v2-1/VALIDATION-PROFILS.md',lines.join('\n'));
  }
 });

 it('A et C : fessiers vs pectoraux, volume et exercices réellement différents',()=>{
  const a=athlete('muscle',['glutes']);const c=athlete('muscle',['chest']);
  expect(requests(a)).toHaveLength(3);expect(requests(c)).toHaveLength(3);
  expect(volume(a,'glutes')).toBeGreaterThan(volume(c,'glutes'));
  expect(volume(c,'chest')).toBeGreaterThan(volume(a,'chest'));
  expect(exercises(a)).not.toEqual(exercises(c));
  expect(volume(a,'chest')).toBeGreaterThan(0);expect(volume(c,'quads')).toBeGreaterThan(0);
 });
 it('B : bras et abdominaux, objectifs et intentions conservés et explicables',()=>{
  const s=athlete('silhouette',['arms','abs'],{priorities:[{zone:'arms',intention:'appearance'},{zone:'abs',intention:'endurance_control'}]});
  expect(requests(s).length).toBeGreaterThan(0);
  expect(requests(s).some(r=>r.reasons.some(x=>x.code==='PLAN.PERSONALIZATION'))).toBe(true);
  expect(exercises(s).some(x=>x.includes('curl')||x.includes('triceps'))).toBe(true);
 });
 it('D et E : débutant et hybride ne reçoivent pas une surcharge de volume',()=>{
  const normal=athlete('muscle',['glutes']);
  const novice=athlete('fitness',[],{experience:{months:0,regularSessions:0,technique:'learning'}});
  const hybrid=athlete('performance',[],{},true);
  expect(requests(novice).length).toBeGreaterThan(0);expect(requests(hybrid).length).toBeGreaterThan(0);
  const total=(s:AppState)=>strengthWeekVolume(s,MONDAY)!.groups.reduce((n,g)=>n+g.planned,0);
  expect(total(novice)).toBeLessThan(total(normal));expect(total(hybrid)).toBeLessThan(total(normal));
  expect(hybrid.planner.weeks[MONDAY]!.requests.filter(r=>r.sport==='running').some(r=>r.status==='planned')).toBe(true);
 });
 it('matériel, exclusions, douleur et durées sont des contraintes réelles',()=>{
  const avoided='ex.hip_thrust_machine';const s=athlete('muscle',['glutes'],{avoidExercises:[avoided],sessionMinutes:45});
  expect(exercises(s)).not.toContain(avoided);
  for(const r of requests(s)) expect(plannedSession(s,r.requestId).availableTimeS).toBeLessThanOrEqual(2700);
  expect(requests(athlete('muscle',['glutes'],{painNow:true}))).toHaveLength(0);
 });
 it('déterminisme, export/import et validation stricte des priorités',()=>{
  const a=athlete('muscle',['glutes']);expect(athlete('muscle',['glutes'])).toEqual(a);
  expect(decodeState(exportState(a))).toMatchObject({ok:true,state:a,from:CURRENT_SCHEMA_VERSION});
  expect(()=>zProfile.parse({...a.profile,strength:{...a.profile!.strength,personalization:{...a.profile!.strength.personalization,priorities:Array(4).fill({zone:'glutes',intention:'volume'})}}})).toThrow();
 });
 it('modification préserve semaines planifiées, historique, séries et progressions',()=>{
  let s=athlete('muscle',['glutes']);const id=requests(s)[0]!.requestId;
  s=recordSessionExecution(s,clock(MONDAY,'12:00:00'),{requestId:id,sport:'strength',completion:'completed_as_prescribed',sets:workSetsDone(s,id,{loadKg:40,rir:3})});
  const before=s; const p=withStrengthPersonalization(s.profile!,{...s.profile!.strength.personalization!,priorities:[{zone:'chest',intention:'volume'}]});
  const after=updateStrengthPersonalization(s,p,clock(MONDAY,'13:00:00'));
  expect(after.strength).toEqual(before.strength);expect(after.programmeLogs).toEqual(before.programmeLogs);
  expect(after.planner.weeks[MONDAY]!.requests).toEqual(before.planner.weeks[MONDAY]!.requests);
  expect(after.planner.weeks[MONDAY]!.strengthProfile).toEqual(before.profile);
  expect(after.programmeState!.results).toEqual(before.programmeState!.results);
  const pending=requests(s)[1]!.requestId;
  expect(regenerateSession(after,pending,UNKNOWN_CORE_STATE,beta0Environment())).toEqual(regenerateSession(before,pending,UNKNOWN_CORE_STATE,beta0Environment()));
  const painful=updateStrengthPersonalization(after,withStrengthPersonalization(after.profile!,{...after.profile!.strength.personalization!,painNow:true}),clock(MONDAY,'14:00:00'));
  expect(()=>startProgrammeSession(painful,clock(),pending)).toThrow('STRENGTH_PERSONALIZATION_PAIN');
 });
 it('jours réservés respectés, intentions différentes et trois zones admises',()=>{
  const a=athlete('muscle',['glutes'],{days:[1,3,5]});
  expect(requests(a).length).toBeGreaterThan(0);
  expect(requests(a).every(r=>['2026-10-06','2026-10-08','2026-10-10'].includes(r.date??''))).toBe(true);
  const vol=athlete('muscle',['glutes'],{priorities:[{zone:'glutes',intention:'volume'}]});
  const control=athlete('muscle',['glutes'],{priorities:[{zone:'glutes',intention:'endurance_control'}]});
  const rx=(s:AppState)=>requests(s).flatMap(r=>plannedSession(s,r.requestId).blocks.flatMap(b=>b.items)).filter(i=>i.refs?.slotId?.includes('.focus.glutes')).map(i=>i.prescription);
  expect(rx(vol).length).toBeGreaterThan(0);expect(rx(vol)).not.toEqual(rx(control));
  expect(requests(athlete('muscle',['chest','shoulders','glutes'])).length).toBeGreaterThan(0);
 });
 it('migration v2 → v3 sans modification des profils et programmes existants',()=>{
  const p=profile();const original=emptyState();const old={...original,schemaVersion:2,profile:zProfile.parse(p)};
  const r=decodeState(JSON.stringify(old));expect(r.ok).toBe(true);
  if(r.ok){expect(r.state.profile).toEqual(old.profile);expect(r.state.planner).toEqual(old.planner);expect(r.state.profile!.strength.personalization).toBeUndefined();}
 });
});
