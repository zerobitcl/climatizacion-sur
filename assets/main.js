/* ==========================================================================
   Climatización Sur — main.js compartido
   Un solo archivo para los 3 silos: se cachea una vez y sirve en todo el sitio.
   No depende de nada por página; cada landing solo define su propio
   texto en el atributo data-msg de cada CTA (de dónde viene el lead).
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    whatsapp: '56900000000', // Reemplazar con el número real (código país + número, sin +)
    brand: 'Climatización Sur'
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

  initWhatsAppLinks();
  initHeaderScroll();
  initSmoothAnchors();
})();
