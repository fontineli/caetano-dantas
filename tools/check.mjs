// Self-check for app.js logic: loads data + app in a fake DOM-less context and asserts known relations.
import fs from 'node:fs'; import vm from 'node:vm';
const ctx = { window: {}, document: { documentElement: { classList: { add() {} } }, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} },
  addEventListener() {}, location: { hash: '' }, history: { replaceState() {} }, matchMedia: () => ({ matches: false }), console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('site/data.js', 'utf8'), ctx);
ctx.D = ctx.window.D;
const src = fs.readFileSync('site/app.js', 'utf8').replace(/\/\/ ---------- entradas[\s\S]*$/, 'init(); globalThis.T={relation,chain,search,paths,byId,P};');
vm.runInContext(src, ctx);
const { relation, chain, search, paths, byId, P } = ctx.T;
const id = x => byId.get(x);
const assert = (c, m) => { if (!c) { console.error('FAIL', m); process.exitCode = 1; } else console.log('ok', m); };
assert(relation(id('LCRT-GPM'), id('K2NY-948')).includes('irmãos'), 'Micaela e Simplício são irmãos');
assert(relation(id('LQ52-8X9'), id('GHNX-7WG')).includes('tetravô'), 'Caetano é tetravô de Dom José Adelino');
assert(relation(id('GHNX-7WG'), id('MMBY-6P8')).includes('primos de 4º grau'), relation(id('GHNX-7WG'), id('MMBY-6P8')));
assert(chain(id('GHNX-7WG')).length === 6, 'cadeia de Dom José tem 6 elos');
assert(search('jose adelino dantas').includes(id('GHNX-7WG')), 'busca sem acento acha Dom José');
assert(relation(id('LQ5T-WKM'), id('LCRT-GPM')).includes('casamento'), 'Josefa (cônjuge) é tratada pelo casamento');
let multi = 0; for (let i = 0; i < P.length; i++) if (paths[i] > 1) multi++;
console.log('pessoas com mais de um caminho:', multi, 'máx', Math.max(...paths));
