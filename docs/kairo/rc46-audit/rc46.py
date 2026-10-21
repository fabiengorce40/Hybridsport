import json, collections, itertools
A=json.load(open('/tmp/claude-0/rc46-audit.json'))
def jac(a,b):
    a,b=set(a),set(b); return len(a&b)/len(a|b) if a|b else 1
for p,d in A.items():
    S=d['strength']
    if not S: 
        print(f"## {p} {d['label']} : pas de Musculation"); 
    else:
        print(f"## {p} {d['label']} — {len(S)} séances Musculation")
        exs=collections.Counter(i['ex'] for s in S for i in s['items'])
        print(f"  exercices distincts sur 6 sem : {len(exs)} ; top : {', '.join(f'{k}×{v}' for k,v in exs.most_common(6))}")
        by=collections.defaultdict(list)
        for s in S: by[s['arch']].append(s)
        for arch,L in by.items():
            sigs=[tuple(sorted(i['ex'] for i in s['items'])) for s in L]
            mains=[tuple(i['ex'] for i in s['items'] if i['block']=='strength')[:2] for s in L]
            same_prev=sum(1 for a,b in zip(sigs,sigs[1:]) if a==b)
            j=[jac(a,b) for a,b in zip(sigs,sigs[1:])]
            # same occurrence k week to week
            byk=collections.defaultdict(list)
            for s in L: byk[s['id'].split('.')[-1]].append(tuple(sorted(i['ex'] for i in s['items'])))
            print(f"  {arch}: {len(L)} séances, signatures distinctes {len(set(sigs))}, identiques à la précédente {same_prev}/{len(L)-1}, Jaccard moyen {sum(j)/len(j) if j else 1:.2f}, principaux distincts {len(set(m[0] if m else '' for m in mains))}")
        # continuité par (slot, exercice)
        seq=collections.defaultdict(list)
        for s in sorted(S,key=lambda x:x['date']):
            for i in s['items']: seq[(s['arch'],i['slot'])].append((s['date'],i['ex'],i['load'],i['reps'],i['track'],i['source']))
        recal=dec=stall=switch=0; total=0
        for k,L in seq.items():
            for a,b in zip(L,L[1:]):
                total+=1
                if a[1]!=b[1]: switch+=1; continue
                if a[2] is not None and b[2] is None: recal+=1
                if a[2] is not None and b[2] is not None and b[2]<a[2]: dec+=1
            for a,b,c in zip(L,L[1:],L[2:]):
                if a[1]==b[1]==c[1] and a[2]==b[2]==c[2] and a[3]==b[3]==c[3] and a[2] is not None: stall+=1
        effort=sum(1 for s in S for i in s['items'] if i['load'] is None)
        items=sum(len(s['items']) for s in S)
        print(f"  continuité (par emplacement) : {total} transitions ; changement d'exercice {switch} ; retour en calibration {recal} ; baisse de charge {dec} ; 3 expositions identiques (stagnation) {stall} ; items sans charge {effort}/{items}")
    W=d['weeks']
    under=collections.Counter(g for w in W for g,v in w['vol'].items() if v[1] is not None and v[0]<v[1])
    over=collections.Counter(g for w in W for g,v in w['vol'].items() if v[2] is not None and v[0]>v[2])
    if any(w['vol'] for w in W):
        avg=lambda g: round(sum(w['vol'].get(g,[0])[0] for w in W)/len(W),1)
        print(f"  volume moyen/sem : "+' '.join(f"{g}:{avg(g)}" for g in ['quads','hamstrings','glutes','calves','chest','back','shoulders','arms','core']))
        print(f"  sous plancher (sem×groupe) : {dict(under)} ; au-dessus borne haute : {dict(over)}")
        pp=[(w['vol'].get('chest',[0])[0]+w['vol'].get('shoulders',[0])[0], w['vol'].get('back',[0])[0]) for w in W]
        qh=[(w['vol'].get('quads',[0])[0], w['vol'].get('hamstrings',[0])[0]) for w in W]
        print(f"  poussée/tirage par sem : {pp} ; quadriceps/ischios : {qh}")
    rows=d['rows']
    red=sum(len(r['red']) for r in rows if r['sport']=='strength'); redS=sum(1 for r in rows if r['sport']=='strength' and r['red'])
    arb=collections.Counter((r['arbitration'] or '').split(':')[0] for r in rows if r['arbitration'])
    np_=collections.Counter(r['sport'] for r in rows if r['placement']!='planned')
    print(f"  interactions : séances Muscu allégées {redS}/{sum(1 for r in rows if r['sport']=='strength')} ({red} réductions) ; arbitrages M3 {dict(arb)} ; non placées {dict(np_)}")
    pd=sum(len(x['planner']) for x in d['repro']); tot=sum(sum(x['counts'].values()) for x in d['repro'])
    print(f"  R-A : divergences planificateur {pd}/{tot} séances Musculation ; exemples {[y for x in d['repro'] for y in x['planner']][:3]}")
