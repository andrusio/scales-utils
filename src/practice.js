(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./spelling.js'), require('./chords.js'), require('./circle.js'));
  } else {
    root.PracticeCore = factory(root.Spelling, root.ChordsCore, root.CircleCore);
  }
})(typeof self !== 'undefined' ? self : this, function (S, K, C) {
  'use strict';

  // Generadores de ejercicios. Cada pregunta trae el texto, las opciones, la
  // respuesta correcta y una explicación. `rng` es una función que devuelve
  // números en [0, 1) (Math.random, o una con semilla en los tests).

  const INTERVALS = [
    'Unísono', 'Segunda menor', 'Segunda mayor', 'Tercera menor', 'Tercera mayor',
    'Cuarta justa', 'Tritono', 'Quinta justa', 'Sexta menor', 'Sexta mayor',
    'Séptima menor', 'Séptima mayor', 'Octava',
  ];

  const EXERCISES = [
    { id: 'interval', name: 'Intervalos de oído' },
    { id: 'quality',  name: 'Acordes de oído' },
    { id: 'degree',   name: 'Grados en la tonalidad' },
    { id: 'mode',     name: 'Modos y escala madre' },
    { id: 'build',    name: 'Armar acordes' },
  ];

  function mod(n) { return ((n % 12) + 12) % 12; }
  function int(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  function intervalQuestion(rng) {
    const semis = int(rng, 1, 12);
    const low = int(rng, 55, 67);
    return {
      type: 'interval',
      prompt: '¿Qué intervalo suena?',
      listen: { kind: 'interval', pitches: [low, low + semis] },
      options: INTERVALS.slice(1),
      answer: INTERVALS[semis],
      explain: S.SHARPS[mod(low)] + ' → ' + S.SHARPS[mod(low + semis)] + ': ' + semis + ' semitono' + (semis > 1 ? 's' : ''),
    };
  }

  const EAR_TYPES = ['maj', 'min', 'dim', 'aug', '7', 'maj7', 'm7'];

  function qualityQuestion(rng) {
    const typeId = pick(rng, EAR_TYPES);
    const rootPc = int(rng, 0, 11);
    const info = K.chordInfo(rootPc, typeId);
    return {
      type: 'quality',
      prompt: '¿Qué tipo de acorde suena?',
      listen: { kind: 'chord', pitches: K.chordPitches(rootPc, typeId, null, 48) },
      options: EAR_TYPES.map(function (t) { return K.typeById(t).name; }),
      answer: K.typeById(typeId).name,
      explain: info.label + ': ' + info.tones.map(function (t) { return t.name + ' (' + t.interval.toLowerCase() + ')'; }).join(', '),
    };
  }

  const FUNCTION_NAMES = { T: 'tónica', SD: 'subdominante', D: 'dominante' };

  function degreeQuestion(rng) {
    const key = int(rng, 0, 11);
    const chords = C.diatonicChords(key, false);
    const i = int(rng, 0, 6);
    const chord = chords[i];
    const d = C.DEGREES[i];
    return {
      type: 'degree',
      prompt: '¿Qué grado es ' + chord.label + ' en ' + C.keyName(key, 'major') + ' mayor?',
      listen: null,
      options: C.DEGREES.map(function (x) { return x.numeral; }),
      answer: chord.numeral,
      explain: 'En ' + C.keyName(key, 'major') + ' mayor: ' + chords.map(function (c) { return c.numeral + ' ' + c.label; }).join(' · ') +
        '. ' + chord.label + ' cumple función de ' + FUNCTION_NAMES[d.fn] + '.',
    };
  }

  const HINT_INDEX = { 'I': 0, 'iii': 2, 'IV': 3, 'V': 4, 'vi': 5 };

  function modeQuestion(rng) {
    const rootPc = int(rng, 0, 11);
    const modes = C.modesOfRoot(rootPc).filter(function (m) { return m.name !== 'Jónico'; });
    const m = pick(rng, modes);
    const rootName = C.keyName(rootPc, 'major');
    const major = S.spellFrom(rootName, S.MAJOR_DEGREES);
    const degName = major[HINT_INDEX[m.hint.degree]];
    const adj = m.hint.adj > 0 ? ' +½' : m.hint.adj < 0 ? ' −½' : '';
    const options = [];
    for (let pc = 0; pc < 12; pc++) options.push(C.keyName(pc, 'major'));
    return {
      type: 'mode',
      prompt: '¿Qué escala mayor tocás para ' + rootName + ' ' + m.name.toLowerCase() + '?',
      listen: null,
      options: options,
      answer: C.keyName(m.parent, 'major'),
      explain: m.name + ' = ' + m.hint.degree + adj + ' de ' + rootName + ' mayor (' + degName + adj + ' → ' + C.keyName(m.parent, 'major') + ').',
    };
  }

  const BUILD_TYPES = ['maj', 'min', '7', 'm7', 'maj7'];

  function buildQuestion(rng) {
    const rootPc = int(rng, 0, 11);
    const typeId = pick(rng, BUILD_TYPES);
    const type = K.typeById(typeId);
    const inv = int(rng, 0, type.tones.length === 3 ? 2 : 1);
    const bassPc = mod(rootPc + S.degreeSemis(type.tones[inv]));
    const info = K.chordInfo(rootPc, typeId, bassPc);
    return {
      type: 'build',
      prompt: 'Armá ' + info.label + ' en el instrumento',
      listen: { kind: 'chord', pitches: K.chordPitches(rootPc, typeId, bassPc, 48) },
      options: null,
      answer: info.label,
      explain: info.label + ' = ' + info.tones.map(function (t) { return t.name; }).join(' ') +
        (info.inversion ? ' · ' + info.inversion.toLowerCase() : '') + '.',
    };
  }

  // ¿Las notas tocadas forman el acorde pedido? (`pcs` alturas 0-11, `bassPc` la más grave).
  function checkBuild(question, pcs, bassPc) {
    const r = K.identify(pcs, bassPc);
    if (!r) return false;
    return r.exact.some(function (x) { return x.label === question.answer; });
  }

  const GENERATORS = {
    interval: intervalQuestion, quality: qualityQuestion, degree: degreeQuestion,
    mode: modeQuestion, build: buildQuestion,
  };

  function question(type, rng) { return GENERATORS[type](rng || Math.random); }

  return { EXERCISES: EXERCISES, INTERVALS: INTERVALS, question: question, checkBuild: checkBuild };
});
