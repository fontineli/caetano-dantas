# Fills the static, no-script parts of site/index.html from the data:
# the 21 branches and the shelf of titled figures. Re-run after the data changes.
# usage: python3 -I tools/fragments.py data/descendentes_caetano.json site/index.html
import json, collections, re, sys, html
d = json.load(open(sys.argv[1]))
p, pa = d['p'], d['pa']
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
def years(s):
    s = (s or '').replace('Falecido(a)', '').strip()
    if s.strip('-') == '': return 'datas desconhecidas'
    a, sep, b = s.partition('-')
    return f"{a or '?'}–{b or '?'}" if sep else a
def n(x): return f"{x:,}".replace(',', '.')
e = html.escape

bars = []
for idx, c in enumerate(kids[0]):
    rows = ''.join(f'<li><a href="#p={p[g][0]}">{e(p[g][1])}</a><span>{years(p[g][2])}</span></li>' for g in kids[c])
    rows = rows or '<li><span>Nenhum filho registrado no livro</span></li>'
    k = len(kids[c])
    bars.append(f'<details{" open" if idx == 0 else ""}><summary><span class="bar-name">{e(p[c][1])}</span>'
                f'<span class="bar-years">{years(p[c][2])}</span><span class="bar-count" data-y="{years(p[c][2])}">{n(len(desc[c]))} descendente{"s" if len(desc[c]) != 1 else ""}</span></summary>'
                f'<p class="bar-note">{k} filho{"s" if k != 1 else ""} registrado{"s" if k != 1 else ""}. '
                f'<a href="#p={p[c][0]}">Abrir o assento</a></p><ul>{rows}</ul></details>')

kind = [('igreja', r'^(Padre|Pe\.|Monsenhor|Dom|Irmã|Frei)\s'), ('lei', r'^(Dr\.?|Juiz|Desembargador|Comendador|Professor)\s'),
        ('farda', r'^(Capitão|Cap\.|Major|Coronel|Cel\.|Tenente|Ten\.|Alferes)\s')]
label = {'igreja': 'Igreja', 'lei': 'Leis e letras', 'farda': 'Milícia'}
figs = []
for i, x in enumerate(p):
    if x[6] < 1 or not re.match(r'^\d{4}', x[2] or ''): continue
    for k, rx in kind:
        if re.match(rx, x[1]): figs.append((k, int(x[2][:4]), i)); break
# ponytail: keep every cleric and doctor, then fill with the oldest militia ranks up to 40 spines
keep = [f for f in figs if f[0] != 'farda']
keep += sorted([f for f in figs if f[0] == 'farda'], key=lambda f: f[1])[:40 - len(keep)]
keep.sort(key=lambda f: f[1])
spines = ''.join(f'<li><a class="spine spine-{k}" href="#p={p[i][0]}" data-id="{p[i][0]}">'
                 f'<span class="spine-name">{e(p[i][1])}</span><span class="spine-kind">{label[k]} · {y}</span></a></li>'
                 for k, y, i in keep)

page = open(sys.argv[2]).read()
for tag, frag in (('BARS', ''.join(bars)), ('SPINES', spines)):
    page = re.sub(rf'<!--{tag}-->.*?<!--/{tag}-->', lambda m: f'<!--{tag}-->{frag}<!--/{tag}-->', page, flags=re.S)
open(sys.argv[2], 'w').write(page)
print(len(bars), 'bars,', len(keep), 'spines')
