const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/circle.js');

const pc = (name) => C.NAMES.indexOf(name);
const names = (arr) => arr.map((n) => C.NAMES[n]);

test('posiciones del círculo: C G D A E B F# ...', () => {
  const order = [];
  for (let p = 0; p < 12; p++) order.push(C.NAMES[C.pcAt(p)]);
  assert.deepEqual(order, ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F']);
  for (let n = 0; n < 12; n++) assert.equal(C.pcAt(C.positionOf(n)), n);
});

test('modos de A: escala mayor padre', () => {
  const parents = {};
  for (const m of C.modesOfRoot(pc('A'))) parents[m.name] = C.NAMES[m.parent];
  assert.deepEqual(parents, {
    Lidio: 'E', Jónico: 'A', Mixolidio: 'D', Dórico: 'G',
    Eólico: 'C', Frigio: 'F', Locrio: 'A#',
  });
});

test('modos de F# (raíz menor): eólico es su relativa mayor', () => {
  const parents = {};
  for (const m of C.modesOfRoot(pc('F#'))) parents[m.name] = C.NAMES[m.parent];
  assert.equal(parents['Eólico'], 'A');
  assert.equal(parents['Dórico'], 'E');
  assert.equal(parents['Frigio'], 'D');
  assert.equal(parents['Lidio'], 'C#');
  assert.equal(parents['Mixolidio'], 'B');
  assert.equal(parents['Locrio'], 'G');
});

test('cada modo contiene exactamente las notas de su escala mayor padre', () => {
  const major = [0, 2, 4, 5, 7, 9, 11];
  const offsets = { Jónico: 0, Dórico: 2, Frigio: 4, Lidio: 5, Mixolidio: 7, Eólico: 9, Locrio: 11 };
  for (let root = 0; root < 12; root++) {
    for (const m of C.modesOfRoot(root)) {
      const modeNotes = major.map((i) => C.mod(m.parent + i)).sort((a, b) => a - b);
      // El modo empieza en la raíz y es el grado `offsets[name]` de la mayor
      // cuya tónica es root - offset.
      const ionian = C.mod(root - offsets[m.name]);
      const expected = major.map((i) => C.mod(ionian + i)).sort((a, b) => a - b);
      assert.deepEqual(modeNotes, expected, `${C.NAMES[root]} ${m.name}`);
      assert.ok(modeNotes.includes(root));
    }
  }
});

test('papelitos: grado de la raíz ± medio tono da la escala padre', () => {
  for (let root = 0; root < 12; root++) {
    for (const m of C.modesOfRoot(root)) {
      assert.equal(C.mod(m.hint.degreePc + m.hint.adj), m.parent, `${C.NAMES[root]} ${m.name}`);
    }
  }
  // A frigio: V (E) +½ = F ("mi sostenido")
  const phrygian = C.modesOfRoot(pc('A')).find((m) => m.name === 'Frigio');
  assert.equal(C.NAMES[phrygian.hint.degreePc], 'E');
  assert.equal(phrygian.hint.adj, 1);
});

test('centro del círculo para raíz mayor o menor', () => {
  assert.equal(C.keyCenterOf(pc('A'), 'major'), pc('A'));
  assert.equal(C.keyCenterOf(pc('F#'), 'minor'), pc('A'));
});

test('grados de A mayor: verdes (mayor) y rosas (menor)', () => {
  const A = pc('A');
  const byNumeral = {};
  for (const d of C.DEGREES) byNumeral[d.numeral] = { note: C.NAMES[C.mod(A + d.offset)], minor: d.minorNumeral, fn: d.fn };
  assert.deepEqual(byNumeral['I'], { note: 'A', minor: 'III', fn: 'T' });
  assert.deepEqual(byNumeral['IV'], { note: 'D', minor: 'VI', fn: 'SD' });
  assert.deepEqual(byNumeral['V'], { note: 'E', minor: 'VII', fn: 'D' });
  assert.deepEqual(byNumeral['ii'], { note: 'B', minor: 'iv', fn: 'SD' });
  assert.deepEqual(byNumeral['vi'], { note: 'F#', minor: 'i', fn: 'T' });
  assert.deepEqual(byNumeral['iii'], { note: 'C#', minor: 'v', fn: 'T' });
  assert.deepEqual(byNumeral['vii°'], { note: 'G#', minor: 'ii°', fn: 'D' });
});

test('etiquetas de acordes y enarmonías', () => {
  assert.equal(C.chordLabel({ root: pc('F#'), quality: 'minor' }), 'F#m');
  assert.equal(C.chordLabel({ root: pc('G#'), quality: 'dim' }), 'G#°');
  assert.equal(C.chordAliasLabel({ root: pc('A#'), quality: 'major' }), 'Bb');
  assert.equal(C.chordAliasLabel({ root: pc('A'), quality: 'major' }), null);
});

test('acordes A D E F#m C#m → A mayor / F# menor', () => {
  const chords = [
    { root: pc('A'), quality: 'major' },
    { root: pc('D'), quality: 'major' },
    { root: pc('E'), quality: 'major' },
    { root: pc('F#'), quality: 'minor' },
  ];
  const s = C.suggestFromChords(chords);
  assert.equal(s.center, pc('A'));
  assert.equal(s.complete, true);
  assert.equal(s.candidates.length, 1);
  assert.deepEqual(s.outside, []);
  assert.equal(s.root, pc('A'));
  assert.equal(s.quality, 'major');
});

test('si el primer acorde es menor (vi) la raíz es ese acorde', () => {
  const chords = [
    { root: pc('A'), quality: 'minor' },
    { root: pc('D'), quality: 'minor' },
  ];
  const s = C.suggestFromChords(chords);
  assert.equal(s.center, pc('C')); // Am = vi de C, Dm = ii de C (F: Am=iii, Dm=vi)
  assert.equal(s.root, pc('A'));
  assert.equal(s.quality, 'minor');
  assert.deepEqual(names(s.candidates.map((c) => c.key)).sort(), ['C', 'F']);
});

test('acordes que no entran en ninguna tonalidad quedan marcados como afuera', () => {
  const chords = [
    { root: pc('A'), quality: 'major' },
    { root: pc('D'), quality: 'major' },
    { root: pc('A#'), quality: 'major' },
  ];
  const s = C.suggestFromChords(chords);
  assert.equal(s.complete, false);
  assert.equal(s.center, pc('A'));
  assert.equal(s.outside.length, 1);
  assert.equal(C.chordLabel(s.outside[0]), 'A#');
});

test('sin acordes no hay sugerencia', () => {
  assert.equal(C.suggestFromChords([]), null);
});
