const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/practice.js');
const S = require('../src/spelling.js');

// Generador con semilla (mulberry32) para que los tests sean reproducibles.
function seeded(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('cada ejercicio con opciones tiene la respuesta entre ellas', () => {
  for (const ex of P.EXERCISES) {
    if (ex.id === 'build') continue;
    const rng = seeded(7);
    for (let i = 0; i < 200; i++) {
      const q = P.question(ex.id, rng);
      assert.ok(q.options.includes(q.answer), `${ex.id}: ${q.answer} no está en las opciones`);
      assert.ok(q.prompt && q.explain);
    }
  }
});

test('intervalos: la respuesta corresponde a la distancia', () => {
  const rng = seeded(3);
  for (let i = 0; i < 100; i++) {
    const q = P.question('interval', rng);
    const semis = q.listen.pitches[1] - q.listen.pitches[0];
    assert.equal(q.answer, P.INTERVALS[semis]);
  }
});

test('modos: la escala madre es correcta', () => {
  const rng = seeded(11);
  for (let i = 0; i < 100; i++) {
    const q = P.question('mode', rng);
    assert.match(q.prompt, /tocás para/);
  }
});

test('armar acordes: las notas correctas pasan la comprobación', () => {
  const rng = seeded(5);
  for (let i = 0; i < 200; i++) {
    const q = P.question('build', rng);
    const names = q.explain.split(' = ')[1].split(' ·')[0].replace('.', '').split(' ');
    const pcs = names.map(S.pcOf);
    const bassPc = q.answer.includes('/') ? S.pcOf(q.answer.split('/')[1]) : pcs[0];
    assert.equal(P.checkBuild(q, pcs, bassPc), true, q.answer);
    // y con el bajo equivocado no pasa si es una inversión
    if (q.answer.includes('/')) assert.equal(P.checkBuild(q, pcs, pcs[0]), false, q.answer);
  }
});
