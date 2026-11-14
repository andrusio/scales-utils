const test = require('node:test');
const assert = require('node:assert/strict');
const K = require('../src/chords.js');

const pc = (n) => K.NAMES.indexOf(n);
const pcs = (s) => s.split(' ').map(pc);
const id = (notes, bass) => K.identify(pcs(notes), pc(bass || notes.split(' ')[0]));

test('C E G → C mayor con tónica, tercera mayor y quinta justa', () => {
  const r = id('C E G');
  const main = r.exact[0];
  assert.equal(main.label, 'C');
  assert.equal(main.typeName, 'Mayor');
  assert.deepEqual(main.tones.map((t) => [K.NAMES[t.pc], t.interval]), [
    ['C', 'Tónica'], ['E', 'Tercera mayor'], ['G', 'Quinta justa'],
  ]);
  assert.equal(main.inversion, null);
});

test('notas repetidas en varias octavas cuentan una vez', () => {
  const r = K.identify(pcs('C E G C E'), pc('C'));
  assert.equal(r.exact[0].label, 'C');
});

test('inversiones según el bajo', () => {
  assert.equal(id('E G C').exact[0].label, 'C/E');
  assert.equal(id('E G C').exact[0].inversion, '1ª inversión (tercera en el bajo)');
  assert.equal(id('G C E').exact[0].label, 'C/G');
  assert.equal(id('G C E').exact[0].inversion, '2ª inversión (quinta en el bajo)');
});

test('menor, disminuido y aumentado', () => {
  assert.equal(id('A C E').exact[0].label, 'Am');
  assert.equal(id('B D F').exact[0].label, 'B°');
  assert.equal(id('C E G#').exact[0].label, 'C+');
});

test('cuatriadas', () => {
  assert.equal(id('G B D F').exact[0].label, 'G7');
  assert.equal(id('C E G B').exact[0].label, 'Cmaj7');
  assert.equal(id('D F A C').exact[0].label, 'Dm7');
  assert.equal(id('B D F A').exact[0].label, 'Bm7b5');
  const m7b5 = id('B D F A').exact[0];
  assert.deepEqual(m7b5.tones.map((t) => t.interval), ['Tónica', 'Tercera menor', 'Quinta disminuida', 'Séptima menor']);
});

test('C6 y Am7 tienen las mismas notas: decide el bajo', () => {
  const withC = id('C E G A', 'C');
  assert.equal(withC.exact[0].label, 'C6');
  assert.ok(withC.exact.some((r) => r.label === 'Am7/C'));
  const withA = id('A C E G', 'A');
  assert.equal(withA.exact[0].label, 'Am7');
  assert.ok(withA.exact.some((r) => r.label === 'C6/A'));
});

test('una tríada completa no ofrece lecturas sin quinta', () => {
  assert.deepEqual(id('A C E').exact.map((r) => r.label), ['Am']);
});

test('séptima sin quinta', () => {
  const r = id('C E A#');
  assert.equal(r.exact[0].label, 'C7');
  assert.equal(r.exact[0].noFifth, true);
  const fifth = r.exact[0].tones.find((t) => t.degree === '5');
  assert.equal(fifth.omitted, true);
});

test('dos notas: intervalo y acordes posibles', () => {
  const r = id('C E');
  assert.equal(r.interval, 'Tercera mayor');
  assert.deepEqual(r.exact, []);
  assert.ok(r.partial.some((p) => p.label === 'C' && K.NAMES[p.missing[0]] === 'G'));
  const power = id('E B');
  assert.equal(power.exact[0].label, 'E5');
  assert.equal(power.interval, 'Quinta justa');
});

test('una nota sola no forma acorde', () => {
  const r = id('C');
  assert.deepEqual(r.exact, []);
  assert.deepEqual(r.partial, []);
});

test('sin notas → null', () => {
  assert.equal(K.identify([], 0), null);
});

test('calidad para el círculo de quintas', () => {
  assert.equal(id('G B D F').exact[0].triad, 'major');
  assert.equal(id('D F A C').exact[0].triad, 'minor');
  assert.equal(id('B D F A').exact[0].triad, 'dim');
  assert.equal(id('C F G').exact[0].triad, null); // Csus4
});

test('alturas de las cuerdas al aire (afinación estándar)', () => {
  assert.deepEqual(K.openPitches(['E', 'A', 'D', 'G', 'B', 'E']), [4, 9, 14, 19, 23, 28]);
});

test('nombres bien escritos', () => {
  const bb = id('A# D F');
  assert.equal(bb.exact[0].label, 'Bb');
  assert.deepEqual(bb.exact[0].tones.map((t) => t.name), ['Bb', 'D', 'F']);
  assert.equal(id('D F# A C#').exact[0].label, 'Dmaj7');
  assert.equal(id('D# G A#').exact[0].label, 'Eb');
  assert.equal(id('G A# D', 'G').exact[0].label, 'Gm');
  assert.deepEqual(id('G A# D', 'G').exact[0].tones.map((t) => t.name), ['G', 'Bb', 'D']);
});

test('chordInfo arma la etiqueta con bajo', () => {
  assert.equal(K.chordInfo(0, 'maj', 4).label, 'C/E');
  assert.equal(K.chordInfo(10, 'm7').label, 'Bbm7');
});

test('qué escala tocar sobre cada acorde', () => {
  const C = 0;
  assert.equal(K.chordScale(7, '7', C).scale, 'Mixolidio');
  assert.equal(K.chordScale(7, '7', C).numeral, 'V');
  assert.equal(K.chordScale(2, 'm7', C).scale, 'Dórico');
  assert.equal(K.chordScale(4, 'min', C).scale, 'Frigio');
  assert.equal(K.chordScale(5, 'maj7', C).scale, 'Lidio');
  assert.equal(K.chordScale(11, 'm7b5', C).scale, 'Locrio');
  // fuera de la tonalidad: según el tipo
  const out = K.chordScale(10, '7', C);
  assert.equal(out.diatonic, false);
  assert.equal(out.scale, 'Mixolidio');
  assert.equal(K.chordScale(0, '7', C).diatonic, false); // C7 no es diatónico en C
  assert.equal(K.chordScale(9, 'min', null).scale, 'Dórico');
});

test('alturas para escuchar un acorde', () => {
  assert.deepEqual(K.chordPitches(0, 'maj', null, 48), [48, 52, 55]);
  assert.deepEqual(K.chordPitches(0, 'maj', 4, 48), [40, 48, 52, 55]);
});
