(function () {
  'use strict';

  const VIEWS = {
    scales: { hash: '', subtitle: 'Clickeá las notas en el mástil para ver qué escalas las contienen.' },
    chords: { hash: '#acordes', subtitle: 'Tocá notas en el mástil para ver qué acorde forman y de qué intervalos está hecho.' },
    circle: { hash: '#circulo', subtitle: 'Elegí una nota o cargá los acordes de una canción para ver el círculo y los modos.' },
  };

  const subtitleEl = document.getElementById('subtitle');
  const tabs = Array.prototype.slice.call(document.querySelectorAll('.tabs [role="tab"]'));

  function show(view) {
    if (!VIEWS[view]) view = 'scales';
    tabs.forEach(function (tab) {
      const active = tab.dataset.view === view;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById('view-' + tab.dataset.view).hidden = !active;
    });
    subtitleEl.textContent = VIEWS[view].subtitle;
    const hash = VIEWS[view].hash;
    if (location.hash !== hash) history.replaceState(null, '', hash || location.pathname + location.search);
    if (view === 'circle' && window.circleApp) window.circleApp.render();
    if (view === 'chords' && window.chordsApp) window.chordsApp.render();
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { show(tab.dataset.view); });
  });

  const initial = Object.keys(VIEWS).filter(function (v) { return VIEWS[v].hash && VIEWS[v].hash === location.hash; })[0];
  show(initial || 'scales');

  window.tabsApp = { show: show };
})();
