const Theme = (() => {
  const buttons = document.querySelectorAll('.theme-btn');
  const root = document.documentElement;

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === theme));
    localStorage.setItem('sem-theme', theme);
  }

  function init() {
    const stored = localStorage.getItem('sem-theme');
    const theme = stored || 'dark';
    setTheme(theme);

    buttons.forEach(btn => {
      btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Theme.init);
