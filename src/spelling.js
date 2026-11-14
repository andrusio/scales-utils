(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Spelling = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Escritura de notas: en una escala o acorde cada grado usa su propia letra
  // (en F mayor el cuarto grado es Bb, no A#). Las alturas siguen siendo 0-11.
  const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const LETTERS = 'CDEFGAB';
  const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const ACC = { 'bb': -2, 'b': -1, '': 0, '#': 1, '##': 2 };

  const MAJOR_DEGREES = ['1', '2', '3', '4', '5', '6', '7'];
  const MINOR_DEGREES = ['1', '2', 'b3', '4', '5', 'b6', 'b7'];

  function mod(n) { return ((n % 12) + 12) % 12; }

  // '1', 'b3', '#4', 'bb7', '9'... → paso de letra (0-6) y semitonos desde la tónica.
  function parseDegree(d) {
    const m = /^(bb|b|##|#)?(\d+)$/.exec(d);
    if (!m) throw new Error('Grado inválido: ' + d);
    const step = (Number(m[2]) - 1) % 7;
    return { step: step, semis: mod(MAJOR[step] + ACC[m[1] || '']) };
  }

  function degreeSemis(d) { return parseDegree(d).semis; }

  // 'Bb' → {letter: 6, pc: 10}
  function parseNote(name) {
    const letter = LETTERS.indexOf(name[0]);
    if (letter < 0) throw new Error('Nota inválida: ' + name);
    let acc = 0;
    for (const ch of name.slice(1)) acc += ch === '#' ? 1 : ch === 'b' ? -1 : 0;
    return { letter: letter, pc: mod(LETTER_PC[letter] + acc) };
  }

  function pcOf(name) { return parseNote(name).pc; }

  // Nombre de la altura `pc` escrita con la letra `letterIdx`.
  function nameFor(letterIdx, pc) {
    let diff = mod(pc - LETTER_PC[letterIdx]);
    if (diff > 6) diff -= 12;
    return LETTERS[letterIdx] + (diff > 0 ? '#'.repeat(diff) : 'b'.repeat(-diff));
  }

  function spellFrom(rootName, degrees) {
    const r = parseNote(rootName);
    return degrees.map(function (d) {
      const p = parseDegree(d);
      return nameFor((r.letter + p.step) % 7, r.pc + p.semis);
    });
  }

  function weight(names) {
    return names.reduce(function (a, n) { return a + n.length - 1; }, 0);
  }

  // Elige entre escribir la tónica con # o con b según cuál da menos alteraciones
  // (empate: sostenidos). Ej.: A# mayor → Bb mayor, D# menor → D# menor.
  function bestRoot(pc, degrees) {
    const p = mod(pc);
    const cands = SHARPS[p] === FLATS[p] ? [SHARPS[p]] : [SHARPS[p], FLATS[p]];
    let best = cands[0];
    let bestW = weight(spellFrom(best, degrees));
    for (let i = 1; i < cands.length; i++) {
      const w = weight(spellFrom(cands[i], degrees));
      if (w < bestW) { best = cands[i]; bestW = w; }
    }
    return best;
  }

  function spell(pc, degrees) {
    const root = bestRoot(pc, degrees);
    return { root: root, notes: spellFrom(root, degrees) };
  }

  function keyName(pc, quality) {
    return bestRoot(pc, quality === 'minor' ? MINOR_DEGREES : MAJOR_DEGREES);
  }

  // Otra forma de escribir la misma nota (C# ↔ Db, E# → F), o null si no hay.
  function enharmonic(name) {
    const pc = pcOf(name);
    const alt = name === SHARPS[pc] ? FLATS[pc] : SHARPS[pc];
    return alt === name ? null : alt;
  }

  return {
    SHARPS: SHARPS, FLATS: FLATS, MAJOR_DEGREES: MAJOR_DEGREES, MINOR_DEGREES: MINOR_DEGREES,
    degreeSemis: degreeSemis, pcOf: pcOf, nameFor: nameFor, spellFrom: spellFrom,
    bestRoot: bestRoot, spell: spell, keyName: keyName, enharmonic: enharmonic,
  };
});
