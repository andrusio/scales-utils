(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./spelling.js'));
  else root.CircleCore = factory(root.Spelling);
})(typeof self !== 'undefined' ? self : this, function (Spelling) {
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
  // `seventh`: sufijo de la cuatriada del grado (Imaj7, ii7, V7, viiø...).
  const DEGREES = [
    { numeral: 'I',    offset: 0,  quality: 'major', fn: 'T',  minorNumeral: 'III', seventh: 'maj7', seventhType: 'maj7' },
    { numeral: 'ii',   offset: 2,  quality: 'minor', fn: 'SD', minorNumeral: 'iv',  seventh: 'm7',   seventhType: 'm7' },
    { numeral: 'iii',  offset: 4,  quality: 'minor', fn: 'T',  minorNumeral: 'v',   seventh: 'm7',   seventhType: 'm7' },
    { numeral: 'IV',   offset: 5,  quality: 'major', fn: 'SD', minorNumeral: 'VI',  seventh: 'maj7', seventhType: 'maj7' },
    { numeral: 'V',    offset: 7,  quality: 'major', fn: 'D',  minorNumeral: 'VII', seventh: '7',    seventhType: '7' },
    { numeral: 'vi',   offset: 9,  quality: 'minor', fn: 'T',  minorNumeral: 'i',   seventh: 'm7',   seventhType: 'm7' },
    { numeral: 'vii°', offset: 11, quality: 'dim',   fn: 'D',  minorNumeral: 'ii°', seventh: 'm7b5', seventhType: 'm7b5' },
  ];

  const SUFFIX = { major: '', minor: 'm', dim: '°' };
  const TRIAD_DEGREES = { major: ['1', '3', '5'], minor: ['1', 'b3', '5'], dim: ['1', 'b3', 'b5'] };

  // Nombre de una tonalidad o raíz bien escrito (Bb mayor, G# menor).
  function keyName(pc, quality) { return Spelling.keyName(mod(pc), quality); }

  // Nombre del acorde del círculo: mayores y menores como su tonalidad
  // (Bb, G#m), disminuidos según el acorde (A#°, E#°).
  function chordRootName(chord) {
    if (chord.quality === 'dim') return Spelling.bestRoot(chord.root, TRIAD_DEGREES.dim);
    return keyName(chord.root, chord.quality);
  }

  function chordLabel(chord) {
    return chordRootName(chord) + SUFFIX[chord.quality];
  }

  // La misma etiqueta escrita con la otra enarmonía (Bb ↔ A#), o null.
  function chordAliasLabel(chord) {
    const alt = Spelling.enharmonic(chordRootName(chord));
    return alt ? alt + SUFFIX[chord.quality] : null;
  }

  // Los 7 acordes de una tonalidad mayor, escritos en esa tonalidad.
  // Con `sevenths`, las cuatriadas (Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bm7b5).
  function diatonicChords(key, sevenths) {
    const names = Spelling.spell(key, Spelling.MAJOR_DEGREES).notes;
    return DEGREES.map(function (d, i) {
      const suffix = sevenths ? d.seventh : SUFFIX[d.quality];
      return {
        numeral: d.numeral,
        root: mod(key + d.offset),
        quality: d.quality,
        typeId: sevenths ? d.seventhType : { major: 'maj', minor: 'min', dim: 'dim' }[d.quality],
        label: names[i] + suffix,
      };
    });
  }

  // Progresiones típicas, por grados de la tonalidad mayor.
  const PROGRESSIONS = [
    { name: 'Pop', numerals: ['I', 'V', 'vi', 'IV'] },
    { name: 'ii – V – I (jazz)', numerals: ['ii', 'V', 'I'] },
    { name: 'Años 50', numerals: ['I', 'vi', 'IV', 'V'] },
    { name: 'Rock / blues', numerals: ['I', 'IV', 'V'] },
    { name: 'Menor pop', numerals: ['vi', 'IV', 'I', 'V'] },
    { name: 'Canon', numerals: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'] },
    { name: 'Círculo de quintas', numerals: ['vi', 'ii', 'V', 'I'] },
  ];

  function progressionChords(key, numerals, sevenths) {
    const all = diatonicChords(key, sevenths);
    return numerals.map(function (n) {
      return all.filter(function (c) { return c.numeral === n; })[0];
    });
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
    keyName: keyName, diatonicChords: diatonicChords,
    PROGRESSIONS: PROGRESSIONS, progressionChords: progressionChords,
    sameChord: sameChord, degreeOfChord: degreeOfChord,
    rankKeys: rankKeys, rootForKey: rootForKey, suggestFromChords: suggestFromChords,
  };
});
