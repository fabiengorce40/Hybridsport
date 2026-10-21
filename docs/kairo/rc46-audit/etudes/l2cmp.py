import json,sys
SP=sys.argv[1]
R={v:json.load(open(f'{SP}/l2-{v}.json')) for v in ['ref','after','interf']}
G=['quads','hamstrings','glutes','calves','chest','back','shoulders','arms','core']
for pid in R['ref']:
  ref=R['ref'][pid]
  print(f"\n=== {pid}  stats ref={ref['stats']}")
  rs={s['id']:s for s in ref['q']['sessions']}
  for v in ['after','interf']:
    o=R[v][pid]; os_={s['id']:s for s in o['q']['sessions']}
    print(f" -- {v} stats={o['stats']}")
    nd=0
    for sid,a in rs.items():
      b=os_.get(sid)
      if not b: print('   missing',sid); nd+=1; continue
      diffs=[]
      if a['date']!=b['date']: diffs.append(f"date {a['date']}>{b['date']}")
      ea=[(i['ex'],i['sets'],i['rir'],i['reps']) for i in a['items']]; eb=[(i['ex'],i['sets'],i['rir'],i['reps']) for i in b['items']]
      if ea!=eb:
        sa={i[0]:i for i in ea}; sb={i[0]:i for i in eb}
        for k in sa:
          if k not in sb: diffs.append(f"-{k}")
          elif sa[k]!=sb[k]: diffs.append(f"{k} {sa[k][1:]}>{sb[k][1:]}")
        for k in sb:
          if k not in sa: diffs.append(f"+{k}")
      if a['estMin']!=b['estMin']: diffs.append(f"min {a['estMin']}>{b['estMin']}")
      if a['reductions']!=b['reductions']: diffs.append(f"red {a['reductions']}>{b['reductions']}")
      if a['marks']!=b['marks']: diffs.append(f"marks {a['marks']}>{b['marks']}")
      if diffs: nd+=1; print('   ',sid,a['arch'],'|','; '.join(diffs))
    extra=[s for s in os_ if s not in rs]
    if extra: print('   extra',extra)
    print(f"   sessions changed {nd}/{len(rs)}")
    # weekly volume means
    def wmean(x):
      ws=x['q']['weeks']; return {g: round(sum(w['vol'].get(g,[0])[0] for w in ws)/max(1,len(ws)),2) for g in G}
    ma,mb=wmean(ref),wmean(o)
    dv={g:round(mb[g]-ma[g],2) for g in G if abs(mb[g]-ma[g])>0.001}
    print('   vol delta/week',dv)
