/* GYEOL — page motion
 *
 * GSAP (ScrollSmoother + ScrollTrigger) handles smooth scrolling and the photo
 * parallax only. Everything else is plain CSS keyframes/transitions driven by the
 * small vanilla functions below:
 *   - scroll reveal (IntersectionObserver, 60ms stagger)     [data-reveal]
 *   - drawers, search and product modal (<dialog>)           [data-open] / [data-close]
 *   - submenu in the menu drawer                             [data-submenu-toggle]
 *   - add to cart: label slide, fly-to-cart, count badge     [data-add-to-cart]
 *   - header state on scroll
 *
 * With prefers-reduced-motion: reduce, GSAP is skipped, CSS turns every animation
 * off, and the JS waits below collapse to 0ms.
 */
(function () {
  'use strict';

  var smoother = null;
  var reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Mirrors the CSS tokens --drawer-duration, --surface-duration, --fly-duration.
  var MS = { drawer: 360, surface: 300, fly: 700 };

  function reduced() { return reducedQuery.matches; }
  function wait(ms, fn) { return setTimeout(fn, reduced() ? 0 : ms); }

  var PRODUCTS = {
    'shim-lounge': {
      title: '쉼 라운지 체어',
      price: '300만 원부터',
      img: 'assets/images/lounge-chair-front.jpg'
    }
  };

  var SEARCH_INDEX = [
    { title: '쉼 라운지 체어', sub: '300만 원부터', href: '#featured', keywords: '의자 체어 라운지 소파 쿠션' },
    { title: '소재', sub: '화이트 오크, 부클레 패브릭', href: '#featured', keywords: '원목 나무 오크 패브릭 부클레 천' },
    { title: '옆선', sub: '좌판에서 다리까지 이어지는 하나의 곡선', href: '#featured', keywords: '디자인 곡선 형태' },
    { title: '브랜드 이야기', sub: '집처럼 편안하도록', href: '#about', keywords: '브랜드 철학 짜맞춤 원목 공간' },
    { title: '쇼룸 상담 예약', sub: '1:1 90분 상담', href: '#visit', keywords: '쇼룸 예약 상담 위치 운영 문의 맞춤 제작' }
  ];

  startAtTop();
  initBookingForm();
  initAnchorLinks();
  initTopbar();
  initReveal();
  initOverlays();
  initSubmenu();
  initSearch();
  initCart();

  if (!window.gsap || !window.ScrollTrigger || !window.ScrollSmoother) return; // CDN failed: page still works

  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

  var mm = gsap.matchMedia();

  // Smooth scroll, intro and parallax. Reverted automatically if the user
  // switches on reduced motion while the page is open.
  mm.add('(prefers-reduced-motion: no-preference)', function () {
    smoother = ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 0.8,          // seconds the content takes to catch up; >1 feels floaty with a wheel
      smoothTouch: 0.1,     // light smoothing on touch devices
      effects: false        // all parallax is driven by the ScrollTriggers below, so nothing double-lags
    });

    // Web fonts arrive after first layout and change the page height;
    // re-measure so the scroll length and trigger positions are right.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }

    playIntro();
    parallaxImages();
    heroCopyParallax();
    aboutReveal();

    return function () {
      if (smoother) { smoother.kill(); smoother = null; }
    };
  });

  // Desktop only: the three product columns drift at different speeds, and the
  // brand-story copy floats over the photo. On one-column layouts this would
  // just push cards into each other.
  mm.add('(prefers-reduced-motion: no-preference) and (min-width: 1024px)', function () {
    var cols = gsap.utils.toArray('.product-grid > li');
    var travel = [0, 32, 12]; // px each column moves over the section's scroll — keep it subtle
    cols.forEach(function (li, i) {
      gsap.fromTo(li, { y: travel[i] }, {
        y: -travel[i],
        ease: 'none',
        scrollTrigger: { trigger: '.product-grid', start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    gsap.fromTo('.about__copy', { y: 30 }, {
      y: -30,
      ease: 'none',
      scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* ---------- GSAP pieces ---------- */

  function playIntro() {
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero__img', { scale: 1.12, duration: 1.8, ease: 'power2.out' }, 0)
      .from('.site-header__inner > *', { y: -20, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.2)
      .from('.hero__inner > *', { y: 40, autoAlpha: 0, duration: 1.1, stagger: 0.12 }, 0.35);
  }

  // Each photo is 120% of its frame (see .media-frame in CSS) and moves from
  // -8% to +8% of its own height while its frame crosses the viewport, so it
  // scrolls slower than the page around it.
  function parallaxImages() {
    gsap.utils.toArray('[data-parallax]').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -8 }, {
        yPercent: 8,
        ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  function heroCopyParallax() {
    // Copy drifts up a little faster than the photo and only softens, never vanishes.
    gsap.to('.hero__copy', {
      y: -60,
      opacity: 0.35,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  // The living-room photo opens up from a narrower slit as it enters.
  function aboutReveal() {
    gsap.from('.about__media', {
      clipPath: 'inset(14% 8% 14% 8%)',
      duration: 1.4,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.about', start: 'top 80%', once: true }
    });
  }

  /* ---------- page ---------- */

  // Every visit and reload opens on the hero: don't restore the old scroll
  // position, and drop any #section left in the URL so the browser doesn't jump to it.
  function startAtTop() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    window.scrollTo(0, 0);
    window.addEventListener('load', function () {
      if (smoother) smoother.scrollTop(0);
      window.scrollTo(0, 0);
    }, { once: true });
  }

  // In-page links glide to the section (below the fixed header) and close any open overlay first.
  function initAnchorLinks() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var target = safeQuery(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      var dlg = link.closest('dialog');
      if (dlg) closeOverlay(dlg);
      scrollToSection(target); // URL stays clean, so a reload starts at the top
    });
  }

  function scrollToSection(target) {
    var toTop = target.id === 'top';
    if (smoother) {
      var offset = document.querySelector('.site-header').offsetHeight;
      smoother.scrollTo(toTop ? 0 : target, true, 'top ' + offset + 'px');
    } else if (toTop) {
      window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
    } else {
      target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); // CSS scroll-margin-top clears the header
    }
  }

  function safeQuery(hash) {
    if (!hash || hash.length < 2) return null;
    try { return document.querySelector(hash); } catch (err) { return null; }
  }

  // Once the page moves, the header gets its background.
  function initTopbar() {
    var bar = document.querySelector('[data-topbar]');
    if (!bar) return;
    var queued = false;
    function update() {
      queued = false;
      bar.classList.toggle('is-scrolled', window.scrollY > 8);
    }
    window.addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // fadeInUp as items enter; items entering together start 60ms apart, in reading order.
  function initReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (!document.documentElement.classList.contains('reveal-ready')) {
      items.forEach(function (el) { el.classList.add('is-revealed'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      var entering = entries
        .filter(function (e) { return e.isIntersecting; })
        .map(function (e) { return e.target; })
        .sort(function (a, b) {
          return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
      entering.forEach(function (el, i) {
        el.style.setProperty('--reveal-delay', (i * 60) + 'ms');
        el.classList.add('is-revealed');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- overlays (<dialog>) ---------- */

  function overlayMs(dlg) {
    return dlg.classList.contains('overlay--drawer') ? MS.drawer : MS.surface;
  }

  function lockScroll() {
    if (smoother) smoother.paused(true);
    else document.documentElement.classList.add('is-locked');
  }
  function unlockScroll() {
    if (smoother) smoother.paused(false);
    document.documentElement.classList.remove('is-locked');
  }

  function initOverlays() {
    document.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-open]');
      if (opener) {
        var dlg = document.getElementById(opener.getAttribute('data-open'));
        if (dlg) { e.preventDefault(); openOverlay(dlg); }
        return;
      }
      var closer = e.target.closest('[data-close]');
      if (closer && closer.closest('dialog')) closeOverlay(closer.closest('dialog'));
    });

    document.querySelectorAll('dialog.overlay').forEach(function (dlg) {
      // Esc: play the closing animation instead of vanishing.
      dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeOverlay(dlg); });
      // If the browser closes it anyway (e.g. a second quick Esc), still clean up.
      dlg.addEventListener('close', function () {
        if (dlg.classList.contains('is-open')) {
          dlg.classList.remove('is-open');
          unlockScroll();
        }
      });
    });
  }

  function openOverlay(dlg) {
    // Only one overlay at a time: anything else open closes instantly.
    document.querySelectorAll('dialog.overlay[open]').forEach(function (other) {
      if (other === dlg) return;
      clearTimeout(other._closeTimer);
      other.classList.remove('is-open');
      other.close();
    });
    clearTimeout(dlg._closeTimer);
    if (!dlg.open) dlg.showModal();
    lockScroll();
    dlg.dispatchEvent(new CustomEvent('overlay:open'));
    void dlg.offsetWidth; // commit the closed state so the open transition runs
    dlg.classList.add('is-open');
  }

  // Calls done() once the closing animation has finished.
  function closeOverlay(dlg, done) {
    if (!dlg.open) { if (done) done(); return; }
    if (dlg.classList.contains('is-open')) {
      dlg.classList.remove('is-open');
      unlockScroll();
    }
    clearTimeout(dlg._closeTimer);
    dlg._closeTimer = wait(overlayMs(dlg), function () {
      if (dlg.open && !dlg.classList.contains('is-open')) dlg.close();
      if (done) done();
    });
  }

  // Submenu: show the list, then let its items rise in; on close, play them back and hide.
  function initSubmenu() {
    document.querySelectorAll('[data-submenu-toggle]').forEach(function (btn) {
      var menu = document.getElementById(btn.getAttribute('aria-controls'));
      if (!menu) return;
      var timer;
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        clearTimeout(timer);
        if (open) {
          menu.hidden = false;
          void menu.offsetWidth;
          menu.classList.add('is-open');
        } else {
          menu.classList.remove('is-open');
          timer = wait(MS.surface + (menu.children.length - 1) * 40, function () { menu.hidden = true; });
        }
      });
    });
  }

  function initSearch() {
    var dlg = document.getElementById('search-dialog');
    if (!dlg) return;
    var input = dlg.querySelector('[data-search-input]');
    var list = dlg.querySelector('[data-search-results]');
    var label = dlg.querySelector('[data-search-label]');
    var shown = null;

    function normalize(s) { return s.toLowerCase().replace(/\s+/g, ''); }

    function render() {
      var q = normalize(input.value);
      var hits = q
        ? SEARCH_INDEX.filter(function (it) { return normalize(it.title + it.sub + it.keywords).indexOf(q) !== -1; })
        : SEARCH_INDEX;
      var key = q ? hits.map(function (it) { return it.title; }).join('|') || '∅' + q : '';
      if (key === shown) return; // same results: don't replay the slide-up
      shown = key;

      label.textContent = !q ? '둘러보기' : hits.length ? '검색 결과 ' + hits.length + '건' : '';
      list.textContent = '';
      if (!hits.length) {
        var none = document.createElement('li');
        none.className = 'search-empty';
        none.textContent = '‘' + input.value.trim() + '’에 맞는 내용이 없어요. 쇼룸에 문의해 주세요.';
        list.appendChild(none);
        return;
      }
      hits.forEach(function (it, i) {
        var li = document.createElement('li');
        li.style.setProperty('--i', i);
        var a = document.createElement('a');
        a.className = 'search-result';
        a.href = it.href;
        var title = document.createElement('span');
        title.className = 'search-result__title';
        title.textContent = it.title;
        var sub = document.createElement('span');
        sub.className = 'search-result__sub';
        sub.textContent = it.sub;
        a.appendChild(title);
        a.appendChild(sub);
        li.appendChild(a);
        list.appendChild(li);
      });
    }

    input.addEventListener('input', render);
    dlg.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var first = list.querySelector('a');
      if (first) first.click();
    });
    dlg.addEventListener('overlay:open', function () {
      input.value = '';
      shown = null;
      render();
    });
  }

  /* ---------- cart (on-page demo, nothing is sent anywhere) ---------- */

  function initCart() {
    var cart = {};
    var badge = document.querySelector('[data-cart-count]');
    var cartBtn = document.querySelector('[data-cart-button]');
    var cartIcon = document.querySelector('[data-cart-icon]');
    var list = document.querySelector('[data-cart-list]');
    var empty = document.querySelector('[data-cart-empty]');
    var total = document.querySelector('[data-cart-total]');
    if (!badge || !list) return;

    function count() {
      return Object.keys(cart).reduce(function (n, id) { return n + cart[id]; }, 0);
    }

    function setQty(id, qty) {
      if (qty <= 0) delete cart[id];
      else cart[id] = qty;
      render();
      grow();
    }

    function grow() {
      if (badge.hidden) return;
      badge.classList.remove('is-growing');
      void badge.offsetWidth;
      badge.classList.add('is-growing');
    }

    function render() {
      var n = count();
      badge.textContent = n;
      badge.hidden = n === 0;
      total.textContent = n;
      cartBtn.setAttribute('aria-label', '장바구니, ' + n + '개');
      empty.hidden = n > 0;
      list.textContent = '';
      Object.keys(cart).forEach(function (id) {
        var p = PRODUCTS[id];
        var li = document.createElement('li');
        li.className = 'cart-item';
        li.innerHTML =
          '<img class="cart-item__thumb" alt="">' +
          '<div class="cart-item__info">' +
            '<span class="cart-item__title"></span>' +
            '<span class="cart-item__price"></span>' +
            '<div class="qty">' +
              '<button type="button" data-qty="-1"><svg width="14" height="14" aria-hidden="true"><use href="#icon-minus"></use></svg></button>' +
              '<span></span>' +
              '<button type="button" data-qty="1"><svg width="14" height="14" aria-hidden="true"><use href="#icon-plus"></use></svg></button>' +
            '</div>' +
          '</div>';
        li.querySelector('img').src = p.img;
        li.querySelector('.cart-item__title').textContent = p.title;
        li.querySelector('.cart-item__price').textContent = p.price;
        li.querySelector('.qty span').textContent = cart[id];
        li.querySelector('[data-qty="-1"]').setAttribute('aria-label', p.title + ' 수량 줄이기');
        li.querySelector('[data-qty="1"]').setAttribute('aria-label', p.title + ' 수량 늘리기');
        li.querySelectorAll('[data-qty]').forEach(function (b) { b.setAttribute('data-id', id); });
        list.appendChild(li);
      });
    }

    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-qty]');
      if (!b) return;
      var id = b.getAttribute('data-id');
      setQty(id, (cart[id] || 0) + Number(b.getAttribute('data-qty')));
      var again = list.querySelector('[data-id="' + id + '"][data-qty="' + b.getAttribute('data-qty') + '"]');
      if (again) again.focus(); // keep focus on the button after re-render
    });

    document.querySelectorAll('[data-add-to-cart]').forEach(function (btn) {
      var dlg = btn.closest('dialog');
      var status = dlg && dlg.querySelector('[data-cart-status]');
      if (dlg) {
        dlg.addEventListener('overlay:open', function () {
          btn.classList.remove('is-added');
          btn.removeAttribute('aria-disabled');
          if (status) status.textContent = '';
        });
      }
      btn.addEventListener('click', function () {
        if (btn.classList.contains('is-added')) return;
        var id = btn.getAttribute('data-add-to-cart');
        btn.classList.add('is-added');
        btn.setAttribute('aria-disabled', 'true');
        if (status) status.textContent = '장바구니에 담았어요.';
        var img = dlg && dlg.querySelector('[data-fly-src]');
        // label slides first, then the photo flies, then the modal closes and the badge grows
        wait(150, function () {
          flyToCart(img, cartIcon, dlg, function () {
            var add = function () { setQty(id, (cart[id] || 0) + 1); };
            if (dlg) closeOverlay(dlg, add); else add();
          });
        });
      });
    });

    render();
  }

  // A square copy of the photo travels on a curve to the cart icon, shrinking into a circle:
  // .fly moves on X, .fly__y on Y (different easings make the arc), .fly__shape scales and rounds.
  // It is added inside the open dialog so it renders above the modal (top layer).
  function flyToCart(img, icon, layer, done) {
    if (!img || !icon || reduced()) { done(); return; }
    var from = img.getBoundingClientRect();
    var to = icon.getBoundingClientRect();
    var size = Math.min(from.width, from.height);
    var startX = from.left + from.width / 2;
    var startY = from.top + from.height / 2;

    var fly = document.createElement('div');
    fly.className = 'fly';
    fly.setAttribute('aria-hidden', 'true');
    fly.style.left = (startX - size / 2) + 'px';
    fly.style.top = (startY - size / 2) + 'px';
    fly.style.width = fly.style.height = size + 'px';
    fly.style.setProperty('--fly-x', (to.left + to.width / 2 - startX) + 'px');
    fly.style.setProperty('--fly-y', (to.top + to.height / 2 - startY) + 'px');
    fly.style.setProperty('--fly-scale', (to.width * 1.2 / size).toFixed(4));

    var inner = document.createElement('div');
    inner.className = 'fly__y';
    var shape = document.createElement('div');
    shape.className = 'fly__shape';
    var pic = document.createElement('img');
    pic.src = img.currentSrc || img.src;
    pic.alt = '';
    shape.appendChild(pic);
    inner.appendChild(shape);
    fly.appendChild(inner);
    (layer || document.body).appendChild(fly);

    void fly.offsetWidth;
    fly.classList.add('is-flying');
    setTimeout(function () { fly.remove(); done(); }, MS.fly);
  }

  // Booking form: no backend yet, so validate required fields and confirm on the page.
  function initBookingForm() {
    var form = document.querySelector('.booking-form');
    if (!form) return;
    var status = form.querySelector('[data-form-status]');
    var defaultMsg = status ? status.textContent : '';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstInvalid = null;
      form.querySelectorAll('[required]').forEach(function (el) {
        var ok = el.value.trim() !== '';
        el.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok && !firstInvalid) firstInvalid = el;
      });
      if (firstInvalid) {
        if (status) status.textContent = '이름과 연락처를 입력해 주세요.';
        firstInvalid.focus({ preventScroll: !!smoother });
        if (smoother) smoother.scrollTo(firstInvalid, true, 'center center');
        return;
      }
      // TODO: send the form data to a real endpoint.
      if (status) status.textContent = '신청이 접수되었습니다. ' + defaultMsg;
      form.reset();
    });
  }
})();
