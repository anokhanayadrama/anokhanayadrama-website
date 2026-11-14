(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Floating orbs
  var orbs = document.createElement('div');
  orbs.className = 'fx-orbs';
  orbs.setAttribute('aria-hidden', 'true');
  orbs.innerHTML = '<i class="fx-orb o1"></i><i class="fx-orb o2"></i><i class="fx-orb o3"></i><i class="fx-orb o4"></i>';
  document.body.prepend(orbs);

  // Tilt targets
  var tiltSel = '.hero-card, .resource-card, .service-card, .recipe-card, .feature-list > *, .steps > *';
  var tiltEls = Array.prototype.slice.call(document.querySelectorAll(tiltSel));
  tiltEls.forEach(function (el) { el.setAttribute('data-tilt', ''); });

  if (fine && !reduce) {
    tiltEls.forEach(function (el) {
      var max = el.classList.contains('hero-card') ? 12 : 8;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        el.classList.add('is-tilting');
        el.style.setProperty('--gx', px * 100 + '%');
        el.style.setProperty('--gy', py * 100 + '%');
        el.style.transform = 'perspective(900px) rotateX(' + ((0.5 - py) * max).toFixed(2) + 'deg) rotateY(' +
          ((px - 0.5) * max).toFixed(2) + 'deg) translateZ(14px)';
      });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('is-tilting');
        el.style.transform = '';
      });
    });
  }

  // Scroll reveal
  var revealSel = '.section-heading, .resource-grid > *, .service-grid > *, .recipe-grid > *, .steps > *, .feature-list > *, .faq-list > *, .consult-grid > *, .final-cta, .process-section > h2, .split-section > div';
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(revealSel));
  if ('IntersectionObserver' in window && !reduce) {
    document.documentElement.classList.add('fx-ready');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) {
      var i = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.setProperty('--d', Math.min(i, 5) * 0.08 + 's');
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  // Scroll parallax for orbs
  if (!reduce) {
    var ticking = false;
    var depths = [0.12, -0.08, 0.2, -0.15];
    var items = orbs.querySelectorAll('.fx-orb');
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        items.forEach(function (o, i) { o.style.transform = 'translate3d(0,' + (y * depths[i]).toFixed(1) + 'px,0)'; });
        ticking = false;
      });
    }, { passive: true });
  }
})();
