(function () {
  'use strict';

  // Sonido con Web Audio (sin archivos): notas sueltas al tocar el instrumento y
  // botones ▶ para escuchar acordes, escalas, progresiones y ejercicios.
  const STORAGE_KEY = 'scales-utils.sound';

  let enabled = true; // sonido al tocar notas en el instrumento
  try { enabled = localStorage.getItem(STORAGE_KEY) !== 'off'; } catch (e) { /* ignorar */ }

  let ctx = null;
  let out = null; // compresor final
  let bus = null; // ganancia del "pasaje" actual (se reemplaza al empezar otro)

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      out = ctx.createDynamicsCompressor();
      out.connect(ctx.destination);
      bus = newBus();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function newBus() {
    const g = ctx.createGain();
    g.gain.value = 0.32;
    g.connect(out);
    return g;
  }

  // Corta lo que estaba sonando (para que dos ▶ seguidos no se pisen).
  function freshBus() {
    const old = bus;
    old.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    setTimeout(function () { old.disconnect(); }, 400);
    bus = newBus();
  }

  function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function voice(midi, t, dur, vel) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2800;
    const o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = freq(midi);
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq(midi) * 2;
    const g2 = ctx.createGain();
    g2.gain.value = 0.22;
    o1.connect(lp);
    o2.connect(g2);
    g2.connect(lp);
    lp.connect(g);
    g.connect(bus);
    o1.start(t);
    o2.start(t);
    o1.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
  }

  // Nota suelta al tocar el instrumento (respeta el interruptor de sonido).
  function tap(midi) {
    if (!enabled || !ensure()) return;
    voice(midi, ctx.currentTime + 0.005, 1.4, 0.5);
  }

  // Acorde: junto o arpegiado.
  function chord(midis, arpeggio) {
    if (!ensure()) return;
    freshBus();
    const t0 = ctx.currentTime + 0.03;
    const sorted = midis.slice().sort(function (a, b) { return a - b; });
    sorted.forEach(function (m, i) {
      voice(m, t0 + (arpeggio ? i * 0.28 : i * 0.018), arpeggio ? 1.6 : 2.2, 0.38);
    });
  }

  // Notas una tras otra (escala, intervalo melódico).
  function sequence(midis, step) {
    if (!ensure()) return;
    freshBus();
    const t0 = ctx.currentTime + 0.03;
    const s = step || 0.32;
    midis.forEach(function (m, i) { voice(m, t0 + i * s, s * 2.2, 0.45); });
  }

  // Varios acordes seguidos (progresión).
  function progression(chords, step) {
    if (!ensure()) return;
    freshBus();
    const t0 = ctx.currentTime + 0.03;
    const s = step || 1.1;
    chords.forEach(function (midis, i) {
      midis.forEach(function (m, j) { voice(m, t0 + i * s + j * 0.015, s * 1.3, 0.3); });
    });
  }

  // Alturas ascendentes para una lista de semitonos desde una tónica (escalas).
  function scaleMidis(rootPc, semis) {
    const base = 57 + (((rootPc - 9) % 12) + 12) % 12; // tónica entre A3 y G#4
    const out = semis.map(function (x) { return base + x; });
    out.push(base + 12);
    return out;
  }

  function renderToggle() {
    const b = document.getElementById('sound-toggle');
    if (!b) return;
    b.setAttribute('aria-pressed', String(enabled));
    b.textContent = enabled ? '🔊 Sonido' : '🔇 Sonido';
    b.title = enabled ? 'Las notas suenan al tocarlas' : 'Las notas no suenan al tocarlas (los botones ▶ sí)';
  }

  function setEnabled(v) {
    enabled = !!v;
    try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch (e) { /* ignorar */ }
    renderToggle();
  }

  const toggle = document.getElementById('sound-toggle');
  if (toggle) toggle.addEventListener('click', function () { setEnabled(!enabled); if (enabled) tap(69); });
  renderToggle();

  window.Sound = {
    tap: tap, chord: chord, sequence: sequence, progression: progression, scaleMidis: scaleMidis,
    isEnabled: function () { return enabled; }, setEnabled: setEnabled,
  };
})();
