/** V2.2 — transaction pure de replanification. Les moteurs restent seuls auteurs des séances. */
import { migrateToCurrent } from '@hybridsport/engine';
import type { SessionDraft, SessionRecord } from '@hybridsport/domain';
import { sessionPlannedHardSets } from '@hybridsport/strength';
import { strengthContent } from './provisional-content.js';
import { planMultisportWeek } from '@hybridsport/planner';
import type { SportPorts, SportIntent, WeekSession } from '@hybridsport/planner';
import { zProgrammeState } from '@hybridsport/programme';
import type { AppState, PersistedWeek, ProfileInput, Sport } from './model.js';
import type { Clock } from './app.js';
import { AppError } from './errors.js';
import { addDays, normalizeInstant, weekStartOf } from './dates.js';
import { assertEnvironment, buildPorts, clockOf, persistWeek, recentOf } from './planning.js';
import { portInputs, strengthWeekVolume } from './programme.js';
import type { ProgrammeEnvironment } from './programme.js';
import { updateStrengthPersonalization, strengthParametersFor } from './strength-personalization.js';
import { assertPlanningAllowed, plannedWeekStatus, protectedWeekRequests, writeReplannedWeek } from './weeks.js';
import { weekLoadWarnings } from './week-load.js';

type Request = PersistedWeek['requests'][number];
const snapshot = (s: AppState, w: PersistedWeek, r: Request) => r.strengthProfile ?? w.strengthProfile ?? s.profile;
const signature = (p: AppState['profile']) => JSON.stringify(p?.strength);
export function requestProfileOrigin(state: AppState, weekStart: string, requestId: string): 'previous'|'current' {
  const w=state.planner.weeks[weekStart];const r=w?.requests.find(x=>x.requestId===requestId);
  return w&&r&&r.sport==='strength'&&signature(snapshot(state,w,r))!==signature(state.profile)?'previous':'current';
}
const sportName:Record<Sport,string>={strength:'Musculation',hyrox:'HYROX',running:'Course',crosstraining:'Cross-training'};
const structures:Record<string,string>={knee:'genoux/cuisses',hip:'hanches/fessiers',shoulder:'épaules',trunk:'tronc',spine:'dos'};
/** Explications des faits persistés ; aucune promesse de créneau ou de dose alternative. */
export function weekPlacementExplanation(state: AppState, weekStart: string) {
  const w=state.planner.weeks[weekStart];if(!w)return null;
  return (['strength','hyrox','running','crosstraining'] as const).filter(sp=>w.requests.some(r=>r.sport===sp)).map(sp=>{
    const reqs=w.requests.filter(r=>r.sport===sp);
    const requested=state.profile?.[sp].enabled?state.profile[sp].sessionsPerWeek??reqs.length:reqs.length;
    const placed=reqs.filter(r=>r.status==='planned').length;
    return {sport:sp,name:sportName[sp],requested,placed,deferred:Math.max(0,requested-reqs.length),previous:reqs.filter(r=>r.status==='planned'&&requestProfileOrigin(state,weekStart,r.requestId)==='previous').length,
      missing:reqs.filter(r=>r.status!=='planned').map(r=>{
        const reasons=[...r.reasons,...w.conflicts.filter(c=>c.params.sport===sp)];
        const timeLimit=snapshot(state,w,r)?.strength.personalization?.sessionMinutes;
        const budget=reasons.some(c=>c.params.cause==='personalization_volume_budget');
        const recovery=reasons.some(c=>c.params.cause==='strength_recovery_window');
        const conflicts=reasons.filter(c=>c.code.includes('INTERFERENCE_CONFLICT'));
        const dates=[...new Set(conflicts.map(c=>String(c.params.date??'')).filter(Boolean))];
        const shared=[...new Set(conflicts.map(c=>structures[String(c.params.structure)]??String(c.params.structure??'')).filter(Boolean))];
        const text=recovery?'La fenêtre de récupération Musculation n’est pas respectée sur les créneaux essayés.':budget&&r.status==='refused'&&r.category!=='slot_unavailable'?'Le volume hebdomadaire restant ne permet pas cette prescription supplémentaire.':r.category==='slot_unavailable'?(r.status==='unplaced'?'Les jours compatibles sont déjà occupés : une seule séance est planifiée par jour.':`Le moteur ne peut pas composer cette séance dans la durée disponible${sp==='strength'&&timeLimit?' (limite Musculation : '+String(timeLimit)+' min)':''}.`):r.category==='interference_conflict'?`Aucun créneau compatible avec les autres sports${shared.length?' : '+shared.join(', '):''}${dates.length?' ; jours en conflit : '+dates.join(', '):''}.`:r.category==='safety_blocked'?'Une contrainte de sécurité du moteur empêche cette séance.':r.category==='governance_blocked'?'Une règle nécessaire à cette combinaison sportive n’est pas disponible ou validée.':r.category==='engine_unavailable'?'Le moteur de ce sport n’est pas disponible.':'Le moteur n’a pas trouvé de prescription compatible avec les contraintes déclarées.';
        return {requestId:r.requestId,origin:requestProfileOrigin(state,weekStart,r.requestId),category:r.category,text,composed:!!r.composedFor,alternatives:r.category==='safety_blocked'?['Réexaminer la contrainte de sécurité ; aucun contournement automatique.']:['Libérer un autre jour dans les disponibilités.','Prévisualiser une autre durée ; une séance plus courte n’est pas garantie.','Réduire la fréquence ou revoir l’ordre de priorité des sports.','Décaler ou ajuster une autre activité puis recalculer.']};
      })};
  });
}
export interface WeekReplanPreview {
 readonly source:string;readonly clock:Clock;readonly profile:ProfileInput;readonly weekStart:string;
 readonly before:PersistedWeek;readonly after:PersistedWeek;readonly protectedIds:readonly string[];
 readonly next:AppState;readonly alternativesTried:number;
}
function sessionOf(r:Request):SessionDraft {
 const decoded=r.record?migrateToCurrent<SessionRecord>(r.record):undefined;
 if(!decoded?.ok)throw new AppError('REPLAN_RECORD_UNREADABLE');return decoded.value.session;
}
/** Résumé des prescriptions réellement proposées, sans calcul de dose dans l'interface. */
export function replanSessionDetails(request:Request) {
 if(!request.record)return null;
 const session=sessionOf(request);
 // technical-constant: secondes par minute (affichage uniquement)
 return {minutes:session.availableTimeS/60,items:session.blocks.filter(b=>b.kind!=='warmup'&&b.kind!=='cooldown').flatMap(b=>b.items).map(i=>({exerciseId:i.exerciseId,sets:i.prescription.type==='sets'?i.prescription.sets.filter(s=>s.kind!=='rampup'&&!s.optional).length:null}))};
}
/** Preview is disposable and never written. Cancel simply discards it. */
export function previewStrengthWeekReplan(state:AppState,input:ProfileInput,clock:Clock,env:ProgrammeEnvironment):WeekReplanPreview {
 assertPlanningAllowed(state);assertEnvironment(env);const weekStart=weekStartOf(clock.today);const before=state.planner.weeks[weekStart];
 if(!before||before.owner!=='programme'||plannedWeekStatus(state,weekStart)==='closed'||!state.programmeState)throw new AppError('REPLAN_NOT_ALLOWED');
 for(const request of before.requests)if(request.record)sessionOf(request);
 const updated=updateStrengthPersonalization(state,input,clock);const p=updated.profile;const ps=updated.programmeState;if(!p||!ps)throw new AppError('PROFILE_MISSING');
 const oldWeek=ps.weeks.find(w=>w.plannerRef===weekStart);if(!oldWeek)throw new AppError('REPLAN_NOT_ALLOWED');
 // Other sports stay fixed; past, begun, completed and recorded sessions are never replaced.
 const protectedIds=protectedWeekRequests(state,weekStart,clock.today);
 const fixed=before.requests.filter(r=>protectedIds.includes(r.requestId)||!['strength','hyrox'].includes(r.sport));
 const fixedIds=new Set(fixed.map(r=>r.requestId));
 const fixedSessions=fixed.flatMap(r=>{const result=state.programmeState?.results.find(x=>x.requestId===r.requestId);const date=r.date??(result?.completion!=='missed'?result?.date:undefined);return date&&r.record?[{requestId:r.requestId,date,archetypeId:r.intent?.archetypeId??'',session:sessionOf(r),sport:r.sport}]:[];});
 const occupied=new Set(fixedSessions.map(r=>r.date));
 const {intent,goals}=portInputs(ps);const ports=buildPorts(updated,p,intent,env,goals);
 const demands:SportIntent[]=oldWeek.intent.demands.filter(d=>['strength','hyrox'].includes(d.sport)).flatMap(d=>{
  const n=p[d.sport].enabled?(p[d.sport].sessionsPerWeek??d.sessions):0;
  const count=Math.max(0,n-fixed.filter(r=>r.sport===d.sport).length);
  const declared=intent.sports.find(x=>x.sport===d.sport);
  return count>0?[{...d,sessions:count,...(d.sport==='strength'&&declared?{intent:{...d.intent,stimulus:declared.intent.stimulus,objective:declared.intent.objective}}:{})}]:[];
 });
 const edition=before.governance.filter(r=>r.code==='KAIRO.WEEK_REPLANNED').length+1;
 const idOf=(id:string)=>id.replace(weekStart+'.',`${weekStart}.v22.${String(edition)}.`);
 const mapWeek=(w:WeekSession)=>({...w,requestId:idOf(w.requestId)});
 const wrapped:SportPorts=Object.fromEntries(Object.entries(ports).map(([sp,port])=>{
  if(!port)return[sp,port];const total=p[sp as Sport].sessionsPerWeek;const composition=port.composition;const memo=new Map<string,ReturnType<typeof port.generate>>();
  return[sp,{...port,...(composition?{composition:{...composition,placementArchetypeId:typeof composition.placementArchetypeId==='function'?()=> (composition.placementArchetypeId as (n:number)=>string|undefined)(total??1):composition.placementArchetypeId,compose:args=>composition.compose({...args,weeklySessions:total??args.weeklySessions})}}:{}),generate:slot=>{
   const own=fixedSessions.filter(r=>r.sport===sp&&(sp==='strength'||r.date<slot.date)&&!state.programmeState?.results.some(x=>x.requestId===r.requestId));
   const args={...slot,requestId:idOf(slot.requestId),seed:`planner:${idOf(slot.requestId)}:${slot.date}`,sportSessions:total??slot.sportSessions,
    weekSessions:[...own,...(slot.weekSessions??[]).map(mapWeek)]};
   const key=JSON.stringify(args);const hit=memo.get(key);if(hit)return hit;const out=port.generate(args);memo.set(key,out);return out;
  }}];
 }));
 const onlyFixed={...updated,planner:{...updated.planner,weeks:{...updated.planner.weeks,[weekStart]:{...before,requests:fixed}}}};
 const recent=[...recentOf(updated,p,weekStart),...recentOf(onlyFixed,p,addDays(weekStart,p.availability.length))];
 const available=p.availability.map((minutes,i)=>({date:addDays(weekStart,i),availableMinutes:minutes}));
 const candidates:[string|null,...(string|null)[]]=[null,...available.filter(d=>d.availableMinutes>0&&!occupied.has(d.date)&&d.date>=clock.today).map(d=>d.date)];
 let best:AppState|undefined;let bestRank:number[]=[];let tried=0;
 for(const rest of candidates){
  const days=available.map(d=>({...d,availableMinutes:d.date<clock.today||occupied.has(d.date)||d.date===rest?0:d.availableMinutes}));
  const generated=planMultisportWeek({weekStart,days,demands,mode:env.mode,recent},wrapped,env.governance,clockOf());tried++;
  // Map internal planner IDs once, including reasons, neighbours and composition references.
  const raw=persistWeek(generated,normalizeInstant(clock.now),ps.definition.origin,env);
  const mapIds=<T,>(value:T):T=>JSON.parse(JSON.stringify(value,(_key,item:unknown)=>typeof item==='string'?item.replace(new RegExp(weekStart+'\\.(strength|hyrox|running|crosstraining)\\.','g'),`${weekStart}.v22.${String(edition)}.$1.`):item)) as T;
  const mapReason=(r:Request['reasons'][number])=>r.code.includes('.PLANNER.')?mapIds(r):r;
  // Only planner-owned references are internal IDs. Engine records/reasons already
  // contain public IDs and may reference a protected session: preserve them exactly.
  const mapped={...raw,requests:raw.requests.map(r=>({...r,requestId:idOf(r.requestId),reasons:r.reasons.map(mapReason),...(r.cause?{cause:mapReason(r.cause)}:{})})),conflicts:raw.conflicts.map(mapReason),arbitration:raw.arbitration?mapIds(raw.arbitration):undefined};
  const requests=[...fixed,...mapped.requests.map(r=>({...r,plannedAt:normalizeInstant(clock.now),...(r.sport==='strength'?{strengthProfile:p}:{})}))];
  const week:PersistedWeek={...before,strengthProfile:before.strengthProfile??state.profile??undefined,days:available.map(d=>{const r=requests.find(r=>r.status==='planned'&&r.date===d.date);return{...d,status:r?'planned':'empty',...(r?{requestId:r.requestId,sport:r.sport}:{})};}),requests,
   conflicts:mapped.conflicts,arbitration:mapped.arbitration,governance:[...before.governance,{code:'KAIRO.WEEK_REPLANNED',params:{at:clock.now,preserved:[...fixedIds],replaced:before.requests.filter(r=>!fixedIds.has(r.requestId)).map(r=>r.requestId)}}]};
  const wReq=requests.map(r=>({requestId:r.requestId,sport:r.sport,status:r.status,category:r.category,...(r.date?{date:r.date}:{}),...(r.intent?{intent:r.intent}:{}),...(r.composition?{composition:r.composition}:{}),...(r.composedFor?{composedUnplaced:true as const}:{})}));
  const next={...updated,planner:{...updated.planner,weeks:{...updated.planner.weeks,[weekStart]:week}},programmeState:zProgrammeState.parse({...ps,weeks:ps.weeks.map(w=>w.plannerRef===weekStart?{...w,intent:{...w.intent,demands:w.intent.demands.map(d=>['strength','hyrox'].includes(d.sport)?{...d,sessions:p[d.sport].sessionsPerWeek??d.sessions,...(d.sport==='strength'?{intent:{...d.intent,stimulus:intent.sports.find(x=>x.sport==='strength')?.intent.stimulus,objective:intent.sports.find(x=>x.sport==='strength')?.intent.objective}}:{})}:d)},requests:wReq}:w)})};
  const warnings=weekLoadWarnings(next,weekStart);const consecutive=warnings.find(w=>w.kind==='consecutive');
  const rank=[requests.filter(r=>r.status==='planned').length,...p.priorities.map(sp=>requests.filter(r=>r.sport===sp&&r.status==='planned').length),-requests.filter(r=>r.reasons.some(c=>c.code.includes('M3_CONFLICT_UNRESOLVED'))).length,-(consecutive?.kind==='consecutive'?consecutive.days:1)];
  if(!best||rank.some((n,i)=>n!==(bestRank[i]??0)&&rank.slice(0,i).every((v,j)=>v===bestRank[j])&&n>(bestRank[i]??0))){best=next;bestRank=rank;}
 }
 if(!best)throw new AppError('REPLAN_NOT_ALLOWED');
 // Assert the existing engine's weekly high limits. Preserved work can never be removed to meet a new target.
 const volume=strengthWeekVolume(best,weekStart);
 const forecast:Record<string,number>={};const params=strengthParametersFor(p);const catalog=strengthContent().catalog;
 for(const request of best.planner.weeks[weekStart]?.requests??[]){
  const result=state.programmeState?.results.find(r=>r.requestId===request.requestId);
  if(request.sport!=='strength'||!request.record||result?.completion==='missed'||(request.status!=='planned'&&!result))continue;
  let session=sessionOf(request);const log=state.programmeLogs[request.requestId];
  // A completed partial session contributes its performed sets, never its unperformed prescription.
  // An unfinished protected session reserves its full prescription conservatively.
  if(result&&log)session={...session,blocks:session.blocks.map(b=>({...b,items:b.items.map(item=>({...item,prescription:item.prescription.type==='sets'?{...item.prescription,sets:item.prescription.sets.filter((_set,index)=>log.sets.some(s=>s.itemId===item.id&&s.setIndex===index&&s.done))}:item.prescription}))}))};
  for(const [group,sets] of Object.entries(sessionPlannedHardSets(session,params,catalog)))forecast[group]=(forecast[group]??0)+sets;
 }
 if(volume?.groups.some(g=>g.high!==null&&(forecast[g.group]??0)>g.high))throw new AppError('REPLAN_VOLUME_LIMIT');
 const after=best.planner.weeks[weekStart];if(!after)throw new AppError('REPLAN_NOT_ALLOWED');
 return{source:JSON.stringify(state),clock,profile:input,weekStart,before,after,protectedIds,next:best,alternativesTried:tried};
}
export function confirmStrengthWeekReplan(state:AppState,preview:WeekReplanPreview,clock:Clock,confirmed:boolean,env:ProgrammeEnvironment):AppState {
 if(!confirmed)throw new AppError('REPLAN_CONFIRMATION_REQUIRED');
 if(JSON.stringify(state)!==preview.source||clock.today!==preview.clock.today)throw new AppError('REPLAN_STALE');
 const fresh=previewStrengthWeekReplan(state,preview.profile,preview.clock,env);
 if(JSON.stringify(fresh.after)!==JSON.stringify(preview.after))throw new AppError('REPLAN_STALE');
 const committed=writeReplannedWeek(state,fresh.after,clock.today,true);
 return {...fresh.next,planner:committed.planner};
}
