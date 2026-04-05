/**
 * Admin Gateway Module
 * Connected to Spring Boot Backend
 */
const AdminLogin = (() => {

  const form = document.getElementById('admin-login-form');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn?.querySelector('.btn-text');
  const card = document.querySelector('.card');

  async function readErrorMessage(response) {
    const fallback = response?.statusText || `Request failed (${response?.status || "unknown"})`;
    try {
      const raw = await response.clone().text();
      if (!raw) return fallback;
      const contentType = String(response.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("application/json")) {
        const data = JSON.parse(raw);
        return String(data?.message || data?.error || data?.cause || data?.detail || fallback).trim() || fallback;
      }
      return String(raw).trim() || fallback;
    } catch (_e) {
      return fallback;
    }
  }

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
      const apiBase = /^https?:/i.test(window.location.origin)
        ? window.location.origin
        : "http://localhost:8080";

      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const data = await response.json();

      if (data.role !== "ADMIN") {
        throw new Error("Access denied. Admin only.");
      }

      const token = data.accessToken || data.token || data.jwt;
      if (!token) {
        throw new Error("Invalid authentication response");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("accessToken", token);
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
