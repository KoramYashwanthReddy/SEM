/**
 * Professional Login Module
 * Handles form validation, interactive states, and theme syncing.
 * Refactored to match Signup design patterns.
 */
const Login = (() => {
  // Elements
  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn?.querySelector('.btn-text');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const card = document.querySelector('.card');
  const ROLE = 'student'; // Terminal Role
  let speedTimeout;

  /**
   * Initialize Module
   */
  function init() {
    ThemeController.init(); // Initialize the core theme engine
    setupListeners();
    setup3DCardTilt();
    console.log('Login Module Initialized');
  }

  /**
   * Setup Event Listeners
   */
  function setupListeners() {
    // Password visibility toggles
    document.querySelectorAll('.toggle-visibility').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target || 'password');
        const isPassword = input.getAttribute('type') === 'password';
        input.setAttribute('type', isPassword ? 'text' : 'password');
        btn.textContent = isPassword ? 'Hide' : 'Show';
      });
    });

    // Form Submission
    form?.addEventListener('submit', handleLogin);

    // Speed up marquee on interaction
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
   * Handle Login Process
   */
  async function handleLogin(e) {
    e.preventDefault();
    
    // Simple Validation check
    if (!emailInput.value || !passwordInput.value) {
      showError('Please fill in all fields');
      return;
    }

    // 2. Loading State
    setLoading(true);

    try {
      // 3. Mock API Call with Role Context
      console.log(`Authenticating as: ${ROLE}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 4. Success State
      setSuccess();
      
      // 5. Redirect
      // 5. Direct Redirect to Welcome Page
      setTimeout(() => {
        window.location.href = 'student-dashboard.html'; 
      }, 1000);

    } catch (error) {
      setLoading(false);
      showError('Unable to connect. Please try again.');
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
    if (!submitBtn) return;
    submitBtn.classList.remove('loading');
    submitBtn.classList.add('success');
    if (btnText) btnText.textContent = 'Success';
  }

  function showError(msg) {
    console.warn('Login Error:', msg);
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
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    wrapper.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });
  }

  return { init };
})();

// Initialize
document.addEventListener('DOMContentLoaded', Login.init);
