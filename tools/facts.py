# One-off: prints facts used to hand-build the static sections of index.html.
import json, collections, re, sys
d = json.load(open(sys.argv[1]))
p, pa, sp, pl = d['p'], d['pa'], d['sp'], d['pl']
N = len(p)
kids = collections.defaultdict(list)
for i, x in enumerate(pa):
    if isinstance(x, list):
        for q in x: kids[q].append(i)
desc = {}
for i in sorted(range(N), key=lambda i: -p[i][6]):
    s = set(kids[i])
    for k in kids[i]: s |= desc.get(k, set())
    desc[i] = s
def yr(i): m = re.match(r'(\d{4})', p[i][2] or ''); return int(m.group(1)) if m else None
def chain(i):
    out = [i]
    while p[i][6] > 0:
        ps = [q for q in pa[i] if p[q][6] == p[i][6] - 1] if isinstance(pa[i], list) else []
        if not ps: break
        i = ps[0]; out.append(i)
    return out
out = {'children': [], 'figures': {}, 'places': {}}
for c in kids[0]:
    out['children'].append({'i': c, 'n': p[c][1], 'y': p[c][2], 'k': len(kids[c]), 'd': len(desc[c]),
        'netos': [[p[g][1], p[g][2]] for g in kids[c]]})
for i in map(int, sys.argv[2].split(',')):
    ch = chain(i)
    out['figures'][i] = {'n': p[i][1], 'y': p[i][2], 'g': p[i][6], 'born': pl[p[i][4]] if p[i][4] >= 0 else None,
        'kids': len(kids[i]), 'desc': len(desc[i]), 'via': [p[x][1] for x in ch[1:]]}
for name in sys.argv[3].split('|'):
    ids = [i for i in range(N) if p[i][6] >= 0 and p[i][4] >= 0 and pl[p[i][4]].split(',')[0] == name]
    ys = sorted(y for y in map(yr, ids) if y)
    gens = collections.Counter(p[i][6] for i in ids)
    sur = collections.Counter(p[i][1].split()[-1] for i in ids).most_common(1)
    out['places'][name] = {'count': len(ids), 'first': ys[0] if ys else None, 'last': ys[-1] if ys else None,
        'peak_gen': gens.most_common(1)[0][0], 'top_surname': sur[0][0] if sur else None}
print(json.dumps(out, ensure_ascii=False, indent=1))
