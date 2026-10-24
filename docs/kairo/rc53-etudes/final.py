import json, statistics as st
exec(open('analyze.py').read().split("import sys")[0])
TRUTH={'progressant':{'beginner':34.5,'intermediate':17.3,'advanced':9.2},'stable':{'beginner':0,'intermediate':0,'advanced':0},'fatigue':{'beginner':34.5,'intermediate':17.3,'advanced':9.2},'stagnation':{'beginner':12.0,'intermediate':6.0,'advanced':3.2}}
def rows(v,level,kind,prof=None): return [r for p in P if not prof or p in prof for k,r in D[(v,p)].items() if k==f'{level}/{kind}']
def m(xs): xs=[x for x in xs if x is not None]; return round(st.mean(xs),1) if xs else None
def ext(v,level,kind,prof=None):
  R=rows(v,level,kind,prof)
  mains=[x for r in R for x in r['lifts'].values() if x['main'] and x['first'] is not None]
  acc=[x for r in R for x in r['lifts'].values() if not x['main'] and x['first'] is not None]
  return dict(
    gain12=m([(x['w12']-x['first'])/x['first']*100 for x in mains if x['w12'] and x['first']]),
    gain24=m([(x['w24']-x['first'])/x['first']*100 for x in mains if x['w24'] and x['first']]),
    err24=m([x['err24'] for x in mains]), accCap12=m([x['capErr12'] for x in acc]), accCap24=m([x['capErr24'] for x in acc]),
    accReps=sum(x['repsUps'] for x in acc), accLoad=sum(x['ups'] for x in acc),
    reg=sum(r['codes'].get('PROGRESSION.REGRESSED',0) for r in R), rev=sum(r['codes'].get('PROGRESSION.PROBE_REVERTED',0) for r in R), maxRev=max(r['maxRevertsPerLoadCycle'] for r in R),
    unjust=sum(r['unjustified'] for r in R), belowMod=sum(r['codes'].get('HELD:below_modified',0) for r in R), modHeld=sum(r['codes'].get('HELD:modified_prescription',0) for r in R),
    underND=sum(r['underNoDeload'] for r in R), underD=sum(r['underDeload'] for r in R), overND=sum(r['overNoDeload'] for r in R),
    durOver=sum(r['summary']['duration']['overAvailable'] for r in R), durMax=max(r['summary']['duration']['maxMin'] or 0 for r in R),
    ra=f"{sum(r['summary']['reproducibility']['identical'] for r in R)}/{sum(r['summary']['strengthSessions'] for r in R)}")
if __name__=='__main__':
  for kind in K:
    for level in L:
      print(f'{kind} {level} (vrai gain {TRUTH[kind][level]}%)')
      for v in 'AP': print('  ',v,ext(v,level,kind))
