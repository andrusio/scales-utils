const test = require('node:test');
const assert = require('node:assert');
const {
  NOTES, noteIndex, SCALES, generateScale,
  findScales, MAX_RESULTS,
  modesForScale, MODE_NAMES,
  DEFAULT_CONFIG, MIN_FRETS, MAX_FRETS,
  noteAtPosition, renderOrder, validateConfig, serializeConfig, parseConfig,
} = require('../src/scales.js');

const mayor = SCALES.find(s => s.name === 'Mayor');
const naturalMenor = SCALES.find(s => s.name === 'Natural Menor');
const pentaMenor = SCALES.find(s => s.name === 'Pentatónica Menor');
const enigma = SCALES.find(s => s.name === 'Enigmática');

test('NOTES son los 12 sostenidos', () => {
  assert.deepStrictEqual(NOTES, ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']);
});

test('noteIndex devuelve -1 para nota inválida', () => {
  assert.strictEqual(noteIndex('C'), 0);
  assert.strictEqual(noteIndex('B'), 11);
  assert.strictEqual(noteIndex('H'), -1);
});

test('generateScale C Mayor', () => {
  assert.deepStrictEqual(generateScale('C', mayor), ['C','D','E','F','G','A','B']);
});

test('generateScale C# Natural Menor (del README)', () => {
  assert.deepStrictEqual(generateScale('C#', naturalMenor), ['C#','D#','E','F#','G#','A','B']);
});

test('generateScale D Pentatónica Menor tiene 5 notas', () => {
  assert.deepStrictEqual(generateScale('D', pentaMenor), ['D','F','G','A','C']);
});

test('generateScale F# Enigmática (del README)', () => {
  assert.deepStrictEqual(generateScale('F#', enigma), ['F#','G','A#','C','D','E','F']);
});

test('generateScale da la vuelta al llegar a B', () => {
  assert.deepStrictEqual(generateScale('A', mayor), ['A','B','C#','D','E','F#','G#']);
});

test('README: C,D,E,F,G encuentra C Mayor 5/7, similitud 100, sin faltantes', () => {
  const r = findScales(['C', 'D', 'E', 'F', 'G']);
  const cMayor = r.find(x => x.root === 'C' && x.name === 'Mayor');
  assert.ok(cMayor);
  assert.strictEqual(cMayor.matched, 5);
  assert.strictEqual(cMayor.total, 7);
  assert.strictEqual(cMayor.coincidencePercent, 71);
  assert.strictEqual(Math.round(cMayor.similarity), 100);
  assert.deepStrictEqual(cMayor.missing, []);
});

test('solo devuelve escalas con al menos una coincidencia', () => {
  const r = findScales(['C']);
  assert.ok(r.length > 0);
  for (const m of r) assert.ok(m.notes.includes('C'));
});

test('desempata por porcentaje de coincidencias, no por conteo crudo (paridad Go)', () => {
  const r = findScales(['D', 'F', 'G']);
  const dPenta = r.find(x => x.root === 'D' && x.name === 'Pentatónica Menor');
  const fMayor = r.find(x => x.root === 'F' && x.name === 'Mayor');
  assert.strictEqual(dPenta.matched, 3);
  assert.strictEqual(dPenta.coincidencePercent, 60); // 3*100/5
  assert.strictEqual(fMayor.matched, 3);
  assert.strictEqual(fMayor.coincidencePercent, 42); // 3*100/7 truncado
  assert.ok(r.indexOf(dPenta) < r.indexOf(fMayor));
});

test('recorta a MAX_RESULTS', () => {
  const r = findScales(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  assert.strictEqual(MAX_RESULTS, 10);
  assert.ok(r.length <= MAX_RESULTS);
});

test('Review Focus: selección con repetidas cuenta una vez', () => {
  assert.deepStrictEqual(findScales(['C', 'C', 'C']), findScales(['C']));
});

test('Review Focus: selección vacía no rompe', () => {
  assert.deepStrictEqual(findScales([]), []);
});

test('Review Focus: las 12 notas no producen NaN', () => {
  const r = findScales(NOTES);
  assert.ok(r.length > 0);
  for (const m of r) {
    assert.ok(Number.isFinite(m.similarity));
    assert.ok(Number.isFinite(m.coincidencePercent));
  }
});

test('C Mayor -> tónicas C D E F G A B y padre C Jónico', () => {
  const m = modesForScale('C', 'Mayor');
  assert.deepStrictEqual(m.map(x => x.tonic), ['C','D','E','F','G','A','B']);
  assert.deepStrictEqual(m.map(x => x.name), MODE_NAMES);
  assert.deepStrictEqual(m.map(x => x.isParent), [true,false,false,false,false,false,false]);
});

test('A Natural Menor -> mismas tónicas y padre A Eólico', () => {
  const m = modesForScale('A', 'Natural Menor');
  assert.deepStrictEqual(m.map(x => x.tonic), ['C','D','E','F','G','A','B']);
  assert.strictEqual(m[5].name, 'Eólico');
  assert.strictEqual(m[5].isParent, true);
  assert.strictEqual(m.filter(x => x.isParent).length, 1);
});

test('escala no diatónica -> null', () => {
  assert.strictEqual(modesForScale('C', 'Pentatónica Mayor'), null);
});

test('DEFAULT_CONFIG estándar', () => {
  assert.deepStrictEqual(DEFAULT_CONFIG.tuning, ['E','A','D','G','B','E']);
  assert.strictEqual(DEFAULT_CONFIG.frets, 15);
  assert.strictEqual(DEFAULT_CONFIG.version, 1);
});

test('noteAtPosition en afinación estándar', () => {
  const t = DEFAULT_CONFIG.tuning;
  assert.strictEqual(noteAtPosition(t, 0, 0), 'E');
  assert.strictEqual(noteAtPosition(t, 0, 1), 'F');
  assert.strictEqual(noteAtPosition(t, 5, 0), 'E'); // cuerda aguda
  assert.strictEqual(noteAtPosition(t, 0, 12), 'E'); // da la vuelta
});

test('renderOrder pone la cuerda aguda arriba', () => {
  const r = renderOrder(DEFAULT_CONFIG.tuning);
  assert.strictEqual(r[0].tuningIndex, 5);
  assert.strictEqual(r[0].note, 'E');
  assert.strictEqual(r[r.length - 1].tuningIndex, 0);
});

test('round-trip serialize/parse', () => {
  const p = parseConfig(serializeConfig(DEFAULT_CONFIG));
  assert.strictEqual(p.ok, true);
  assert.deepStrictEqual(p.config, DEFAULT_CONFIG);
});

test('Review Focus: JSON inválido se rechaza sin romper', () => {
  const p = parseConfig('{no soy json');
  assert.strictEqual(p.ok, false);
  assert.ok(p.errors.length > 0);
});

test('Review Focus: afinación vacía o con nota inexistente', () => {
  assert.strictEqual(validateConfig({ version: 1, tuning: [], frets: 15 }).ok, false);
  assert.strictEqual(validateConfig({ version: 1, tuning: ['H'], frets: 15 }).ok, false);
});

test('Review Focus: trastes fuera de rango', () => {
  assert.strictEqual(validateConfig({ version: 1, tuning: ['E'], frets: MIN_FRETS - 1 }).ok, false);
  assert.strictEqual(validateConfig({ version: 1, tuning: ['E'], frets: MAX_FRETS + 1 }).ok, false);
  assert.strictEqual(validateConfig({ version: 1, tuning: ['E'], frets: 12 }).ok, true);
});
