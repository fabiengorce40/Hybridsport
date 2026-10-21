import json,sys,collections
SP=sys.argv[1]; vs=sys.argv[2].split(',')
R={v:json.load(open(f'{SP}/l1b-{v}.json')) for v in vs}
G=['quads','hamstrings','glutes','calves','chest','back','shoulders','arms','core']
PULL={'pull_up','band_assisted_pull_up','lat_pulldown','seated_cable_row','machine_row','db_row','straight_arm_pulldown','face_pull'}
for pid in R['ref']:
  if R['ref'][pid]['s']['strengthSessions']==0: continue
  print(f"\n=== {pid}")
  for v in vs:
    x=R[v][pid]; s=x['s']; q=x['q']
    cells=' '.join(f"{g[:5]}={s['volume'][g]['total']}({s['underFloorWeeks'][g]}/{s['overHighWeeks'][g]})" for g in G)
    pulls=[tuple(sorted(i['ex'] for i in a['items'] if i['ex'] in PULL)) for a in q['sessions'] if a['arch']=='str_full_body']
    samePull=sum(1 for a,b in zip(pulls,pulls[1:]) if a==b and a)
    pc=collections.Counter(e for p in pulls for e in p)
    rt={t['id']:t for t in R['ref'][pid]['tracks']}; vt={t['id']:t for t in x['tracks']}
    interrupted=[k for k,t in rt.items() if t['n']>0 and (k not in vt or vt[k]['n']<t['n'] or vt[k]['status']!=t['status'])]
    d=s['duration']; it=s['interference']
    sim='/'.join(str(w['meanSimilarity']) for w in s['variety'])
    print(f"{v:8} {cells} | pp {s['pushPull']['ratio']} | dur {d['meanMin']}/{d['maxMin']}/over{d['overAvailable']} | red {it['sessionsReduced']}/{it['reductions']} | sim {sim} | samePull {samePull}/{max(0,len(pulls)-1)} | pulls {dict(pc)} | tracksInterrupted {len(interrupted)} {interrupted[:3]} | recal {s['continuity']['recalibrated']} loadDown {s['continuity']['loadDown']}")
