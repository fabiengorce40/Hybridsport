import json,sys
SP=sys.argv[1]; vs=sys.argv[2].split(',')
R={v:json.load(open(f'{SP}/l1-{v}.json')) for v in vs}
G=['quads','hamstrings','glutes','calves','chest','back','shoulders','arms','core']
for pid in R['ref']:
  if R['ref'][pid]['s']['strengthSessions']==0: continue
  print(f"\n=== {pid} {R['ref'][pid]['s']['label']}")
  print('variant   ' + ' '.join(f'{g[:6]:>11}' for g in G) + '   push/pull ratio  dur(mean/max/over)  ex/sess  distinctEx')
  for v in vs:
    s=R[v][pid]['s']
    cells=' '.join(f"{s['volume'][g]['total']:>5}({s['underFloorWeeks'][g]}/{s['overHighWeeks'][g]})" for g in G)
    q=R[v][pid]['q']; n=len(q['sessions']); exps=sum(len(x['items']) for x in q['sessions'])/max(1,n)
    de=sum(x['distinctExercises'] for x in s['variety'])
    d=s['duration']; pp=s['pushPull']
    print(f"{v:9} {cells}   {pp['push']}/{pp['pull']} {pp['ratio']}  {d['meanMin']}/{d['maxMin']}/{d['overAvailable']}  {exps:.1f}  {de}  arms d/i {s['volume']['arms']['direct']}/{s['volume']['arms']['indirect']}")
