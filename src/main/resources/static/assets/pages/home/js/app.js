/**
 * app.js — Main App Entry, Nav, Mobile Menu, Misc
 */

document.addEventListener('DOMContentLoaded', () => {
  // Init all modules
  ThemeController.init();
  ScrollEngine.init();
  EffectsEngine.init();
  AnimationsController.init();
  CursorEngine.init();

  initNav();
  initChartFilters();
  initSidebarNav();
  initQDots();
  initButtonLoading();
});

function initNav() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('mobile-open');
    hamburger.classList.toggle('open', open);

    if (open) {
      navLinks.style.cssText = `
        display:flex;flex-direction:column;position:fixed;
        top:72px;left:0;right:0;
        background:var(--nav-bg);backdrop-filter:blur(24px);
        border-bottom:1px solid var(--nav-border);
        padding:16px;gap:4px;z-index:999;
        animation:fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both;
      `;
    } else {
      navLinks.style.cssText = '';
    }
  });

  document.addEventListener('click', e => {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('mobile-open');
      hamburger.classList.remove('open');
      if (window.innerWidth <= 900) navLinks.style.cssText = '';
    }
  });
}

function initChartFilters() {
  document.querySelectorAll('.chart-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.chart-filters')?.querySelectorAll('.chart-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function initSidebarNav() {
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

function initQDots() {
  const dots = document.querySelectorAll('.q-dot');
  if (!dots.length) return;
  let current = 1;
  setInterval(() => {
    dots.forEach((d, i) => {
      d.classList.remove('current', 'done');
      if (i < current) d.classList.add('done');
      if (i === current) d.classList.add('current');
    });
    current = (current + 1) % dots.length;
  }, 2500);
}

function initButtonLoading() {
  const buttons = document.querySelectorAll('.btn');
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', e => {
      const href = btn.getAttribute('href');
      const openUrl = btn.getAttribute('data-open-url');
      const loadingText = btn.getAttribute('data-loading-text') || getLoadingText(btn);
      const delay = Number(btn.getAttribute('data-open-delay') || 1200);

      e.preventDefault();
      if (btn.classList.contains('is-loading')) return;

      const originalHtml = btn.innerHTML;
      btn.classList.add('is-loading');
      btn.setAttribute('data-original-html', originalHtml);
      btn.innerHTML = `<span class="btn-loader" aria-hidden="true"></span>${loadingText}`;

      setTimeout(() => {
        if (openUrl) {
          window.location.href = openUrl;
          return;
        }
        if (href && href !== '#') {
          if (href.startsWith('#')) {
            window.location.hash = href;
            // Restore after in-page jump so the button looks normal again
            setTimeout(() => restoreButton(btn), 200);
            return;
          }
          window.location.href = href;
          return;
        }
        restoreButton(btn);
      }, delay);
    });
  });
}

function restoreButton(btn) {
  btn.classList.remove('is-loading');
  const original = btn.getAttribute('data-original-html');
  if (original) btn.innerHTML = original;
}

function getLoadingText(btn) {
  const raw = btn.textContent.replace(/\s+/g, ' ').trim();
  const text = raw.replace(/^[^a-zA-Z]+/, '');

  if (/^sign in/i.test(text)) return 'Signing in...';
  if (/^get started/i.test(text)) return 'Getting started...';
  if (/^start/i.test(text)) return 'Starting...';
  if (/^explore/i.test(text)) return 'Loading features...';
  if (/^contact/i.test(text)) return 'Contacting...';
  if (/^talk/i.test(text)) return 'Connecting...';
  if (/^book/i.test(text)) return 'Booking...';
  if (/^learn/i.test(text)) return 'Loading...';
  return 'Loading...';
}
