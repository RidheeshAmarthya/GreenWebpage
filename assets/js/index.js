

// Hide fixed background video when header is off-screen to avoid footer bleed
(function () {
  var header = document.getElementById('header17-3');
  if (!header) return;
  var video;
  function findVideo() {
    video = header.querySelector('video');
  }
  function updateVisibility() {
    if (!video) { findVideo(); if (!video) return; }

    // Add playing class when video starts to fade it in over the fallback
    if (video.readyState >= 2 && !video.classList.contains('playing')) {
      video.classList.add('playing');
    }

    var rect = header.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var visible = rect.bottom > 0 && rect.top < vh;
    video.style.visibility = visible ? 'visible' : 'hidden';
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!video) findVideo();
        if (!video) return;

        if (entry.isIntersecting && video.readyState >= 2) {
          video.classList.add('playing');
        }

        video.style.visibility = entry.isIntersecting ? 'visible' : 'hidden';
      });
    }, { threshold: 0.01 });
    io.observe(header);
  } else {
    document.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { findVideo(); updateVisibility(); });
  } else {
    findVideo(); updateVisibility();
  }
  setTimeout(function () { findVideo(); updateVisibility(); }, 0);
})();

// Infinite swipe-to-drag with seamless looping; JS drives auto-scroll (no CSS anim)
(function () {
  function duplicateOnce(wrapper) {
    if (wrapper.dataset.loopCloned === '1') return;
    var children = Array.prototype.slice.call(wrapper.children);
    if (children.length === 0) return;
    var frag = document.createDocumentFragment();
    children.forEach(function (node) { frag.appendChild(node.cloneNode(true)); });
    wrapper.appendChild(frag);
    wrapper.dataset.loopCloned = '1';
  }

  function initScrollable(container) {
    var wrapper = container.querySelector('.brands-scroll-wrapper');
    if (!wrapper) return;

    // Prepare seamless content and prevent image ghost-drag
    var originalCount = wrapper.children.length;
    wrapper.dataset.originalCount = String(originalCount);
    duplicateOnce(wrapper);
    // Disable CSS animation to avoid transform/scrollLeft conflicts
    wrapper.style.animation = 'none';
    // Improve iOS momentum scrolling behavior (no effect elsewhere)
    try { container.style.webkitOverflowScrolling = 'touch'; } catch (_) { }
    container.querySelectorAll('img').forEach(function (img) {
      img.setAttribute('draggable', 'false');
      img.addEventListener('dragstart', function (e) { e.preventDefault(); });
    });

    var isDragging = false;
    var startX = 0;
    var startScrollLeft = 0;
    var idleTimer = null;
    var autoRAF = 0;
    var autoInterval = 0;
    var autoPos = 0; // high-precision accumulator for smooth movement
    var lastRafTick = 0; // last time rAF advanced (for fallback)
    var isTouch = (("ontouchstart" in window) || (navigator.maxTouchPoints > 0));
    var speedPxPerSec = isTouch ? 60 : 40;
    var lastTime = 0;
    var momentumRAF = 0;
    var isMomentum = false;
    var velocity = 0; // px/s, updated during drag
    var lastMoveX = 0;
    var lastMoveTime = 0;
    var decelPxPerSec2 = isTouch ? 7000 : 6000; // momentum deceleration (higher = more friction)

    function cycleWidth() {
      // Robust width of one full set (half the duplicated track)
      return Math.max(1, Math.floor(wrapper.scrollWidth / 2));
    }

    function wrapIfNeeded() {
      var w = cycleWidth();
      if (container.scrollLeft >= w) {
        container.scrollLeft -= w;
      } else if (container.scrollLeft <= 0) {
        container.scrollLeft += w;
      }
    }

    function stopAuto() {
      cancelAnimationFrame(autoRAF);
      clearInterval(autoInterval);
      autoInterval = 0;
    }

    function startAuto() {
      stopAuto();
      lastTime = performance.now();
      lastRafTick = lastTime;
      autoPos = container.scrollLeft;
      function advance(dt) {
        var w = cycleWidth();
        if (w > 0) {
          autoPos += speedPxPerSec * dt;
          autoPos = ((autoPos % w) + w) % w;
          container.scrollLeft = Math.round(autoPos);
        }
      }
      autoRAF = requestAnimationFrame(function step(now) {
        var dt = Math.min(50, now - lastTime) / 1000;
        lastTime = now;
        advance(dt);
        lastRafTick = now;
        autoRAF = requestAnimationFrame(step);
      });
      // Fallback interval for browsers throttling rAF
      autoInterval = setInterval(function () {
        var now = performance.now();
        if (!document.hidden && now - lastRafTick > 200) advance(0.05);
      }, 50);
    }

    function stopMomentum() {
      cancelAnimationFrame(momentumRAF);
      isMomentum = false;
    }

    function startMomentum() {
      stopMomentum();
      var v = velocity;
      if (Math.abs(v) < 20) {
        // too slow; just resume auto soon
        clearTimeout(idleTimer);
        idleTimer = setTimeout(function () { startAuto(); }, 150);
        return;
      }
      isMomentum = true;
      var last = performance.now();
      momentumRAF = requestAnimationFrame(function step(now) {
        var dt = Math.min(100, now - last) / 1000;
        last = now;
        var w = cycleWidth();
        if (w > 0) {
          var pos = container.scrollLeft + v * dt;
          pos = ((pos % w) + w) % w;
          container.scrollLeft = pos;
        }
        // Apply constant deceleration toward 0
        var s = v > 0 ? 1 : -1;
        var newV = v - s * decelPxPerSec2 * dt;
        if ((newV > 0) !== (v > 0) || Math.abs(newV) < 22) {
          isMomentum = false;
          momentumRAF = 0;
          clearTimeout(idleTimer);
          idleTimer = setTimeout(function () { startAuto(); }, 150);
          return;
        }
        v = newV;
        momentumRAF = requestAnimationFrame(step);
      });
    }

    function onDown(e) {
      isDragging = true;
      stopAuto();
      stopMomentum();
      startX = (e.touches ? e.touches[0].clientX : e.clientX);
      startScrollLeft = container.scrollLeft;
      autoPos = container.scrollLeft;
      velocity = 0;
      lastMoveX = startX;
      lastMoveTime = performance.now();
      container.classList.add('is-dragging');
      container.style.cursor = 'grabbing';
      container.style.userSelect = 'none';
      e.preventDefault();
    }

    function onMove(e) {
      if (!isDragging) return;
      var x = (e.touches ? e.touches[0].clientX : e.clientX);
      var dx = x - startX;
      var w = cycleWidth();
      var target = startScrollLeft - dx;
      // Normalize position to [0, w) so it never hits a hard end
      var pos = ((target % w) + w) % w;
      container.scrollLeft = pos;
      // update velocity (px/s) using pointer delta (opposite sign of scroll)
      var now = performance.now();
      var dt = now - lastMoveTime;
      if (dt > 0) {
        var instV = -(x - lastMoveX) * 1000 / dt; // -dx/dt
        velocity = velocity * 0.8 + instV * 0.2; // low-pass filter
        lastMoveX = x;
        lastMoveTime = now;
      }
      e.preventDefault();
    }

    function onUp() {
      if (!isDragging) return;
      isDragging = false;
      container.classList.remove('is-dragging');
      container.style.cursor = '';
      container.style.userSelect = '';
      clearTimeout(idleTimer);
      startMomentum();
    }

    // Start near middle of cycle and nudge to ensure layout updates
    try { container.scrollLeft = cycleWidth(); } catch (_) { }
    setTimeout(function () { container.scrollLeft = (container.scrollLeft + 1) | 0; container.scrollLeft = (container.scrollLeft - 1) | 0; }, 50);

    // Recalculate and start auto after images load and on resize
    function recalibrate() {
      var w = cycleWidth();
      if (w > 0) {
        container.scrollLeft = ((container.scrollLeft % w) + w) % w;
        autoPos = container.scrollLeft;
      }
    }
    window.addEventListener('load', function () { recalibrate(); startAuto(); });
    window.addEventListener('resize', function () { recalibrate(); });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { recalibrate(); startAuto(); }
    });
    window.addEventListener('pageshow', function () { recalibrate(); startAuto(); });
    window.addEventListener('orientationchange', function () {
      setTimeout(function () { recalibrate(); startAuto(); }, 150);
    });
    // Start auto in case images are already loaded
    startAuto();

    // Bind events
    container.addEventListener('mousedown', onDown, { passive: false });
    container.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    window.addEventListener('mouseleave', onUp);
  }

  function initAll() {
    document.querySelectorAll('.scrollable-brands-container').forEach(initScrollable);

    // Delay hero video loading - Only happens once on page load
    window.addEventListener('load', function () {
      setTimeout(function () {
        var hero = document.getElementById('header17-3');
        var videoUrl = hero ? hero.getAttribute('data-video-delayed') : null;

        if (videoUrl && !document.querySelector('.delayed-hero-video')) {
          var video = document.createElement('video');
          video.className = 'delayed-hero-video';
          video.src = videoUrl;
          video.autoplay = true;
          video.loop = true;
          video.muted = true;
          video.playsInline = true;
          video.setAttribute('muted', '');
          video.setAttribute('playsinline', '');
          video.setAttribute('loop', '');
          video.preload = 'auto'; // Essential for seamless looping

          // Styles for full cover - Instant visibility to avoid loop gaps
          Object.assign(video.style, {
            position: 'absolute',
            left: '50%',
            top: '50%',
            minWidth: '100%',
            minHeight: '100%',
            width: 'auto',
            height: 'auto',
            transform: 'translate(-50%, -50%)',
            zIndex: '0',
            objectFit: 'cover'
          });

          hero.prepend(video);
        }
      }, 2000);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
