import json,sys,collections
SP=sys.argv[1]; vs=sys.argv[2].split(',')
R={v:json.load(open(f'{SP}/l2b-{v}.json')) for v in vs}
G=['quads','hamstrings','glutes','calves','chest','back','shoulders','arms','core']
def stale(x):
  c=collections.Counter()
  for w in x['weeks'].values():
    for s in (w or {}).get('sessions',[]):
      if s['sport'] in('strength','crosstraining'):
        if s['staleCross']: c[s['sport'][:2]+'.cross']+=1
        if s['matters']: c[s['sport'][:2]+'.matters']+=1
  return dict(c)
for pid in R['ref']:
  ref=R['ref'][pid]
  print(f"\n=== {pid} {ref['label']}")
  for v in vs:
    x=R[v][pid]; q=x['q']; s=x['s']
    ra={k:vv.get('planner_divergence',0) for k,vv in x['repro'].items() if k in('strength','crosstraining','hyrox')}
    line=f"{v:9} R-A {ra} stale {stale(x)}"
    if q and ref['q']:
      rs={a['id']:a for a in ref['q']['sessions']}
      ch=sum(1 for a in q['sessions'] if a['id'] not in rs or [i['ex'] for i in a['items']]!=[i['ex'] for i in rs[a['id']]['items']] or [i['sets'] for i in a['items']]!=[i['sets'] for i in rs[a['id']]['items']])
      wv=lambda qq: {g: round(sum(w['vol'].get(g,[0])[0] for w in qq['weeks'])/len(qq['weeks']),1) for g in G}
      a0,b0=wv(ref['q']),wv(q)
      dv={g:round(b0[g]-a0[g],1) for g in G if abs(b0[g]-a0[g])>0.05}
      m3='-'
      line+=f" | str changed {ch}/{len(q['sessions'])} | Δbilan/sem {dv} | under {[g for g in G if s['underFloorWeeks'][g]>ref['s']['underFloorWeeks'][g]]} | dur {s['duration']['meanMin']}/{s['duration']['maxMin']}/{s['duration']['overAvailable']} | M3 str {m3} arb {len(q['arbitrations'])}"
    rc={c['id']:c for c in ref['ct']}
    cch=[c['id'] for c in x['ct'] if c['id'] not in rc or (c['strength'],c['other'])!=(rc[c['id']]['strength'],rc[c['id']]['other'])]
    if x['ct']: line+=f" | CT changed {len(cch)}/{len(x['ct'])} est {sum(c['estMin'] or 0 for c in x['ct'])}"
    if v=='fixpoint': line+=f" | iter {collections.Counter(x['iter'])}"
    print(line)
