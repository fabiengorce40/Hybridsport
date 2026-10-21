import json, collections
A=json.load(open('/tmp/claude-0/rc46-audit.json'))
for p in ['P1','P1b','S3','S4','P5']:
    S=A[p]['strength']
    seq=collections.defaultdict(list)
    for s in sorted(S,key=lambda x:x['date']):
        for i in s['items']: seq[(i['slot'],i['ex'])].append((i['load'],i['track'],i['source'],i['reps']))
    never=[(k,len(v)) for k,v in seq.items() if len(v)>=3 and all(x[0] is None for x in v)]
    print(p,'jamais chargés (≥3 expositions) :',[f"{k[1]}@{k[0]}×{n}" for k,n in never])
    loaded=[(k,[x[0] for x in v]) for k,v in seq.items() if any(x[0] for x in v)]
    print('   charges des principaux :', [(k[1],v[:8]) for k,v in loaded if k[0].endswith('main_knee') or k[0].endswith('main_hip') or 'main' in k[0]][:4])
for p in ['S4','P1b']:
    print('##',p)
    for s in A[p]['strength'][:8]:
        print('  ',s['date'],s['arch'],' | '.join(f"{i['ex']}:{i['sets']}x{i['reps']}@{i['load']}" for i in s['items']))
for p in ['P1b','P5']:
    c=collections.Counter(x.split(':')[-1] if ':' in x else x for r in A[p]['rows'] if r['sport']=='strength' for x in r['red'])
    c2=collections.Counter(x for r in A[p]['rows'] if r['sport']=='strength' for x in r['red'])
    print(p,'réductions (action) :',dict(c),' exemples :',list(c2)[:5])
for p in ['P2','P3']:
    print(p, [y for x in A[p]['repro'] for y in x['planner']][3:9])
