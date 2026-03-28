/**
 * Teacher Terminal Module
 * Reversed split-column design logic.
 */
const TeacherLogin = (() => {
  const form = document.getElementById('teacher-login-form');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn?.querySelector('.btn-text');
  const card = document.querySelector('.card');
  const ROLE = 'teacher'; // Terminal Role
  let speedTimeout;

  function init() {
    ThemeController.init();
    setupListeners();
    // 3D Tilt removed as per request
    console.log('Teacher Login Console Active');
  }

  function setupListeners() {
    document.querySelectorAll('.toggle-visibility').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target || 'password');
        const isPassword = input.getAttribute('type') === 'password';
        input.setAttribute('type', isPassword ? 'text' : 'password');
        btn.textContent = isPassword ? 'Hide' : 'Show';
      });
    });

    form?.addEventListener('submit', handleLogin);
    submitBtn?.addEventListener('click', speedMarquee);
  }

  function speedMarquee() {
    document.documentElement.style.setProperty('--marquee-speed', '0.5s');
    document.documentElement.style.setProperty('--marquee-speed-fast', '0.4s');
    clearTimeout(speedTimeout);
    speedTimeout = setTimeout(() => {
      document.documentElement.style.setProperty('--marquee-speed', '5s');
      document.documentElement.style.setProperty('--marquee-speed-fast', '4.5s');
    }, 1500);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    console.log(`Establishing Teacher Session with Role: ${ROLE}`);
    await new Promise(r => setTimeout(r, 2000));
    setSuccess();
    setTimeout(() => window.location.href = 'teacher-dashboard.html', 1000);
  }

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.classList.toggle('loading', isLoading);
    if (btnText) btnText.textContent = isLoading ? 'Authenticating Console...' : 'Initialize Terminal';
    submitBtn.disabled = isLoading;
  }

  function setSuccess() {
    if (!submitBtn) return;
    submitBtn.classList.remove('loading');
    submitBtn.classList.add('success');
    if (btnText) btnText.textContent = 'Gateway Established';
  }

  function setup3DCardTilt() {
    const wrapper = card?.parentElement;
    if (!wrapper || !card) return;
    wrapper.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateX = (y - (rect.height / 2)) / 30;
      const rotateY = ((rect.width / 2) - x) / 30;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    wrapper.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', TeacherLogin.init);
