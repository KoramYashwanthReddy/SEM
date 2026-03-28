const Animations = (() => {
  const card = document.querySelector('.card');

  function init() {
    if (!card) return;
    card.classList.add('is-ready');
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Animations.init);
