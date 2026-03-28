/**
 * Professional Student Login Module
 * Connected to Spring Boot Backend
 */
const Login = (() => {

  // Elements
  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn?.querySelector('.btn-text');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const card = document.querySelector('.card');
  const ROLE = 'STUDENT';
  let speedTimeout;

  /**
   * Initialize Module
   */
  function init() {
    if (typeof ThemeController !== "undefined") {
      ThemeController.init();
    }
    setupListeners();
    setup3DCardTilt();
    console.log('Student Login Module Initialized');
  }

  /**
   * Setup Event Listeners
   */
  function setupListeners() {

    // Password visibility
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

  /**
   * Background Speed Interaction
   */
  function speedMarquee() {
    document.documentElement.style.setProperty('--marquee-speed', '0.5s');
    document.documentElement.style.setProperty('--marquee-speed-fast', '0.4s');

    clearTimeout(speedTimeout);
    speedTimeout = setTimeout(() => {
      document.documentElement.style.setProperty('--marquee-speed', '5s');
      document.documentElement.style.setProperty('--marquee-speed-fast', '4.5s');
    }, 1500);
  }

  /**
   * Handle Login
   */
  async function handleLogin(e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showError('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {

      const response = await fetch('http://localhost:50700/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Save token
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('user', JSON.stringify(data));

      setSuccess();

      // Redirect based on role
      setTimeout(() => {
        if (data.role === 'STUDENT') {
          window.location.href = 'student-dashboard.html';
        } else {
          window.location.href = 'index.html';
        }
      }, 1000);

    } catch (error) {
      setLoading(false);
      showError(error.message || 'Unable to connect to server');
    }
  }

  function setLoading(isLoading) {
    if (!submitBtn) return;

    if (isLoading) {
      submitBtn.classList.add('loading');
      if (btnText) btnText.textContent = 'Authenticating...';
      submitBtn.disabled = true;
    } else {
      submitBtn.classList.remove('loading');
      if (btnText) btnText.textContent = 'Sign In';
      submitBtn.disabled = false;
    }
  }

  function setSuccess() {
    submitBtn.classList.remove('loading');
    submitBtn.classList.add('success');
    if (btnText) btnText.textContent = 'Login Successful';
  }

  function showError(msg) {
    console.warn('Login Error:', msg);
    alert(msg); // you can replace with toast UI
  }

  /**
   * 3D Card Tilt Effect
   */
  function setup3DCardTilt() {
    const wrapper = card?.parentElement;
    if (!wrapper || !card) return;

    wrapper.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = (y - centerY) / 30;
      const rotateY = (centerX - x) / 30;

      card.style.transform =
        `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    wrapper.addEventListener('mouseleave', () => {
      card.style.transform =
        'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });
  }

  return { init };

})();

// Initialize
document.addEventListener('DOMContentLoaded', Login.init);