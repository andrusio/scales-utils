(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ScalesCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const SCALES = [
    { name: 'Mayor',             intervals: ['T', 'T', 'S', 'T', 'T', 'T', 'S'], count: 7 },
    { name: 'Natural Menor',     intervals: ['T', 'S', 'T', 'T', 'S', 'T', 'T'], count: 7 },
    { name: 'Melódica Menor',    intervals: ['T', 'S', 'T', 'T', 'T', 'T', 'S'], count: 7 },
    { name: 'Harmónica Menor',   intervals: ['T', 'S', 'T', 'T', 'S', 'TS', 'S'], count: 7 },
    { name: 'Pentatónica Mayor', intervals: ['T', 'T', 'TS', 'T', 'TS'],          count: 5 },
    { name: 'Pentatónica Menor', intervals: ['TS', 'T', 'T', 'TS', 'T'],          count: 5 },
    { name: 'Enigmática',        intervals: ['S', 'TS', 'T', 'T', 'T', 'S', 'S'], count: 7 },
  ];

  const MAX_RESULTS = 10;

  const MODE_NAMES = ['Jónico', 'Dórico', 'Frigio', 'Lidio', 'Mixolidio', 'Eólico', 'Locrio'];
  const MAJOR_OFFSETS = [0, 2, 4, 5, 7, 9, 11];

  const MIN_FRETS = 1;
  const MAX_FRETS = 24;
  const DEFAULT_CONFIG = { version: 1, tuning: ['E', 'A', 'D', 'G', 'B', 'E'], frets: 15 };

  function noteIndex(name) {
    return NOTES.indexOf(name);
  }

  // Avanza desde root sumando semitonos: T=2, S=1, TS=3. Devuelve count notas.
  function generateScale(root, scale) {
    const out = [root];
    let idx = noteIndex(root);
    for (const interval of scale.intervals) {
      const step = interval === 'TS' ? 3 : interval === 'T' ? 2 : 1;
      idx = (idx + step) % NOTES.length;
      out.push(NOTES[idx]);
    }
    return out.slice(0, scale.count);
  }

  // Replica encontrar_escala de main.go: escalas (de las 12 raíces) que contienen
  // al menos una nota seleccionada, ordenadas por similitud y luego por el
  // porcentaje de coincidencias truncado.
  function findScales(selected) {
    const unique = [...new Set(selected)];
    if (unique.length === 0) return [];

    const matches = [];
    for (const scale of SCALES) {
      for (let i = 0; i < NOTES.length; i++) {
        const root = NOTES[i];
        const notes = generateScale(root, scale);
        const matched = unique.filter(n => notes.includes(n));
        if (matched.length === 0) continue;
        matches.push({
          root,
          name: scale.name,
          notes,
          matched: matched.length,
          total: scale.count,
          coincidencePercent: Math.floor(matched.length * 100 / scale.count),
          similarity: matched.length / unique.length * 100,
          missing: unique.filter(n => !notes.includes(n)),
        });
      }
    }

    matches.sort((a, b) => {
      if (b.similarity !== a.similarity) return b.similarity - a.similarity;
      return b.coincidencePercent - a.coincidencePercent;
    });

    return matches.slice(0, MAX_RESULTS);
  }

  // Los 7 modos griegos del conjunto diatónico. El "ancla" es la tónica del
  // Jónico (para Mayor, su propia raíz; para Natural Menor, su relativa mayor).
  // Devuelve null para escalas no diatónicas.
  function modesForScale(root, scaleName) {
    if (scaleName !== 'Mayor' && scaleName !== 'Natural Menor') return null;
    const rootIdx = noteIndex(root);
    if (rootIdx < 0) return null;
    const anchorIdx = scaleName === 'Mayor' ? rootIdx : (rootIdx + 3) % NOTES.length;
    const parentIndex = scaleName === 'Mayor' ? 0 : 5;
    return MODE_NAMES.map((name, i) => ({
      tonic: NOTES[(anchorIdx + MAJOR_OFFSETS[i]) % NOTES.length],
      name,
      isParent: i === parentIndex,
    }));
  }

  // Nota que suena en una posición (cuerda + traste) de la afinación.
  function noteAtPosition(tuning, stringIndex, fret) {
    const open = noteIndex(tuning[stringIndex]);
    return NOTES[(open + fret) % NOTES.length];
  }

  // Devuelve las cuerdas de agudo a grave para dibujar (aguda arriba).
  function renderOrder(tuning) {
    const out = [];
    for (let i = tuning.length - 1; i >= 0; i--) {
      out.push({ note: tuning[i], tuningIndex: i });
    }
    return out;
  }

  // Valida una configuración. Nunca lanza: devuelve {ok, config?, errors}.
  function validateConfig(obj) {
    const errors = [];
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      return { ok: false, errors: ['La configuración debe ser un objeto'] };
    }
    if (obj.version !== 1) {
      errors.push('Versión de configuración no soportada');
    }
    const tuning = obj.tuning;
    if (!Array.isArray(tuning) || tuning.length === 0) {
      errors.push('La afinación debe ser una lista no vacía de notas');
    } else {
      tuning.forEach((n, i) => {
        if (noteIndex(n) < 0) errors.push(`Nota inválida en la cuerda ${i + 1}: ${n}`);
      });
    }
    if (!Number.isInteger(obj.frets) || obj.frets < MIN_FRETS || obj.frets > MAX_FRETS) {
      errors.push(`Cantidad de trastes debe ser un entero entre ${MIN_FRETS} y ${MAX_FRETS}`);
    }
    if (errors.length) return { ok: false, errors };
    return { ok: true, config: { version: 1, tuning: tuning.slice(), frets: obj.frets }, errors: [] };
  }

  function serializeConfig(config) {
    return JSON.stringify(config);
  }

  // Lee un texto JSON y lo valida. Nunca lanza.
  function parseConfig(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { ok: false, errors: ['El archivo no es un JSON válido'] };
    }
    return validateConfig(parsed);
  }

  return {
    NOTES, noteIndex, SCALES, generateScale,
    MAX_RESULTS, findScales,
    MODE_NAMES, modesForScale,
    MIN_FRETS, MAX_FRETS, DEFAULT_CONFIG,
    noteAtPosition, renderOrder, validateConfig, serializeConfig, parseConfig,
  };
});
