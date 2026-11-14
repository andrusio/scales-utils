(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./spelling.js'));
  else root.ChordsCore = factory(root.Spelling);
})(typeof self !== 'undefined' ? self : this, function (Spelling) {
  'use strict';

  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function mod(n) { return ((n % 12) + 12) % 12; }
  function noteIndex(name) { return NAMES.indexOf(name); }

  // Grados de un acorde: semitonos desde la tónica y nombre del intervalo.
  const DEGREE_SEMIS = {
    '1': 0, '2': 2, 'b3': 3, '3': 4, '4': 5, 'b5': 6, '5': 7, '#5': 8,
    '6': 9, 'bb7': 9, 'b7': 10, '7': 11, '9': 2,
  };
  const DEGREE_NAMES = {
    '1': 'Tónica',
    '2': 'Segunda mayor',
    'b3': 'Tercera menor',
    '3': 'Tercera mayor',
    '4': 'Cuarta justa',
    'b5': 'Quinta disminuida',
    '5': 'Quinta justa',
    '#5': 'Quinta aumentada',
    '6': 'Sexta mayor',
    'bb7': 'Séptima disminuida',
    'b7': 'Séptima menor',
    '7': 'Séptima mayor',
    '9': 'Novena mayor',
  };

  // Intervalo entre dos notas sueltas (de la más grave a la otra).
  const INTERVAL_NAMES = [
    'Unísono / octava', 'Segunda menor', 'Segunda mayor', 'Tercera menor',
    'Tercera mayor', 'Cuarta justa', 'Tritono (cuarta aumentada / quinta disminuida)',
    'Quinta justa', 'Sexta menor', 'Sexta mayor', 'Séptima menor', 'Séptima mayor',
  ];

  // Tipos de acorde, de más simple a más complejo (el orden desempata lecturas).
  // `triad`: con qué acorde del círculo de quintas se ubica (null = no tiene lugar).
  const TYPES = [
    { id: 'maj',   suffix: '',        name: 'Mayor',                 tones: ['1', '3', '5'],             triad: 'major' },
    { id: 'min',   suffix: 'm',       name: 'Menor',                 tones: ['1', 'b3', '5'],            triad: 'minor' },
    { id: 'dim',   suffix: '°',       name: 'Disminuido',            tones: ['1', 'b3', 'b5'],           triad: 'dim' },
    { id: 'aug',   suffix: '+',       name: 'Aumentado',             tones: ['1', '3', '#5'],            triad: null },
    { id: 'sus4',  suffix: 'sus4',    name: 'Suspendido de cuarta',  tones: ['1', '4', '5'],             triad: null },
    { id: 'sus2',  suffix: 'sus2',    name: 'Suspendido de segunda', tones: ['1', '2', '5'],             triad: null },
    { id: '5',     suffix: '5',       name: 'Quinta (power chord)',  tones: ['1', '5'],                  triad: null },
    { id: '7',     suffix: '7',       name: 'Séptima dominante',     tones: ['1', '3', '5', 'b7'],       triad: 'major' },
    { id: 'maj7',  suffix: 'maj7',    name: 'Séptima mayor',         tones: ['1', '3', '5', '7'],        triad: 'major' },
    { id: 'm7',    suffix: 'm7',      name: 'Menor séptima',         tones: ['1', 'b3', '5', 'b7'],      triad: 'minor' },
    { id: 'm7b5',  suffix: 'm7b5',    name: 'Semidisminuido',        tones: ['1', 'b3', 'b5', 'b7'],     triad: 'dim' },
    { id: 'dim7',  suffix: '°7',      name: 'Disminuido séptima',    tones: ['1', 'b3', 'b5', 'bb7'],    triad: 'dim' },
    { id: 'mmaj7', suffix: 'm(maj7)', name: 'Menor séptima mayor',   tones: ['1', 'b3', '5', '7'],       triad: 'minor' },
    { id: '6',     suffix: '6',       name: 'Sexta',                 tones: ['1', '3', '5', '6'],        triad: 'major' },
    { id: 'm6',    suffix: 'm6',      name: 'Menor sexta',           tones: ['1', 'b3', '5', '6'],       triad: 'minor' },
    { id: 'add9',  suffix: 'add9',    name: 'Mayor con novena',      tones: ['1', '3', '5', '9'],        triad: 'major' },
    { id: 'madd9', suffix: 'm(add9)', name: 'Menor con novena',      tones: ['1', 'b3', '5', '9'],       triad: 'minor' },
    { id: '7sus4', suffix: '7sus4',   name: 'Séptima suspendida',    tones: ['1', '4', '5', 'b7'],       triad: null },
    { id: '7#5',   suffix: '7#5',     name: 'Séptima aumentada',     tones: ['1', '3', '#5', 'b7'],      triad: null },
    { id: '9',     suffix: '9',       name: 'Novena dominante',      tones: ['1', '3', '5', 'b7', '9'],  triad: 'major' },
    { id: 'maj9',  suffix: 'maj9',    name: 'Novena mayor',          tones: ['1', '3', '5', '7', '9'],   triad: 'major' },
    { id: 'm9',    suffix: 'm9',      name: 'Menor novena',          tones: ['1', 'b3', '5', 'b7', '9'], triad: 'minor' },
  ];

  // Variantes a comparar: cada tipo completo y, en los de 4 o más notas, la
  // versión sin quinta justa (muy común en la guitarra).
  const VARIANTS = [];
  TYPES.forEach(function (type, i) {
    VARIANTS.push({ type: type, omitted: [], rank: i });
    if (type.tones.length >= 4 && type.tones.indexOf('5') >= 0) {
      VARIANTS.push({ type: type, omitted: ['5'], rank: 100 + i });
    }
  });

  function variantPcs(root, variant) {
    return variant.type.tones
      .filter(function (d) { return variant.omitted.indexOf(d) < 0; })
      .map(function (d) { return mod(root + DEGREE_SEMIS[d]); });
  }

  function inversionText(bassDegree) {
    if (!bassDegree || bassDegree === '1') return null;
    if (bassDegree === '3' || bassDegree === 'b3') return '1ª inversión (tercera en el bajo)';
    if (bassDegree === '5' || bassDegree === 'b5' || bassDegree === '#5') return '2ª inversión (quinta en el bajo)';
    if (bassDegree === 'b7' || bassDegree === '7' || bassDegree === 'bb7') return '3ª inversión (séptima en el bajo)';
    return 'Con ' + DEGREE_NAMES[bassDegree].toLowerCase() + ' en el bajo';
  }

  // Una "lectura" del acorde: tónica + tipo, con cada nota y su intervalo.
  // Los nombres se escriben según el acorde (Bb D F, no A# D F).
  function makeReading(root, variant, bassPc, missing) {
    const miss = missing || [];
    const sp = Spelling.spell(root, variant.type.tones);
    const tones = variant.type.tones.map(function (d, i) {
      const omitted = variant.omitted.indexOf(d) >= 0;
      const isMissing = miss.indexOf(d) >= 0;
      return {
        degree: d,
        pc: mod(root + DEGREE_SEMIS[d]),
        name: sp.notes[i],
        interval: DEGREE_NAMES[d],
        present: !omitted && !isMissing,
        omitted: omitted,
        missing: isMissing,
      };
    });
    const bassTone = tones.filter(function (t) { return t.present && t.pc === bassPc; })[0];
    const base = sp.root + variant.type.suffix;
    const bassName = bassTone ? bassTone.name : Spelling.SHARPS[bassPc];
    return {
      root: root,
      rootName: sp.root,
      typeId: variant.type.id,
      typeName: variant.type.name,
      suffix: variant.type.suffix,
      triad: variant.type.triad,
      baseLabel: base,
      label: bassPc !== root ? base + '/' + bassName : base,
      bass: bassPc,
      inversion: inversionText(bassTone ? bassTone.degree : null),
      tones: tones,
      noFifth: variant.omitted.length > 0,
      missing: miss.map(function (d) { return mod(root + DEGREE_SEMIS[d]); }),
      missingNames: tones.filter(function (t) { return t.missing; }).map(function (t) { return t.name; }),
      rank: variant.rank,
    };
  }

  function byPreference(bassPc) {
    return function (a, b) {
      const ra = a.root === bassPc ? 0 : 1;
      const rb = b.root === bassPc ? 0 : 1;
      return ra - rb || a.rank - b.rank || a.root - b.root;
    };
  }

  // Identifica el acorde formado por las notas `pcs` (números 0-11), con `bassPc`
  // como nota más grave. Devuelve null si no hay notas.
  //  - exact: lecturas cuyas notas coinciden exactamente (la primera es la sugerida).
  //  - partial: si no hay exactas, acordes a los que les falta una sola nota.
  //  - interval: con dos notas, el intervalo desde el bajo.
  function identify(pcs, bassPc) {
    const set = [];
    pcs.forEach(function (p) { const n = mod(p); if (set.indexOf(n) < 0) set.push(n); });
    if (set.length === 0) return null;
    const bass = set.indexOf(mod(bassPc)) >= 0 ? mod(bassPc) : set[0];
    const notes = set.slice().sort(function (a, b) { return mod(a - bass) - mod(b - bass); });

    const exact = [];
    const partial = [];
    for (const root of notes) {
      for (const v of VARIANTS) {
        const vp = variantPcs(root, v);
        const covers = notes.every(function (n) { return vp.indexOf(n) >= 0; });
        if (!covers) continue;
        if (vp.length === notes.length) {
          exact.push(makeReading(root, v, bass));
        } else if (v.omitted.length === 0 && vp.length === notes.length + 1 && notes.length >= 2) {
          const missing = v.type.tones.filter(function (d) {
            return notes.indexOf(mod(root + DEGREE_SEMIS[d])) < 0;
          });
          partial.push(makeReading(root, v, bass, missing));
        }
      }
    }
    exact.sort(byPreference(bass));
    partial.sort(byPreference(bass));
    // Las lecturas "sin quinta" solo se ofrecen si no hay ninguna completa
    // (A C E es Am, no un C6 sin quinta).
    const complete = exact.filter(function (r) { return !r.noFifth; });

    return {
      notes: notes,
      bass: bass,
      interval: notes.length === 2 ? INTERVAL_NAMES[mod(notes[1] - notes[0])] : null,
      exact: complete.length ? complete : exact,
      partial: exact.length ? [] : partial.slice(0, 5),
    };
  }

  // Altura absoluta (en semitonos) de cada cuerda al aire, asumiendo que cada
  // cuerda suena más aguda que la anterior (afinaciones de guitarra y bajo).
  function openPitches(tuning) {
    const out = [];
    tuning.forEach(function (name, i) {
      const pc = noteIndex(name);
      if (i === 0) { out.push(pc); return; }
      const prev = out[i - 1];
      out.push(prev + (mod(pc - prev) || 12));
    });
    return out;
  }

  function typeById(id) {
    return TYPES.filter(function (t) { return t.id === id; })[0] || null;
  }

  // Acorde a partir de tónica, tipo y bajo (para transportar o rearmar lecturas).
  function chordInfo(root, typeId, bassPc) {
    const type = typeById(typeId);
    const bass = bassPc === undefined || bassPc === null ? root : mod(bassPc);
    return makeReading(mod(root), { type: type, omitted: [], rank: 0 }, bass);
  }

  // Alturas de un acorde en posición cerrada desde `base` (para escucharlo).
  function chordPitches(root, typeId, bassPc, base) {
    const type = typeById(typeId);
    const b = base === undefined ? 48 : base;
    const semis = type.tones.map(function (d) { return DEGREE_SEMIS[d] + (d === '9' ? 12 : 0); });
    const rootPitch = b + mod(root - b);
    const out = semis.map(function (x) { return rootPitch + x; });
    if (bassPc !== undefined && bassPc !== null && mod(bassPc) !== mod(root)) {
      out.unshift(rootPitch - 12 + mod(bassPc - root));
    }
    return out;
  }

  // Qué escala tocar sobre un acorde. Con tonalidad (`key`, mayor) y si el acorde
  // es diatónico, el modo de su grado (ii → dórico, V → mixolidio...). Si no, una
  // escala típica según el tipo de acorde.
  const DIATONIC = [
    { offset: 0,  triad: 'major', numeral: 'I',    scale: 'Jónico' },
    { offset: 2,  triad: 'minor', numeral: 'ii',   scale: 'Dórico' },
    { offset: 4,  triad: 'minor', numeral: 'iii',  scale: 'Frigio' },
    { offset: 5,  triad: 'major', numeral: 'IV',   scale: 'Lidio' },
    { offset: 7,  triad: 'major', numeral: 'V',    scale: 'Mixolidio' },
    { offset: 9,  triad: 'minor', numeral: 'vi',   scale: 'Eólico' },
    { offset: 11, triad: 'dim',   numeral: 'vii°', scale: 'Locrio' },
  ];
  const BY_TYPE = {
    maj: 'Jónico', '6': 'Jónico', maj7: 'Jónico', add9: 'Jónico', maj9: 'Jónico',
    '7': 'Mixolidio', '9': 'Mixolidio', sus4: 'Mixolidio', sus2: 'Mixolidio', '7sus4': 'Mixolidio',
    min: 'Dórico', m7: 'Dórico', m9: 'Dórico', m6: 'Dórico', madd9: 'Dórico',
    mmaj7: 'Menor melódica', dim: 'Locrio', m7b5: 'Locrio',
    dim7: 'Disminuida (tono-semitono)', aug: 'Tonos enteros', '7#5': 'Tonos enteros',
    '5': 'Pentatónica menor',
  };

  function chordScale(root, typeId, key) {
    const type = typeById(typeId);
    if (key !== null && key !== undefined && type.triad) {
      const d = DIATONIC.filter(function (x) { return mod(root - key) === x.offset && x.triad === type.triad; })[0];
      // Las séptimas tienen que coincidir con la tonalidad: C7 en C mayor no es diatónico.
      const seventhOk = !(d && ((typeId === '7' && d.numeral !== 'V') || (typeId === 'maj7' && d.numeral !== 'I' && d.numeral !== 'IV')));
      if (d && seventhOk) {
        return { root: root, scale: d.scale, numeral: d.numeral, diatonic: true };
      }
    }
    return { root: root, scale: BY_TYPE[typeId] || 'Jónico', numeral: null, diatonic: false };
  }

  return {
    NAMES: NAMES, DEGREE_NAMES: DEGREE_NAMES, INTERVAL_NAMES: INTERVAL_NAMES, TYPES: TYPES,
    identify: identify, openPitches: openPitches,
    typeById: typeById, chordInfo: chordInfo, chordPitches: chordPitches, chordScale: chordScale,
  };
});
