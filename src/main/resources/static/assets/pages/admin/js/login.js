/**
 * Admin Gateway Module
 * Centered single-column cyber design.
 */
const AdminLogin = (() => {
  const form = document.getElementById('admin-login-form');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn?.querySelector('.btn-text');
  const card = document.querySelector('.card');
  const ROLE = 'admin'; // Master Role

  function init() {
    ThemeController.init();
    setupListeners();
    setup3DCardTilt();
    console.log('Admin Security Protocol Engaged');
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
    
    // Admin spotlight tracking (Unique to Admin Design)
    card?.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
    });
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    console.log(`Bypassing Firewall with Security Role: ${ROLE}`);
    await new Promise(r => setTimeout(r, 2000));
    setSuccess();
    setTimeout(() => window.location.href = 'admin-dashboard.html', 1000);
  }

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.classList.toggle('loading', isLoading);
    if (btnText) btnText.textContent = isLoading ? 'Bypassing Firewall...' : 'Bypass Firewall';
    submitBtn.disabled = isLoading;
  }

  function setSuccess() {
    if (!submitBtn) return;
    submitBtn.classList.remove('loading');
    submitBtn.classList.add('success');
    if (btnText) btnText.textContent = 'ACCESS GRANTED';
  }

  function setup3DCardTilt() {
    const wrapper = card?.parentElement;
    if (!wrapper || !card) return;
    wrapper.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateX = (y - (rect.height / 2)) / 40;
      const rotateY = ((rect.width / 2) - x) / 40;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    wrapper.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', AdminLogin.init);
