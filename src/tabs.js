(function () {
  'use strict';

  const VIEWS = {
    scales: 'Clickeá las notas en el mástil para ver qué escalas las contienen.',
    circle: 'Elegí una nota o cargá los acordes de una canción para ver el círculo y los modos.',
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
    subtitleEl.textContent = VIEWS[view];
    if (view === 'circle' && window.circleApp) window.circleApp.render();
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      history.replaceState(null, '', tab.dataset.view === 'scales' ? location.pathname + location.search : '#circulo');
      show(tab.dataset.view);
    });
  });

  show(location.hash === '#circulo' ? 'circle' : 'scales');
})();
