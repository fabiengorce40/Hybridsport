#!/usr/bin/env python3
"""RC5.3 — comparaison chiffrée de deux bancs (`rc53-bench.test.ts`) : référence et lot.

Usage : python3 -I compare_lots.py <dossier référence> <dossier lot> [titre]
Chaque dossier contient `<version>-<profil>.json` (clés « niveau/trajectoire »). Sortie : Markdown sur stdout.
"""
import glob
import json
import os
import sys
from statistics import mean

LEVELS = ['beginner', 'intermediate', 'advanced']
KINDS = ['progressant', 'stable', 'fatigue', 'stagnation']
LV = {'beginner': 'Débutant', 'intermediate': 'Intermédiaire', 'advanced': 'Avancé'}
KD = {'progressant': 'Progressant', 'stable': 'Stable', 'fatigue': 'Fatigué', 'stagnation': 'Stagnation'}
GAIN = {'beginner': 0.015, 'intermediate': 0.0075, 'advanced': 0.004}
MULTI = {'P1b', 'S4H'}


def load(d):
    out = {}
    for f in sorted(glob.glob(os.path.join(d, '*.json'))):
        prof = os.path.basename(f)[:-5].rsplit('-', 1)[1]
        out[prof] = json.load(open(f))
    return out


def truth(level, kind, w):
    g = GAIN[level]
    if kind == 'stable':
        return 0.0
    return g * (min(w, 8) if kind == 'stagnation' else w)


def gain(c, key):
    xs = [(v[key] / v['first'] - 1) * 100 for v in c['lifts'].values() if v['main'] and v['first'] and v[key]]
    return mean(xs) if xs else None


def avg(c, key, main):
    xs = [v[key] for v in c['lifts'].values() if v['main'] == main and v[key] is not None]
    return mean(xs) if xs else None


def code(c, k):
    return c['codes'].get(k, 0)


def fmt(x, d=1):
    return '—' if x is None else f'{x:+.{d}f}'.replace('.', ',')


def agg(data, profiles, level, kind, f):
    xs = [f(data[p][f'{level}/{kind}']) for p in profiles if p in data]
    xs = [x for x in xs if x is not None]
    return mean(xs) if xs else None


def tot(data, profiles, level, kind, f):
    return sum(f(data[p][f'{level}/{kind}']) for p in profiles if p in data)


def main():
    ref, lot = load(sys.argv[1]), load(sys.argv[2])
    title = sys.argv[3] if len(sys.argv) > 3 else 'Lot'
    profiles = sorted(set(ref) & set(lot))
    L = [f'# {title} — comparaison chiffrée (référence → lot)', '', f'Profils : {", ".join(profiles)} ; 24 semaines ; athlète à capacité cachée.', '']
    for scope, ps in [('Tous profils', profiles), ('Multisport (Course, HYROX)', [p for p in profiles if p in MULTI])]:
        L += [f'## {scope}', '', '| Athlète | Niveau | Gain réel 24 sem. | Gain principaux 12 sem. | Gain principaux 24 sem. | Écart principaux S24 | Écart accessoires S24 | Régressions | Hausses injustifiées | Pas de répétitions | Maintiens « séance modifiée » |', '|---|---|---|---|---|---|---|---|---|---|---|']
        for kind in KINDS:
            for level in LEVELS:
                def pair(f, d=1, total=False):
                    a = (tot if total else agg)(ref, ps, level, kind, f)
                    b = (tot if total else agg)(lot, ps, level, kind, f)
                    if total:
                        return f'{a} → {b}'
                    return f'{fmt(a, d)} → {fmt(b, d)}'
                real = truth(level, kind, 23) * 100
                L.append('| ' + ' | '.join([
                    KD[kind], LV[level], fmt(real),
                    pair(lambda c: gain(c, 'w12')), pair(lambda c: gain(c, 'w24')),
                    pair(lambda c: avg(c, 'err24', True)), pair(lambda c: avg(c, 'capErr24', False)),
                    pair(lambda c: code(c, 'PROGRESSION.REGRESSED'), total=True),
                    pair(lambda c: c['unjustified'], total=True),
                    pair(lambda c: code(c, 'ADVANCED:reps'), total=True),
                    pair(lambda c: code(c, 'HELD:modified_prescription') + code(c, 'HELD:below_modified'), total=True),
                ]) + ' |')
        L.append('')
    # Contrôles transverses.
    L += ['## Contrôles transverses', '']
    rows = []
    for p in profiles:
        for level in LEVELS:
            for kind in KINDS:
                a, b = ref[p][f'{level}/{kind}'], lot[p][f'{level}/{kind}']
                sa, sb = a['summary'], b['summary']
                rows.append((p, level, kind, sa, sb, a, b))
    same_starts = sum(1 for r in rows if r[5]['starts'] == r[6]['starts'])
    L.append(f'- Décisions de démarrage (sondes semaine 2 : douleur, fatigue, course libre, inconnu) identiques : **{same_starts} / {len(rows)}** simulations.')
    sess = [(r[3]['strengthSessions'], r[4]['strengthSessions']) for r in rows]
    L.append(f'- Séances planifiées : {sum(x for x, _ in sess)} → {sum(y for _, y in sess)}.')
    over = [(r[3]['duration']['overAvailable'], r[4]['duration']['overAvailable']) for r in rows]
    L.append(f'- Dépassements du temps disponible : {sum(x for x, _ in over)} → {sum(y for _, y in over)} ; durée maximale {max(r[3]["duration"]["maxMin"] for r in rows)} → {max(r[4]["duration"]["maxMin"] for r in rows)} min.')
    rep = [(r[3]['reproducibility']['identical'], r[3]['strengthSessions'], r[4]['reproducibility']['identical'], r[4]['strengthSessions']) for r in rows]
    L.append(f'- Reproductibilité R-A identique : {sum(x[0] for x in rep)}/{sum(x[1] for x in rep)} → {sum(x[2] for x in rep)}/{sum(x[3] for x in rep)}.')
    under = [(sum(r[3]['underFloorWeeks'].values()), sum(r[4]['underFloorWeeks'].values())) for r in rows]
    L.append(f'- Groupes × semaines sous le plancher de volume : {sum(x for x, _ in under)} → {sum(y for _, y in under)}.')
    L.append('')
    print('\n'.join(L))


if __name__ == '__main__':
    main()
