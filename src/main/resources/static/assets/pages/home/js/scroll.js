/**
 * scroll.js — Smooth scroll, progress bar, parallax, reveal
 */

const ScrollEngine = (() => {
  let ticking = false;
  let lastScrollY = 0;

  function updateProgress() {
    const progress = document.getElementById('scroll-progress');
    if (!progress) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = pct + '%';
  }

  function updateNavbar() {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }

  function updateActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const links = document.querySelectorAll('.nav-links a');
    let current = '';

    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 120) current = s.id;
    });

    links.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) link.classList.add('active');
    });
  }

  function updateParallax() {
    const y = window.scrollY;
    const orbs = document.querySelectorAll('.orb');
    orbs.forEach((orb, i) => {
      const speed = 0.03 + i * 0.02;
      orb.style.transform = `translateY(${y * speed}px)`;
    });
  }

  function initReveal() {
    const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    reveals.forEach(el => io.observe(el));
  }

  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(el => io.observe(el));
  }

  function animateCounter(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const duration = 2000;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = eased * target;

      el.textContent = prefix + (Number.isInteger(target) ? Math.round(current) : current.toFixed(1)) + suffix;

      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = prefix + target + suffix;
    }

    requestAnimationFrame(update);
  }

  function initSmoothLinks() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          const top = target.getBoundingClientRect().top + window.scrollY - 72;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  }

  function initHorizontalScroll() {
    const tracks = document.querySelectorAll('.h-scroll-wrapper');
    tracks.forEach(wrapper => {
      let isDragging = false, startX = 0, scrollLeft = 0;

      wrapper.addEventListener('mousedown', e => {
        isDragging = true;
        startX = e.pageX - wrapper.offsetLeft;
        scrollLeft = wrapper.scrollLeft;
        wrapper.style.userSelect = 'none';
      });

      wrapper.addEventListener('mouseleave', () => isDragging = false);
      wrapper.addEventListener('mouseup', () => {
        isDragging = false;
        wrapper.style.userSelect = '';
      });

      wrapper.addEventListener('mousemove', e => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - wrapper.offsetLeft;
        const walk = (x - startX) * 1.5;
        wrapper.scrollLeft = scrollLeft - walk;
      });
    });
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateProgress();
        updateNavbar();
        updateActiveNav();
        updateParallax();
        ticking = false;
      });
      ticking = true;
    }
  }

  function init() {
    window.addEventListener('scroll', onScroll, { passive: true });
    initReveal();
    initCounters();
    initSmoothLinks();
    initHorizontalScroll();
    updateProgress();
    updateNavbar();
  }

  return { init };
})();
