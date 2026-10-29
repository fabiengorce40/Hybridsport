import { describe,it,expect } from 'vitest';
import { createBeta0Programme,emptyState,defaultStrengthPersonalization,withStrengthPersonalization,updateStrengthPersonalization,previewStrengthWeekReplan,confirmStrengthWeekReplan,weekPlacementExplanation,requestProfileOrigin,strengthWeekVolume,beta0Environment,decodeState,exportState,recordSessionExecution,startProgrammeSession,recordProgrammeSet,writeReplannedWeek } from '../src/index.js';
import type { AppState,StrengthZone,ProfileInput } from '../src/index.js';
import { profile,clock,MONDAY } from './fixtures.js';
import { plannedSession,workSetsDone } from './executions.js';
function setup(days=[60,60,60,60,60,60,60],zones:StrengthZone[]=['chest','shoulders'],frequency=2) {
 const p=profile({priorities:['strength','hyrox'],availability:days,strength:{enabled:true,goal:'hypertrophy',sessionsPerWeek:frequency},hyrox:{enabled:true,sessionsPerWeek:2,focus:'balanced',goal:'GENERAL',returnState:'NONE'}});
 const personalized=withStrengthPersonalization(p,{...defaultStrengthPersonalization(p),completed:true,outcome:'muscle',priorities:zones.map(zone=>({zone,intention:'volume'})),sessionMinutes:60,days:days.flatMap((m,i)=>m?[i]:[]),experience:{months:24,regularSessions:3,technique:'confident'}});
 return createBeta0Programme(emptyState(),personalized,clock(),{});
}
const changed=(s:AppState,zones:StrengthZone[]=['glutes','thighs','abs']):ProfileInput=>({...s.profile!,strength:{...s.profile!.strength,sessionsPerWeek:4,personalization:{...s.profile!.strength.personalization!,priorities:zones.map(zone=>({zone,intention:'volume'}))}}});
const placed=(s:AppState)=>s.planner.weeks[MONDAY]!.requests.filter(r=>r.status==='planned');
const preview=(s:AppState,p=changed(s))=>previewStrengthWeekReplan(s,p,clock(),beta0Environment());
const rx=(s:AppState)=>placed(s).filter(r=>r.sport==='strength').flatMap(r=>plannedSession(s,r.requestId).blocks.flatMap(b=>b.items)).map(i=>[i.exerciseId,i.prescription]);
describe('V2.2 transaction de replanification',()=>{
 it('prévisualisation et annulation pures ; confirmation explicite ; nouvelles demandes comptées',()=>{
  const s=setup([60,60,60,60,0,0,0]);const original=exportState(s);const p=preview(s);
  expect(exportState(s)).toBe(original);expect(p.after.requests.filter(r=>r.sport==='strength')).toHaveLength(4);
  expect(()=>confirmStrengthWeekReplan(s,p,clock(),false,beta0Environment())).toThrow('REPLAN_CONFIRMATION_REQUIRED');
  const next=confirmStrengthWeekReplan(s,p,clock(),true,beta0Environment());expect(next.profile!.strength.sessionsPerWeek).toBe(4);
  expect(placed(next).length).toBeLessThanOrEqual(4);expect(new Set(placed(next).map(r=>r.date)).size).toBe(placed(next).length);
  expect(next.strength).toEqual(s.strength);expect(next.programmeLogs).toEqual(s.programmeLogs);expect(next.programmeState!.results).toEqual(s.programmeState!.results);
  expect(weekPlacementExplanation(next,MONDAY)!.find(x=>x.sport==='strength')!.requested).toBe(4);
  console.log('V22 FOUR DAYS',JSON.stringify({before:placed(s).map(r=>[r.date,r.sport]),after:placed(next).map(r=>[r.date,r.sport]),explanation:weekPlacementExplanation(next,MONDAY)}));
 },30000);
 it('cas observé 4 Musculation + 2 HYROX : ancien profil identifié, capacité de quatre jours expliquée',()=>{
  const state=setup([60,60,60,60,0,0,0],['chest','shoulders'],4);
  const next=preview(state).next;const old=weekPlacementExplanation(updateStrengthPersonalization(state,changed(state),clock()),MONDAY)!;
  expect(old.find(x=>x.sport==='strength')!.previous).toBe(2);
  expect(placed(next).filter(r=>r.sport==='strength')).toHaveLength(2);expect(placed(next).filter(r=>r.sport==='hyrox')).toHaveLength(2);
  expect(weekPlacementExplanation(next,MONDAY)!.find(x=>x.sport==='strength')!.missing.every(x=>x.text.includes('jours compatibles'))).toBe(true);
  expect(rx(next)).not.toEqual(rx(state));
  console.log('V22 OBSERVED',JSON.stringify({before:placed(state).map(r=>[r.date,r.sport]),after:placed(next).map(r=>[r.date,r.sport]),volumesBefore:strengthWeekVolume(state,MONDAY),volumesAfter:strengthWeekVolume(next,MONDAY)}));
 },30000);
 it('séance réalisée : identité, record, performances et progression conservés exactement',()=>{
  let s=setup();const r=placed(s).find(r=>r.sport==='strength')!;
  s=recordSessionExecution(s,clock(MONDAY,'12:00:00'),{requestId:r.requestId,sport:'strength',completion:'completed_as_prescribed',sets:workSetsDone(s,r.requestId,{loadKg:40,rir:3})});
  const c=clock(MONDAY,'13:00:00');const p=previewStrengthWeekReplan(s,changed(s),c,beta0Environment());const next=confirmStrengthWeekReplan(s,p,c,true,beta0Environment());
  expect(p.protectedIds).toContain(r.requestId);expect(next.planner.weeks[MONDAY]!.requests.find(x=>x.requestId===r.requestId)).toEqual(r);
  expect(next.strength).toEqual(s.strength);expect(next.programmeLogs).toEqual(s.programmeLogs);expect(next.programmeState!.results).toEqual(s.programmeState!.results);
  expect(requestProfileOrigin(next,MONDAY,r.requestId)).toBe('previous');expect(decodeState(exportState(next))).toMatchObject({ok:true,state:next});
  expect(()=>writeReplannedWeek(s,{...p.after,requests:p.after.requests.filter(x=>x.requestId!==r.requestId)},MONDAY,true)).toThrow('REPLAN_PROTECTED_SESSION');
 },30000);
 it('séance commencée et aperçu périmé ne peuvent être remplacés',()=>{
  const s=setup();const r=placed(s).find(r=>r.sport==='strength')!;const p=preview(s);
  const begun=startProgrammeSession(s,clock(),r.requestId);const set=workSetsDone(begun,r.requestId,{loadKg:30})[0]!;
  const started=recordProgrammeSet(begun,clock(),r.requestId,set);
  expect(()=>confirmStrengthWeekReplan(started,p,clock(),true,beta0Environment())).toThrow('REPLAN_STALE');
  const next=preview(started);expect(next.next.programmeLogs).toEqual(started.programmeLogs);expect(next.protectedIds).toContain(r.requestId);expect(next.after.requests.find(x=>x.requestId===r.requestId)).toEqual(r);
 },30000);
 it('priorités différentes : exercices, doses et volumes réels après recalcul ; durée respectée',()=>{
  const s=setup();const a=preview(s,changed(s,['glutes','thighs','abs'])).next;const b=preview(s,changed(s,['chest','shoulders'])).next;
  expect(rx(a)).not.toEqual(rx(b));const av=strengthWeekVolume(a,MONDAY)!;const bv=strengthWeekVolume(b,MONDAY)!;
  expect(av.groups.map(g=>[g.group,g.planned])).not.toEqual(bv.groups.map(g=>[g.group,g.planned]));
  expect(av.groups.every(g=>!g.aboveHigh)).toBe(true);expect(bv.groups.every(g=>!g.aboveHigh)).toBe(true);
  for(const state of [a,b])for(const r of placed(state).filter(r=>r.sport==='strength'))expect(plannedSession(state,r.requestId).availableTimeS).toBeLessThanOrEqual(3600);
  console.log('V22 PRIORITIES',JSON.stringify({a:placed(a).map(r=>[r.date,r.sport]),b:placed(b).map(r=>[r.date,r.sport]),volumeA:av,volumeB:bv}));
 },60000);
 it('application future conserve les demandes anciennes et explique le décalage',()=>{
  const s=setup();const next=updateStrengthPersonalization(s,changed(s),clock());expect(next.planner.weeks[MONDAY]!.requests).toEqual(s.planner.weeks[MONDAY]!.requests);
  const row=weekPlacementExplanation(next,MONDAY)!.find(x=>x.sport==='strength')!;expect(row.requested).toBe(4);expect(row.deferred).toBe(2);expect(row.previous).toBeGreaterThan(0);
 });
 it('migration v3 → v4 sans changement et jours passés verrouillés',()=>{
  const s=setup();expect(decodeState(JSON.stringify({...s,schemaVersion:3}))).toMatchObject({ok:true,state:s});
  const p=previewStrengthWeekReplan(s,changed(s),clock('2026-10-08'),beta0Environment());
  for(const r of s.planner.weeks[MONDAY]!.requests.filter(r=>r.date&&r.date<'2026-10-08'))expect(p.after.requests.find(x=>x.requestId===r.requestId)).toEqual(r);
 },30000);
});
