/* ==========================================================================
   Climatización Sur — main.js compartido
   Un solo archivo para todos los silos: se cachea una vez y sirve en todo el sitio.
   Incluye ruteo de leads por IP (clúster lacustre) sin bloquear el render.
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    whatsapp: '56967240110',
    phoneDisplay: '+56 9 6724 0110',
    instagram: 'https://www.instagram.com/tecnicoolcl/',
    brand: 'Climatización Sur',
    cluster: ['puerto montt', 'puerto varas', 'llanquihue', 'frutillar', 'ancud'],
    geoApi: 'https://ipapi.co/json/',
    geoTimeoutMs: 2500
  };

  function buildWaUrl(baseMsg) {
    var origin = window.location.href;
    var fullMsg = baseMsg + '\n\n— Origen: ' + origin;
    return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(fullMsg);
  }

  function initWhatsAppLinks() {
    document.querySelectorAll('.js-wa').forEach(function (el) {
      var msg = el.getAttribute('data-msg') || ('Hola, quiero información sobre ' + CONFIG.brand);
      el.href = buildWaUrl(msg);
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
    });
  }

  function initHeaderScroll() {
    var header = document.getElementById('header');
    if (!header) return;
    function onScroll() {
      header.classList.toggle('is-scrolled', window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initSmoothAnchors() {
    var header = document.getElementById('header');
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = this.getAttribute('href');
        if (id === '#' || id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        var offset = header ? header.offsetHeight : 0;
        var top = target.getBoundingClientRect().top + window.scrollY - offset - 8;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  }

  function normalizeCity(name) {
    return String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function isInCluster(city) {
    var n = normalizeCity(city);
    if (!n) return false;
    return CONFIG.cluster.some(function (c) {
      return n === c || n.indexOf(c) !== -1 || c.indexOf(n) !== -1;
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getQuoteForm() {
    return document.querySelector('form.js-quote-form') || document.querySelector('form');
  }

  function showWaitlist(city) {
    var form = getQuoteForm();
    if (!form || form.dataset.geoRouted === '1') return;

    form.style.display = 'none';
    form.dataset.geoRouted = '1';

    var cityLabel = city || 'tu ciudad';
    var wrap = document.createElement('div');
    wrap.className = 'lead-waitlist';
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Aviso de cobertura');
    wrap.innerHTML =
      '<p class="lead-waitlist__msg">Aún no tenemos cobertura técnica en <strong>' +
      escapeHtml(cityLabel) +
      '</strong>. Déjanos tu correo y te avisaremos</p>' +
      '<form class="lead-waitlist__form" action="#" method="post" novalidate>' +
      '<label class="visually-hidden" for="waitlist-email">Correo electrónico</label>' +
      '<input id="waitlist-email" name="email" type="email" required autocomplete="email" ' +
      'placeholder="tu@email.com" inputmode="email">' +
      '<button type="submit" class="btn btn--primary">Avisarme</button>' +
      '</form>';

    form.parentNode.insertBefore(wrap, form.nextSibling);

    wrap.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = wrap.querySelector('#waitlist-email');
      var email = input && input.value ? input.value.trim() : '';
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (input) input.focus();
        return;
      }
      wrap.innerHTML =
        '<p class="lead-waitlist__msg">Gracias. Te avisaremos cuando tengamos cobertura en <strong>' +
        escapeHtml(cityLabel) +
        '</strong>.</p>';
    });
  }

  function fetchCityWithTimeout() {
    if (!window.fetch) return Promise.reject(new Error('no-fetch'));

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, CONFIG.geoTimeoutMs);

    return fetch(CONFIG.geoApi, {
      method: 'GET',
      signal: ctrl ? ctrl.signal : undefined,
      headers: { Accept: 'application/json' }
    })
      .then(function (res) {
        if (!res.ok) throw new Error('geo-http-' + res.status);
        return res.json();
      })
      .then(function (data) {
        clearTimeout(timer);
        return (data && (data.city || data.region)) || '';
      })
      .catch(function (err) {
        clearTimeout(timer);
        throw err;
      });
  }

  /* Idle / post-load: no bloquea First Paint ni TTI */
  function scheduleGeoRouting() {
    var run = function () {
      fetchCityWithTimeout()
        .then(function (city) {
          if (!city || isInCluster(city)) return;
          showWaitlist(city);
        })
        .catch(function () {
          /* Fail-open: formulario de cotización visible por defecto */
        });
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(run, { timeout: 3000 });
    } else {
      setTimeout(run, 1);
    }
  }

  initWhatsAppLinks();
  initHeaderScroll();
  initSmoothAnchors();
  scheduleGeoRouting();
})();
