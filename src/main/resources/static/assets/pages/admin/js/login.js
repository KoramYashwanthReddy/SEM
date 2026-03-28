/**
 * Admin Gateway Module
 * Connected to Spring Boot Backend
 */
const AdminLogin = (() => {

  const form = document.getElementById('admin-login-form');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn?.querySelector('.btn-text');
  const card = document.querySelector('.card');

  function init() {
    if (typeof ThemeController !== "undefined") {
      ThemeController.init();
    }
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

    // IMPORTANT: match HTML IDs
    const email = document.getElementById('admin-key').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
      alert("Please enter admin key and password");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:54298/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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

      if (data.role !== "ADMIN") {
        throw new Error("Access denied. Admin only.");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("user", JSON.stringify(data));

      setSuccess();

      setTimeout(() => {
        window.location.href = "admin-dashboard.html";
      }, 1000);

    } catch (error) {
      console.error("Admin Login Error:", error);
      setLoading(false);
      alert(error.message);
    }
  }

  function setLoading(isLoading) {
    submitBtn.classList.toggle('loading', isLoading);
    if (btnText) {
      btnText.textContent =
        isLoading ? 'Bypassing Firewall...' : 'Bypass Firewall';
    }
    submitBtn.disabled = isLoading;
  }

  function setSuccess() {
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

document.addEventListener('DOMContentLoaded', AdminLogin.init);