// Busca, assento e parentesco sobre window.D (data.js).
// D.p[i] = [id, nome, "nasc-morte", sexo, lugarNasc, lugarMorte, geração (-1 = cônjuge)]
// D.pa[i] = índices dos pais que também são descendentes (ou 0); D.sp[i] = cônjuges (ou 0); D.pl = lugares.
document.documentElement.classList.add('js');

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const DESC = ['', 'filho', 'neto', 'bisneto', 'trineto', 'tetraneto', 'pentaneto', 'hexaneto', 'heptaneto', 'octaneto', 'eneaneto'];
const ASC = ['', ['pai', 'mãe'], ['avô', 'avó'], ['bisavô', 'bisavó'], ['trisavô', 'trisavó'], ['tetravô', 'tetravó'], ['pentavô', 'pentavó'], ['hexavô', 'hexavó'], ['heptavô', 'heptavó']];
const fem = (w, i) => (P[i][3] === 'F' ? w.replace(/o$/, 'a') : w);
const desc = (d, i) => fem(DESC[d] || `descendente em ${d}º grau`, i);
const asc = (d, i) => (ASC[d] ? ASC[d][P[i][3] === 'F' ? 1 : 0] : `ascendente em ${d}º grau`);

let P, PA, SP, PL, byId, names, kids;

function years(s) {
  s = (s || '').replace('Falecido(a)', '').trim();
  if (!s.replace(/-/g, '')) return 'datas desconhecidas';
  const [a, b] = s.split('-');
  return b === undefined ? a : `${a || '?'}–${b || '?'}`;
}
const place = k => (k >= 0 ? PL[k].split(',')[0] : null);
const parents = i => (Array.isArray(PA[i]) ? PA[i] : []);
const spouses = i => (Array.isArray(SP[i]) ? SP[i] : []);

function init() {
  ({ p: P, pa: PA, sp: SP, pl: PL } = window.D);
  byId = new Map(P.map((x, i) => [x[0], i]));
  names = P.map(x => norm(x[1]));
  kids = P.map(() => []);
  PA.forEach((ps, i) => Array.isArray(ps) && ps.forEach(q => kids[q].push(i)));
}

// ---------- busca ----------
function search(q) {
  const toks = norm(q).split(/\s+/).filter(Boolean);
  if (!toks.length || q.trim().length < 3) return [];
  const out = [];
  for (let i = 0; i < names.length && out.length < 400; i++) {
    const n = names[i];
    if (toks.every(t => n.includes(t))) {
      const words = n.split(' ');
      const score = toks.filter(t => words.some(w => w.startsWith(t))).length * 10 - (P[i][6] < 0 ? 3 : 0) - n.length / 100;
      out.push([score, i]);
    }
  }
  return out.sort((a, b) => b[0] - a[0]).slice(0, 8).map(x => x[1]);
}

function who(i) {
  const ps = parents(i);
  if (ps.length) return `${fem('filho', i)} de ${P[ps[0]][1]}`;
  if (P[i][6] < 0 && spouses(i).length) return `${P[i][3] === 'F' ? 'esposa' : 'marido'} de ${P[spouses(i)[0]][1]}`;
  return P[i][6] === 0 ? 'o patriarca' : '';
}

function bindSearch(input, list, onPick) {
  let t;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const r = search(input.value);
      list.innerHTML = r.length
        ? r.map(i => {
            const bits = [years(P[i][2]), place(P[i][4]), who(i)].filter(Boolean).map(esc).join(' · ');
            return `<li><button type="button" data-i="${i}"><strong>${esc(P[i][1])}</strong><small>${bits}</small></button></li>`;
          }).join('')
        : input.value.trim().length >= 3 ? '<li class="empty">Ninguém com esse nome no livro. Tente sem acento ou só o primeiro e o último nome.</li>' : '';
    }, 120);
  });
  list.addEventListener('click', e => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    list.innerHTML = '';
    onPick(+b.dataset.i);
  });
}

// ---------- parentesco ----------
function ancestors(i) {
  const d = new Map([[i, 0]]);
  const q = [i];
  while (q.length) {
    const x = q.shift();
    for (const y of parents(x)) if (!d.has(y)) { d.set(y, d.get(x) + 1); q.push(y); }
  }
  return d;
}

const asDesc = i => (P[i][6] >= 0 ? i : spouses(i).find(s => P[s][6] >= 0) ?? i);

function relation(a, b) {
  const A = asDesc(a), B = asDesc(b);
  const pre = [a, b].filter((x, k) => x !== [A, B][k]).map(x => `${P[x][1]} entrou na família pelo casamento com ${P[asDesc(x)][1]}. `).join('');
  if (A === B) return pre + (a === b ? 'É a mesma pessoa.' : 'São marido e mulher.');
  const da = ancestors(A), db = ancestors(B);
  let best = null;
  for (const [k, x] of da) if (db.has(k) && (!best || x + db.get(k) < best[1] + best[2])) best = [k, x, db.get(k)];
  if (!best) return pre + 'Não achei um parente em comum dentro do livro.';
  const [c, d1, d2] = best;
  const n = P[a][1], m = P[b][1];
  let rel;
  if (d1 === 0) rel = `${n} é ${asc(d2, A)} de ${m}.`;
  else if (d2 === 0) rel = `${n} é ${desc(d1, A)} de ${m}.`;
  else if (d1 === 1 && d2 === 1) rel = `${n} e ${m} são irmãos.`;
  else if (d1 === 1) rel = `${n} é ${fem('tio', A)}${['', '', '', '-avô', '-bisavô', '-trisavô'][d2] ?? ` em ${d2}º grau`} de ${m}.`.replace('tia-avô', 'tia-avó').replace('tia-bisavô', 'tia-bisavó').replace('tia-trisavô', 'tia-trisavó');
  else if (d2 === 1) rel = `${n} é ${fem('sobrinho', A)}${['', '', '', '-neto', '-bisneto', '-trineto'][d1] ?? ` em ${d1}º grau`} de ${m}.`.replace(/(sobrinha-\w+)o /, '$1a ');
  else {
    const g = Math.min(d1, d2) - 1, diff = Math.abs(d1 - d2);
    rel = `${n} e ${m} são primos de ${g}º grau${diff ? `, com ${diff} geração${diff > 1 ? 'ões' : ''} de diferença` : ''}.`;
  }
  const common = d1 && d2 ? ` O parente em comum mais próximo é ${P[c][1]} (${years(P[c][2])}).` : '';
  return pre + rel + common;
}

