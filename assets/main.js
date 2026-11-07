/* ==========================================================================
   Climatización Sur — main.js compartido
   WhatsApp, cotización, calculadora de m³ y medición diferida.
   El ruteo por IP se eliminó: ocultaba el formulario a clientes B2B
   fuera de la zona (el caso "empresas de Santiago").
   GTM-T68TCXQS: contenedor Tag Manager. Eventos custom via dataLayer.
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    whatsapp: '56967240110',
    brand: 'Climatización Sur',
    gtm: 'GTM-T68TCXQS'
  };

  function buildWaUrl(baseMsg) {
    var fullMsg = baseMsg + '\n\n— Origen: ' + window.location.href;
    return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(fullMsg);
  }

  function openWhatsApp(msg) {
    window.open(buildWaUrl(msg), '_blank', 'noopener,noreferrer');
  }

  function cityFromPath() {
    var path = window.location.pathname;
    var m = path.match(/\/(puerto-montt|puerto-varas|llanquihue|frutillar|ancud|calefaccion|camaras-de-frio|guias)(\/|$)/);
    if (!m) return '';
    var map = {
      'puerto-montt': 'Puerto Montt',
      'puerto-varas': 'Puerto Varas',
      llanquihue: 'Llanquihue',
      frutillar: 'Frutillar',
      ancud: 'Ancud',
      calefaccion: 'Calefacción (hub)',
      'camaras-de-frio': 'Cámaras de frío',
      guias: 'Guías'
    };
    return map[m[1]] || '';
  }

  function track(name, params) {
    var payload = params || {};
    payload.page = payload.page || window.location.pathname;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: name }, payload));
  }

  function loadGtm() {
    if (!CONFIG.gtm || window.__gtmLoaded) return;
    window.__gtmLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var first = document.getElementsByTagName('script')[0];
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(CONFIG.gtm);
    if (first && first.parentNode) first.parentNode.insertBefore(script, first);
    else document.head.appendChild(script);
  }

  function initAnalytics() {
    document.addEventListener('click', function (event) {
      var wa = event.target.closest ? event.target.closest('.js-wa') : null;
      if (wa) {
        track('click_whatsapp', { cta_id: wa.getAttribute('data-cta') || 'wa' });
        return;
      }
      var tel = event.target.closest ? event.target.closest('a[href^="tel:"]') : null;
      if (tel) track('click_call', { cta_id: tel.getAttribute('data-cta') || 'call' });
    });

    var start = function () { loadGtm(); };
    if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 2500 });
    else window.addEventListener('load', start, { once: true });
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
    var lines = [
      '*Cotización web — ' + CONFIG.brand + '*',
      '',
      'Hola, solicito una cotización técnica.',
      '',
      '• *Comuna / zona:* ' + city,
      '• *Nombre:* ' + fieldValue(form, 'name'),
      '• *Teléfono:* ' + fieldValue(form, 'phone')
    ];
    var extras = [
      ['company', 'Empresa'],
      ['trade', 'Rubro'],
      ['chamber', 'Tipo de cámara']
    ];
    extras.forEach(function (pair) {
      var value = fieldValue(form, pair[0]);
      if (value) lines.push('• *' + pair[1] + ':* ' + value);
    });
    var message = fieldValue(form, 'message');
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
          var nameInput = form.querySelector('[name="name"]');
          if (nameInput) nameInput.focus();
          return;
        }
        if (!phone || phone.replace(/\D/g, '').length < 8) {
          var phoneInput = form.querySelector('[name="phone"]');
          if (phoneInput) phoneInput.focus();
          return;
        }
        track('submit_quote', { cta_id: 'formulario', city: form.getAttribute('data-city') || cityFromPath() });
        openWhatsApp(buildQuoteMessage(form));
      });
    });
  }

  function formatM3(value) {
    return String(Math.round(value * 10) / 10).replace('.', ',');
  }

  function initVolumeCalc() {
    var form = document.querySelector('form.js-volume-calc');
    if (!form) return;
    var out = form.querySelector('.volume-calc__result');

    function read() {
      var largo = parseFloat(fieldValue(form, 'largo'));
      var ancho = parseFloat(fieldValue(form, 'ancho'));
      var alto = parseFloat(fieldValue(form, 'alto'));
      if (![largo, ancho, alto].every(function (n) { return n > 0; })) return null;
      return { largo: largo, ancho: ancho, alto: alto, m3: largo * ancho * alto };
    }

    function paint() {
      var data = read();
      if (!out) return;
      out.textContent = data
        ? 'Volumen interior aproximado: ' + formatM3(data.m3) + ' m³.'
        : 'Ingresa las tres medidas interiores.';
    }

    form.addEventListener('input', paint);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = read();
      if (!data) {
        var first = form.querySelector('input');
        if (first) first.focus();
        return;
      }
      track('calc_used', { cta_id: 'calculadora', volume_m3: Math.round(data.m3 * 10) / 10 });
      openWhatsApp([
        '*Volumen de cámara — ' + CONFIG.brand + '*',
        '',
        'Hola, calculé el volumen interior de una cámara de frío y quiero cotizar.',
        '',
        '• *Largo:* ' + formatM3(data.largo) + ' m',
        '• *Ancho:* ' + formatM3(data.ancho) + ' m',
        '• *Alto:* ' + formatM3(data.alto) + ' m',
        '• *Volumen:* ' + formatM3(data.m3) + ' m³',
        '',
        'Quedo atento(a) a la visita técnica.'
      ].join('\n'));
    });
  }

  initWhatsAppLinks();
  initHeaderScroll();
  initSmoothAnchors();
  initQuoteForms();
  initVolumeCalc();
  initAnalytics();
})();
