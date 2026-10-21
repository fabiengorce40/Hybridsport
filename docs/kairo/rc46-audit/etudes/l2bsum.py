import json,sys,collections
SP=sys.argv[1]; v=sys.argv[2]
d=json.load(open(f'{SP}/l2b-{v}.json'))
for pid,x in d.items():
  c=collections.Counter(); ex=[]
  for wk,w in x['weeks'].items():
    for s in (w or {}).get('sessions',[]):
      sp=s['sport']; c[f'{sp}.n']+=1
      for k in ('staleCross','staleWeek','staleNeighbours','matters'):
        if s[k]: c[f'{sp}.{k}']+=1
      if s['matters']: ex.append(f"{s['requestId']}{' [M3]' if s['m3'] else ''} cross={int(s['staleCross'])} week={int(s['staleWeek'])} nb={int(s['staleNeighbours'])}: {' '.join(s['detail'][:8])}")
  print(f"\n=== {pid}: {dict(sorted(c.items()))}")
  print('   R-A', {k:v.get('planner_divergence',0) for k,v in x['repro'].items()}, '| total', {k:sum(v.values()) for k,v in x['repro'].items()})
  for e in ex[:12]: print('   ',e)
  for dv in x['divergences'][:4]: print('    DIV',dv[:160])
