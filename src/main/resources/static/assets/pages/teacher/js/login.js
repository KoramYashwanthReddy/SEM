/**
 * Teacher Terminal Module
 * Connected to Spring Boot Backend
 */
const TeacherLogin = (() => {

  const form = document.getElementById('teacher-login-form');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn?.querySelector('.btn-text');
  let speedTimeout;

  function init() {
    if (typeof ThemeController !== "undefined") {
      ThemeController.init();
    }
    setupListeners();
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

    // IMPORTANT: match HTML IDs
    const email = document.getElementById('teacher-id')?.value.trim();
    const password = document.getElementById('password')?.value.trim();

    if (!email || !password) {
      alert("Please enter teacher credentials");
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

      // Role check
      if (data.role !== "TEACHER") {
        throw new Error("Access denied. Teacher only.");
      }

      // Save session
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("user", JSON.stringify(data));

      setSuccess();

      setTimeout(() => {
        window.location.href = "teacher-dashboard.html";
      }, 1000);

    } catch (error) {
      console.error("Teacher Login Error:", error);
      setLoading(false);
      alert(error.message);
    }
  }

  function setLoading(isLoading) {
    submitBtn.classList.toggle('loading', isLoading);

    if (btnText) {
      btnText.textContent =
        isLoading ? 'Authenticating Console...' : 'Initialize Terminal';
    }

    submitBtn.disabled = isLoading;
  }

  function setSuccess() {
    submitBtn.classList.remove('loading');
    submitBtn.classList.add('success');

    if (btnText) {
      btnText.textContent = 'Gateway Established';
    }
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', TeacherLogin.init);