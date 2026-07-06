(() => {
  const buttons = [
    { id: 'card-student', url: 'login.html' },
    { id: 'card-teacher', url: 'teacher-login.html' },
    { id: 'card-admin', url: 'admin-login.html' }
  ];

  let navigating = false;

  const setReadyState = () => {
    document.body.classList.add('js-enhanced');
    requestAnimationFrame(() => {
      document.body.classList.add('is-ready');
    });
  };

  const go = (url) => {
    if (navigating) return;
    navigating = true;
    document.body.classList.add('is-exiting');
    window.location.href = url;
  };

  const initRoleButtons = () => {
    buttons.forEach(({ id, url }) => {
      const card = document.getElementById(id);
      if (!card) return;

      const btn = card.querySelector('button');
      if (!btn) return;

      btn.addEventListener('click', () => {
        card.classList.add('card-selected');
        btn.classList.add('loading');
        setTimeout(() => go(url), 220);
      });

      card.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        card.classList.add('card-selected');
        setTimeout(() => go(url), 220);
      });
    });
  };

  const initTheme = () => {
    if (window.ThemeController && typeof window.ThemeController.init === 'function') {
      window.ThemeController.init();
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initRoleButtons();
    setReadyState();
  });
})();
