const Signup = (() => {
  const form = document.getElementById('signup-form');
  const btn = document.getElementById('submit-btn');
  const btnText = btn?.querySelector('.btn-text');
  const confirmOverlay = document.getElementById('confirm-overlay');
  const confirmBtn = document.getElementById('confirm-btn');
  const confirmClose = document.getElementById('confirm-close');
  const overlay = document.getElementById('otp-overlay');
  const otpEmail = document.getElementById('otp-email');
  const email = document.getElementById('email');
  const fullName = document.getElementById('fullName');
  const password = document.getElementById('password');
  const verifyBtn = document.getElementById('verify-btn');
  const changeLink = document.getElementById('otp-change');
  const closeBtn = document.getElementById('otp-close');
  const confirmName = document.getElementById('confirm-name');
  const confirmEmail = document.getElementById('confirm-email');
  const confirmPassword = document.getElementById('confirm-password');

  const ROLE = 'student';
  let speedTimeout;

  function setButtonState(state, text) {
    btn.dataset.state = state;
    btn.classList.remove('is-loading', 'is-success');

    if (state === 'loading') {
      btn.classList.add('is-loading');
      btnText.textContent = text || 'Creating...';
      return;
    }

    if (state === 'success') {
      btn.classList.add('is-success');
      btnText.textContent = 'Verified';
      return;
    }

    btnText.textContent = text || 'Create Account';
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

  function openConfirm() {
    confirmName.textContent = fullName.value || '—';
    confirmEmail.textContent = email.value || '—';
    confirmPassword.textContent = password.value || '—';
    confirmOverlay.classList.add('is-open');
    confirmOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeConfirm() {
    confirmOverlay.classList.remove('is-open');
    confirmOverlay.setAttribute('aria-hidden', 'true');
  }

  function openOTP() {
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    otpEmail.textContent = email.value || 'your inbox';
    OTP.activate();
  }

  function closeOTP() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!Validation.validateFields()) return;

    speedMarquee();
    console.log(`Initializing Student Registration (Role: ${ROLE})`);
    setButtonState('loading', 'Creating...');
    setTimeout(() => {
      setButtonState('default', 'Create Account');
      openConfirm();
    }, 1000);
  }

  function handleConfirm() {
    speedMarquee();
    closeConfirm();
    openOTP();
  }

  function handleVerify() {
    if (!OTP.validateOTP()) return;
    speedMarquee();
    verifyBtn.textContent = 'Verifying...';
    verifyBtn.classList.add('is-loading');
    setTimeout(() => {
      verifyBtn.classList.remove('is-loading');
      verifyBtn.textContent = 'Verified';
      setButtonState('success');
      setTimeout(() => {
        // Redirect NEW students always to onboarding
        window.location.href = '../pages/welcome-onboarding.html';
      }, 800);
    }, 1000);
  }

  function handleToggle(e) {
    const btnToggle = e.target.closest('.toggle-visibility');
    if (!btnToggle) return;
    const targetId = btnToggle.dataset.target;
    const mode = btnToggle.dataset.mode || 'input';
    if (mode === 'text') {
      const target = document.getElementById(targetId);
      if (!target) return;
      const isHidden = target.dataset.hidden !== 'false';
      target.dataset.hidden = isHidden ? 'false' : 'true';
      target.textContent = isHidden ? (password.value || '—') : '•'.repeat(Math.min(password.value.length, 10));
      btnToggle.textContent = isHidden ? 'Hide' : 'Show';
      return;
    }

    const input = document.getElementById(targetId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btnToggle.textContent = isPassword ? 'Hide' : 'Show';
  }

  function initCardEffects() {
    const card = document.querySelector('.card');
    const spotlight = document.querySelector('.card-spotlight');
    if (!card || !spotlight) return;

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      spotlight.style.setProperty('--x', `${x}px`);
      spotlight.style.setProperty('--y', `${y}px`);

      // Tilt effect
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 25;
      const rotateY = (centerX - x) / 25;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });
  }

  function init() {
    ThemeController.init();
    initCardEffects();
    if (!form) return;
    form.addEventListener('submit', handleSubmit);
    confirmBtn.addEventListener('click', handleConfirm);
    confirmClose.addEventListener('click', closeConfirm);
    confirmOverlay.addEventListener('click', e => {
      if (e.target === confirmOverlay) closeConfirm();
    });

    verifyBtn.addEventListener('click', handleVerify);
    changeLink.addEventListener('click', e => {
      e.preventDefault();
      closeOTP();
    });
    closeBtn.addEventListener('click', closeOTP);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeOTP();
    });

    document.addEventListener('click', handleToggle);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Signup.init);