// ---------- assento ----------
const btn = i => `<button type="button" class="name-btn" data-go="${i}">${esc(P[i][1])}</button>`;

function render(i, compareWith) {
  const box = $('#assento');
  const x = P[i];
  const meta = [years(x[2]), place(x[4]) && `nasceu em ${place(x[4])}`, place(x[5]) && `morreu em ${place(x[5])}`].filter(Boolean);
  const grau = x[6] > 0 ? `${desc(x[6], i)}<br>do Caetano` : x[6] === 0 ? 'o patriarca' : 'da família<br>pelo casamento';
  let html = `<p class="a-grau">${grau}</p><h3>${esc(x[1])}</h3><p class="a-meta">${meta.map(esc).join(' · ')}</p>`;
  if (x[6] < 0) {
    const ss = spouses(i).filter(s => P[s][6] >= 0);
    html += `<p>Não descende do Caetano: entrou na família pelo casamento com ${ss.map(btn).join(' e ') || 'um descendente'}.</p>`;
  } else if (x[6] > 0 && parents(i).length) {
    html += `<p>${fem('Filho', i)} de ${parents(i).map(btn).join(' e ')}.</p>`;
  }

  const ss = spouses(i).filter(s => !(x[6] < 0 && P[s][6] >= 0));
  if (ss.length) html += `<p>${x[3] === 'F' ? 'Casada' : 'Casado'} com ${ss.map(btn).join(', ')}.</p>`;
  const ks = kids[i];
  if (ks.length) html += `<p>${ks.length} ${ks.length > 1 ? 'filhos' : 'filho'} no livro: ${ks.map(btn).join(', ')}.</p>`;

  const d = x[6] >= 0 ? x[6] : null;
  html += '<div class="a-tools">';
  if (d !== null) {
    html += `<p><label for="eu">Eu sou</label><select id="eu">${[1, 2, 3, 4].map(k => `<option value="${k}">${DESC[k]}(a)</option>`).join('')}</select>dessa pessoa.</p>
      <output id="eu-out" for="eu"></output>`;
  }
  html += `<label for="q2">Comparar com outra pessoa</label>
    <input id="q2" type="search" autocomplete="off" placeholder="Nome do primo, da tia, do vizinho…">
    <ul id="r2" class="results"></ul>
    <p id="rel" class="a-rel" aria-live="polite"></p>
    <div class="a-actions">
      <button type="button" class="btn" id="share">Copiar link</button>
      <a class="link" href="https://www.familysearch.org/tree/person/details/${esc(x[0])}" target="_blank" rel="noopener">Ver no FamilySearch</a>
    </div></div>`;

  box.innerHTML = html;
  box.hidden = false;

  const eu = $('#eu');
  if (eu) {
    const upd = () => {
      const t = d + +eu.value;
      $('#eu-out').textContent = d === 0 ? `Então você é ${DESC[+eu.value]}(a) do próprio Caetano.` : `Então você é ${DESC[t] || `descendente em ${t}º grau`}(a) do Cel. Caetano Dantas Correia.`;
    };
    eu.addEventListener('change', upd);
    upd();
  }
  const showRel = j => {
    $('#rel').textContent = relation(i, j);
    history.replaceState(null, '', `#p=${x[0]}&c=${P[j][0]}`);
  };
  bindSearch($('#q2'), $('#r2'), showRel);
  if (compareWith !== undefined) showRel(compareWith);
  $('#share').addEventListener('click', async e => {
    try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copiado'; }
    catch { e.target.textContent = 'Copie o endereço da barra'; }
  });
}

function open(i, compareWith, scroll = true) {
  if (location.hash !== `#p=${P[i][0]}` && compareWith === undefined) history.replaceState(null, '', `#p=${P[i][0]}`);
  render(i, compareWith);
  if (scroll) { const b = $('#assento'); b.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); b.focus({ preventScroll: true }); }
}

function fromHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  const i = byId.get(h.get('p')), c = byId.get(h.get('c'));
  if (i !== undefined) { open(i, c); return true; }
  return false;
}

// ---------- entradas ----------
function reveal() {
  document.querySelectorAll('main > section:not(.hero), .pessoa, .pessoas-head, footer').forEach(g => {
    g.querySelectorAll(':scope h2, :scope h3, :scope p, :scope figure, :scope .poster li, :scope .wall li, :scope details, :scope form').forEach((el, n) => {
      el.classList.add('rv'); el.style.setProperty('--i', n % 6);
    });
  });
  if (!('IntersectionObserver' in window)) return document.querySelectorAll('.rv').forEach(e => e.classList.add('in'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rv').forEach(e => io.observe(e));
}

// ---------- ligar tudo ----------
reveal();
init();
bindSearch($('#q'), $('#resultados'), i => open(i));
document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) open(+go.dataset.go);
});
addEventListener('hashchange', fromHash);
if (!fromHash()) render(byId.get('MMBY-6P8'));
