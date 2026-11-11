(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CircleCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Notas como número de semitonos (0 = C ... 11 = B). Se escriben con sostenidos;
  // FLAT_ALIAS da la enarmonía con bemol para las 5 notas que la tienen.
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT_ALIAS = { 1: 'Db', 3: 'Eb', 6: 'Gb', 8: 'Ab', 10: 'Bb' };

  function mod(n, m) {
    const k = m === undefined ? 12 : m;
    return ((n % k) + k) % k;
  }

  // Posición de una nota en el círculo de quintas: C=0, G=1, D=2, A=3, E=4...
  // Subir una posición = subir 7 semitonos (una quinta). 7 es su propio inverso mod 12.
  function positionOf(pc) { return mod(pc * 7); }
  function pcAt(pos) { return mod(pos * 7); }

  function relativeMinor(pc) { return mod(pc + 9); }
  function relativeMajor(pc) { return mod(pc + 3); }

  // Tonalidad mayor (centro del círculo) que corresponde a una raíz mayor o menor.
  function keyCenterOf(rootPc, quality) {
    return quality === 'minor' ? relativeMajor(rootPc) : mod(rootPc);
  }

  // ---- Modos ----
  // `fifths`: cuántas posiciones hay que moverse en el círculo desde la raíz para
  // llegar a la escala mayor con las mismas notas (+1 = una quinta a la derecha).
  // `degree/degOffset/adj`: el "papelito": grado de la escala mayor de la raíz y
  // ajuste de medio tono (+1 / -1) que da la misma nota.
  const MODES = [
    { name: 'Lidio',     fifths:  1, degree: 'V',   degOffset: 7, adj:  0 },
    { name: 'Jónico',    fifths:  0, degree: 'I',   degOffset: 0, adj:  0 },
    { name: 'Mixolidio', fifths: -1, degree: 'IV',  degOffset: 5, adj:  0 },
    { name: 'Dórico',    fifths: -2, degree: 'vi',  degOffset: 9, adj:  1 },
    { name: 'Eólico',    fifths: -3, degree: 'iii', degOffset: 4, adj: -1 },
    { name: 'Frigio',    fifths: -4, degree: 'V',   degOffset: 7, adj:  1 },
    { name: 'Locrio',    fifths: -5, degree: 'I',   degOffset: 0, adj:  1 },
  ];

  // Para una raíz, cada modo con su escala mayor "padre" (la que tiene las mismas notas).
  function modesOfRoot(rootPc) {
    return MODES.map(function (m) {
      const parent = mod(rootPc + 7 * m.fifths);
      return {
        name: m.name,
        parent: parent,
        parentPos: positionOf(parent),
        hint: {
          degree: m.degree,
          degreePc: mod(rootPc + m.degOffset),
          adj: m.adj,
        },
      };
    });
  }

  // ---- Grados diatónicos ----
  // `minorNumeral`: el grado si se toma como tónica la relativa menor (números rosas).
  // `fn`: función armónica: T tónica, SD subdominante, D dominante.
  const DEGREES = [
    { numeral: 'I',    offset: 0,  quality: 'major', fn: 'T',  minorNumeral: 'III' },
    { numeral: 'ii',   offset: 2,  quality: 'minor', fn: 'SD', minorNumeral: 'iv' },
    { numeral: 'iii',  offset: 4,  quality: 'minor', fn: 'T',  minorNumeral: 'v' },
    { numeral: 'IV',   offset: 5,  quality: 'major', fn: 'SD', minorNumeral: 'VI' },
    { numeral: 'V',    offset: 7,  quality: 'major', fn: 'D',  minorNumeral: 'VII' },
    { numeral: 'vi',   offset: 9,  quality: 'minor', fn: 'T',  minorNumeral: 'i' },
    { numeral: 'vii°', offset: 11, quality: 'dim',   fn: 'D',  minorNumeral: 'ii°' },
  ];

  function chordLabel(chord) {
    const suffix = chord.quality === 'minor' ? 'm' : chord.quality === 'dim' ? '°' : '';
    return NAMES[chord.root] + suffix;
  }

  // Misma etiqueta con bemol, o null si la nota no tiene enarmonía.
  function chordAliasLabel(chord) {
    const alias = FLAT_ALIAS[chord.root];
    if (!alias) return null;
    const suffix = chord.quality === 'minor' ? 'm' : chord.quality === 'dim' ? '°' : '';
    return alias + suffix;
  }

  function sameChord(a, b) {
    return a.root === b.root && a.quality === b.quality;
  }

  // Grado del acorde en la tonalidad mayor `key`, o null si no es diatónico.
  function degreeOfChord(chord, key) {
    for (const d of DEGREES) {
      if (mod(key + d.offset) === chord.root && d.quality === chord.quality) return d;
    }
    return null;
  }

  // Ordena las 12 tonalidades mayores según cuántos de los acordes contienen
  // (y, a igual cantidad, prefiere las que tienen al primer acorde como tónica).
  function rankKeys(chords) {
    if (chords.length === 0) return [];
    const list = [];
    for (let key = 0; key < 12; key++) {
      const degrees = chords.map(function (c) { return degreeOfChord(c, key); });
      const fit = degrees.filter(Boolean).length;
      let score = fit * 100;
      const first = degrees[0];
      if (first && first.numeral === 'I') score += 10;
      else if (first && first.numeral === 'vi') score += 9;
      for (const d of degrees) {
        if (d && ['I', 'IV', 'V', 'vi'].indexOf(d.numeral) >= 0) score += 1;
      }
      list.push({ key: key, degrees: degrees, fit: fit, score: score, complete: fit === chords.length });
    }
    list.sort(function (a, b) { return b.score - a.score || a.key - b.key; });
    return list;
  }

  // Raíz sugerida para una tonalidad: si el primer acorde es el vi (menor), la raíz
  // es ese acorde menor; si no, la propia tonalidad mayor.
  function rootForKey(key, firstChord) {
    if (firstChord) {
      const d = degreeOfChord(firstChord, key);
      if (d && d.numeral === 'vi') return { root: firstChord.root, quality: 'minor' };
    }
    return { root: key, quality: 'major' };
  }

  // Resumen para la interfaz: mejor tonalidad, alternativas igual de buenas y
  // acordes que no pertenecen a la mejor.
  function suggestFromChords(chords) {
    const ranking = rankKeys(chords);
    if (ranking.length === 0) return null;
    const best = ranking[0];
    const candidates = ranking.filter(function (r) { return r.fit === best.fit; });
    const outside = chords.filter(function (_, i) { return best.degrees[i] === null; });
    const r = rootForKey(best.key, chords[0]);
    return {
      center: best.key,
      root: r.root,
      quality: r.quality,
      candidates: candidates,
      outside: outside,
      complete: best.complete,
    };
  }

  return {
    NAMES: NAMES, FLAT_ALIAS: FLAT_ALIAS, mod: mod,
    positionOf: positionOf, pcAt: pcAt,
    relativeMinor: relativeMinor, relativeMajor: relativeMajor, keyCenterOf: keyCenterOf,
    MODES: MODES, modesOfRoot: modesOfRoot,
    DEGREES: DEGREES, chordLabel: chordLabel, chordAliasLabel: chordAliasLabel,
    sameChord: sameChord, degreeOfChord: degreeOfChord,
    rankKeys: rankKeys, rootForKey: rootForKey, suggestFromChords: suggestFromChords,
  };
});
