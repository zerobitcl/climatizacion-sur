/* ==========================================================================
   Climatización Sur — main.js compartido
   WhatsApp CTAs + cotización por WA + ruteo geo IP (fail-open).
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

  function openWhatsApp(msg) {
    window.open(buildWaUrl(msg), '_blank', 'noopener,noreferrer');
  }

  function cityFromPath() {
    var m = window.location.pathname.match(/\/(puerto-montt|puerto-varas|llanquihue|frutillar|ancud|calefaccion)\//);
    if (!m) return '';
    var map = {
      'puerto-montt': 'Puerto Montt',
      'puerto-varas': 'Puerto Varas',
      llanquihue: 'Llanquihue',
      frutillar: 'Frutillar',
      ancud: 'Ancud',
      calefaccion: 'Calefacción (hub)'
    };
    return map[m[1]] || '';
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

  function fieldValue(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el && el.value ? String(el.value).trim() : '';
  }

  function buildQuoteMessage(form) {
    var city = form.getAttribute('data-city') || cityFromPath() || 'Sin especificar';
    var name = fieldValue(form, 'name');
    var phone = fieldValue(form, 'phone');
    var message = fieldValue(form, 'message');
    var lines = [
      '*Cotización web — ' + CONFIG.brand + '*',
      '',
      'Hola, solicito una cotización técnica.',
      '',
      '• *Comuna / zona:* ' + city,
      '• *Nombre:* ' + name,
      '• *Teléfono:* ' + phone
    ];
    if (message) lines.push('• *Detalle del proyecto:* ' + message);
    lines.push('', 'Quedo atento(a) a la visita técnica o cotización.');
    return lines.join('\n');
  }

  function initQuoteForms() {
    document.querySelectorAll('form.js-quote-form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = fieldValue(form, 'name');
        var phone = fieldValue(form, 'phone');
        if (!name) {
          var n = form.querySelector('[name="name"]');
          if (n) n.focus();
          return;
        }
        if (!phone || phone.replace(/\D/g, '').length < 8) {
          var p = form.querySelector('[name="phone"]');
          if (p) p.focus();
          return;
        }
        openWhatsApp(buildQuoteMessage(form));
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
    return document.querySelector('form.js-quote-form');
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
      '</strong>. Déjanos tu correo y te avisaremos por WhatsApp</p>' +
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
      var msg = [
        '*Lista de espera — ' + CONFIG.brand + '*',
        '',
        'Hola, aún no tienen cobertura en mi ciudad y quiero que me avisen.',
        '',
        '• *Ciudad detectada:* ' + cityLabel,
        '• *Email:* ' + email,
        '',
        'Gracias.'
      ].join('\n');
      openWhatsApp(msg);
      wrap.innerHTML =
        '<p class="lead-waitlist__msg">Perfecto. Se abrirá WhatsApp con tus datos para avisar cobertura en <strong>' +
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

  function scheduleGeoRouting() {
    var run = function () {
      fetchCityWithTimeout()
        .then(function (city) {
          if (!city || isInCluster(city)) return;
          showWaitlist(city);
        })
        .catch(function () {
          /* Fail-open */
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
  initQuoteForms();
  scheduleGeoRouting();
})();
