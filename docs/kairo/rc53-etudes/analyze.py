import json, statistics as st
P=['S4','P1b','S4H','S4D','S3','S4F']; L=['beginner','intermediate','advanced']; K=['progressant','stable','fatigue','stagnation']
D={(v,p):json.load(open(f'{v}-{p}.json')) for v in 'APS' for p in P}
def agg(v, level=None, kind=None, prof=None):
  rows=[]
  for p in P:
    if prof and p not in prof: continue
    for k,r in D[(v,p)].items():
      lv,kd=k.split('/')
      if level and lv!=level: continue
      if kind and kd!=kind: continue
      rows.append((p,r))
  m=lambda xs: round(st.mean(xs),1) if xs else None
  mains=[x for p,r in rows for x in r['lifts'].values() if x['main'] and x['first'] is not None]
  acc=[x for p,r in rows for x in r['lifts'].values() if not x['main']]
  c=lambda key: sum(r['codes'].get(key,0) for p,r in rows)
  s=lambda f: sum(f(r['summary']) for p,r in rows)
  return dict(n=len(rows),
    err12=m([x['err12'] for x in mains if x['err12'] is not None]), err24=m([x['err24'] for x in mains if x['err24'] is not None]),
    absErr24=m([abs(x['err24']) for x in mains if x['err24'] is not None]),
    mainUps=sum(x['ups'] for x in mains), mainDowns=sum(x['downs'] for x in mains),
    gain24=m([ (x['w24']-x['first'])/x['first']*100 for x in mains if x['w24'] and x['first']]),
    accLoadUps=sum(x['ups'] for x in acc), accRepsUps=sum(x['repsUps'] for x in acc),
    regressed=c('PROGRESSION.REGRESSED'), reverted=c('PROGRESSION.PROBE_REVERTED'), cap=c('PROGRESSION.CAP_REACHED'), blocked=c('PROGRESSION.DECISION_BLOCKED'),
    heldBelow=c('HELD:below'), belowMod=c('HELD:below_modified'), modHeld=c('HELD:modified_prescription'), reset=c('REEVALUATED:stagnation_reset'), tooLight=c('REEVALUATED:too_light'), tooHeavy=c('REEVALUATED:too_heavy'),
    unjust=sum(r['unjustified'] for p,r in rows),
    under=s(lambda x: sum(x['underFloorWeeks'].values())), over=s(lambda x: sum(x['overHighWeeks'].values())),
    durOver=s(lambda x: x['duration']['overAvailable']), durMax=max(r['summary']['duration']['maxMin'] or 0 for p,r in rows),
    ra=f"{s(lambda x: x['reproducibility']['identical'])}/{s(lambda x: x['strengthSessions'])}")
import sys
if __name__=='__main__':
  for kind in K:
    for level in L:
      a=agg('A',level,kind); b=agg('P',level,kind)
      print(kind, level)
      for key in a:
        if a[key]!=b[key]: print(f'   {key}: A={a[key]}  P={b[key]}')
