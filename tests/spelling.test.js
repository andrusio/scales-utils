const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../src/spelling.js');

test('escalas mayores: cada letra una vez', () => {
  assert.deepEqual(S.spell(5, S.MAJOR_DEGREES).notes, ['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
  assert.deepEqual(S.spell(10, S.MAJOR_DEGREES).notes, ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A']);
  assert.equal(S.spell(1, S.MAJOR_DEGREES).root, 'Db');
  assert.deepEqual(S.spell(6, S.MAJOR_DEGREES).notes, ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']);
});

test('menores y modos', () => {
  assert.deepEqual(S.spell(0, S.MINOR_DEGREES).notes, ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb']);
  assert.deepEqual(S.spell(9, ['1', '2', 'b3', '4', '5', '6', 'b7']).notes, ['A', 'B', 'C', 'D', 'E', 'F#', 'G']);
  assert.equal(S.keyName(8, 'minor'), 'G#');
  assert.equal(S.keyName(10, 'minor'), 'Bb');
  assert.equal(S.keyName(3, 'minor'), 'D#');
});

test('acordes', () => {
  assert.deepEqual(S.spell(10, ['1', '3', '5']).notes, ['Bb', 'D', 'F']);
  assert.deepEqual(S.spell(0, ['1', 'b3', 'b5', 'bb7']).notes, ['C', 'Eb', 'Gb', 'Bbb']);
});

test('enarmonías y parseo', () => {
  assert.equal(S.enharmonic('E#'), 'F');
  assert.equal(S.enharmonic('C#'), 'Db');
  assert.equal(S.enharmonic('Bb'), 'A#');
  assert.equal(S.enharmonic('C'), null);
  assert.equal(S.pcOf('Bbb'), 9);
  assert.equal(S.degreeSemis('#4'), 6);
  assert.equal(S.degreeSemis('bb7'), 9);
  assert.equal(S.degreeSemis('9'), 2);
});
