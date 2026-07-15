/**
 * theme.js — Full Theme Engine: Dark / Light / System
 */

const ThemeController = (() => {
  const STORAGE_KEY = 'nexam_theme';
  const MODES = ['dark', 'light', 'system'];
  const DEFAULT_MODE = 'light';
  let currentMode = DEFAULT_MODE;
  let systemMedia = null;
  let initialized = false;

  const forceLightPages = [
    'index.html',
    'login.html',
    'signup.html',
    'welcome-onboarding.html',
    'forgot-password.html',
    'reset-password.html'
  ];

  function shouldForceLight() {
    const path = window.location.pathname.toLowerCase();
    if (path === '/' || path === '' || path.endsWith('/')) return true;
    return forceLightPages.some(page => path.includes(page.toLowerCase()));
  }

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    const resolvedTheme = shouldForceLight() ? 'light' : (theme === 'system' ? getSystemTheme() : theme);
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.setAttribute('data-theme-mode', shouldForceLight() ? 'light' : theme);
    document.documentElement.style.colorScheme = resolvedTheme;
    return resolvedTheme;
  }

  function setMode(mode) {
    if (shouldForceLight()) return;
    if (!MODES.includes(mode)) return;
    currentMode = mode;
    localStorage.setItem(STORAGE_KEY, mode);
    const resolved = applyTheme(mode);
    updateToggleUI();
    window.dispatchEvent(new CustomEvent('themechange', { detail: { mode, resolved } }));
  }

  function updateToggleUI() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === currentMode);
    });
  }

  function init() {
    if (initialized) {
      updateToggleUI();
      return;
    }
    initialized = true;

    if (shouldForceLight()) {
      currentMode = 'light';
      applyTheme('light');
      return;
    }

    const saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_MODE;
    currentMode = MODES.includes(saved) ? saved : DEFAULT_MODE;
    applyTheme(currentMode);

    // System theme watcher
    systemMedia = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemThemeChange = () => {
      if (currentMode === 'system') {
        const resolved = applyTheme('system');
        window.dispatchEvent(new CustomEvent('themechange', { detail: { mode: 'system', resolved } }));
      }
    };
    if (typeof systemMedia.addEventListener === 'function') {
      systemMedia.addEventListener('change', onSystemThemeChange);
    } else if (typeof systemMedia.addListener === 'function') {
      systemMedia.addListener(onSystemThemeChange);
    }

    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setMode(btn.dataset.theme);
        createRipple(btn);
      });
    });

    updateToggleUI();
  }

  function createRipple(el) {
    const rect = el.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position:absolute;width:40px;height:40px;background:rgba(59,130,246,0.25);
      border-radius:50%;transform:scale(0);animation:rippleAnim 0.5s linear;
      left:${rect.width/2-20}px;top:${rect.height/2-20}px;pointer-events:none;
    `;
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  return { init, setMode, getMode: () => currentMode };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ThemeController.init(), { once: true });
} else {
  ThemeController.init();
}
