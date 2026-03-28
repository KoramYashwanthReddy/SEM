/**
 * theme.js — Full Theme Engine: Dark / Light / System
 */

const ThemeController = (() => {
  const STORAGE_KEY = 'nexam_theme';
  const MODES = ['dark', 'light', 'system'];
  let currentMode = 'dark';

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }

  function setMode(mode) {
    if (!MODES.includes(mode)) return;
    currentMode = mode;
    localStorage.setItem(STORAGE_KEY, mode);
    applyTheme(mode);
    updateToggleUI();
    dispatchEvent(new CustomEvent('themechange', { detail: { mode, resolved: mode === 'system' ? getSystemTheme() : mode } }));
  }

  function updateToggleUI() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === currentMode);
    });
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
    currentMode = MODES.includes(saved) ? saved : 'dark';
    applyTheme(currentMode);

    // System theme watcher
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (currentMode === 'system') applyTheme('system');
    });

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
