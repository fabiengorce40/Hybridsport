import json
V=['REF','A','B1','B2','C','CA']; P=['S4','P1b','S4H','S4C','S4D']
D={v:json.load(open(f'rc52-{v}.json')) for v in V}
MAINS=('bench_press','barbell_ohp','back_squat','romanian_deadlift','db_bench_press','goblet_squat','db_shoulder_press','single_leg_rdl_db')
def wk(w):
    if not w: return '—'
    import datetime; d=(datetime.date.fromisoformat(w)-datetime.date(2026,10,5)).days//7+1; return f'S{d}'
def row(v,p,a):
    r=D[v][f'{p}/{a}']; s=r['summary']
    if s['strengthSessions']==0: return None
    L=r['lifts']
    main={}
    for k,x in L.items():
        ex,slot=k.split('@')
        if ex in MAINS: main.setdefault(ex,[0,0]); main[ex][0]+=x['n']; main[ex][1]+= 1 if slot.startswith('main_') else 0
    freq='; '.join(f"{e} {n/12:.1f}" for e,(n,_) in sorted(main.items(), key=lambda z:-z[1][0]) if n>=6)
    pr=[x for k,x in L.items() if k.split('@')[1].startswith('main_')]
    first=min([x['firstLoadUpWeek'] for x in pr if x['firstLoadUpWeek']] or [None], key=lambda z: z or 'z')
    lastloads='/'.join(sorted({str(x['last']) for x in pr if x['last'] is not None}))
    accs=[x for k,x in L.items() if not k.split('@')[1].startswith('main_') and x['first'] is not None]
    aup=sum(x['loadUps'] for x in accs); rup=sum(x['repsUps'] for x in accs)
    afirst=min([x['firstLoadUpWeek'] for x in accs if x['firstLoadUpWeek']] or [None], key=lambda z: z or 'z')
    vol=s['volume']; g=lambda n: vol[n]['total']
    pb=lambda w: ','.join(f"{k.split(':')[0][:3]}:{k.split(':')[1][:3]}{n}" for k,n in sorted(r['probes'][w].items()))
    return dict(freq=freq, mainFirst=wk(first), mainLast=lastloads, accLoad=aup, accReps=rup, accFirst=wk(afirst),
      vol=f"{g('chest')}/{g('back')}/{g('shoulders')}/{g('arms')}/{g('quads')}/{g('hamstrings')}/{g('glutes')}",
      under=sum(s['underFloorWeeks'].values()), over=sum(s['overHighWeeks'].values()), pt=s['pushPull']['ratio'],
      dur=f"{s['duration']['meanMin']}/{s['duration']['maxMin']}/{s['duration']['overAvailable']}", red=f"{s['interference']['sessionsReduced']}/{s['interference']['reductions']}",
      switch=s['continuity']['exerciseSwitched'], recal=s['continuity']['recalibrated'], down=s['continuity']['loadDown'], ra=f"{s['reproducibility']['identical']}/{s['strengthSessions']}",
      w2=pb('w2'), w7=pb('w7'))
import sys
out=[]
for p in P:
  for a in ['conforme','progressant']:
    out.append(f'\n#### {p} — athlète {a}\n')
    out.append('| Var. | Fréquence/sem. des principaux | 1re hausse principal | Charges finales principaux | Accessoires : hausses charge / répétitions | 1re hausse accessoire | Pecto/Dos/Épaules/Bras/Quadri/Ischios/Fessiers | Sous plancher / au-dessus | P/T | Durée moy/max/dépass. | Allégées (séances/réductions) | Exercice changé | R-A |')
    out.append('|'+'---|'*13)
    for v in V:
      x=row(v,p,a)
      if x is None: out.append(f'| {v} | **aucune séance** (programme non créé) |||||||||||| '); continue
      out.append(f"| {v} | {x['freq']} | {x['mainFirst']} | {x['mainLast']} | {x['accLoad']} / {x['accReps']} | {x['accFirst']} | {x['vol']} | {x['under']} / {x['over']} | {x['pt']} | {x['dur']} | {x['red']} | {x['switch']} | {x['ra']} |")
open('tables.md','w').write('\n'.join(out))
# probes
pr=[]
for p in P:
  for v in V:
    r=D[v].get(f'{p}/conforme')
    if r['summary']['strengthSessions']==0: continue
    pr.append(f"{p} {v} w2={r['probes']['w2']} w7={r['probes']['w7']}")
open('probes.txt','w').write('\n'.join(pr))
