/**
 * Admin Gateway Module
 * Connected to Spring Boot Backend
 */
const AdminLogin = (() => {

  const form = document.getElementById('admin-login-form');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn?.querySelector('.btn-text');
  const card = document.querySelector('.card');
  const adminKeyInput = document.getElementById('admin-key');
  const passwordInput = document.getElementById('password');
  const rememberCheckbox = document.getElementById('remember-admin');
  const loginErrorBox = document.getElementById('admin-login-error');
  const loginErrorMessage = document.getElementById('admin-login-error-message');
  const REMEMBER_KEY = 'remember.admin.identifier';

  function sanitizeUserForStorage(raw) {
    const user = raw && typeof raw === "object" ? { ...raw } : {};
    const heavyImage = String(user.profileImage || "").trim();
    if (heavyImage.startsWith("data:")) {
      user.profileImage = "";
    }
    return {
      id: user.userId || user.id || null,
      userId: user.userId || user.id || null,
      name: user.name || "",
      email: user.email || "",
      role: user.role || "ADMIN",
      phone: user.phone || "",
      department: user.department || "",
      designation: user.designation || "",
      qualification: user.qualification || "",
      employeeId: user.employeeId || "",
      profileImage: user.profileImage || ""
    };
  }

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
    hydrateRememberedIdentifier();
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
    adminKeyInput?.addEventListener('input', clearError);
    passwordInput?.addEventListener('input', clearError);

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
    clearError();

    // IMPORTANT: match HTML IDs
    const email = adminKeyInput?.value.trim();
    const password = passwordInput?.value.trim();
    const remember = Boolean(rememberCheckbox?.checked);

    if (!email || !password) {
      showError("Please enter your admin key and password.");
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

      persistAuthData({
        token,
        role: data.role,
        user: sanitizeUserForStorage(data),
        remember
      });
      persistRememberedIdentifier(email, remember);

      setSuccess();

      setTimeout(() => {
        window.location.href = "admin-dashboard.html";
      }, 1000);

    } catch (error) {
      console.error("Admin Login Error:", error);
      setLoading(false);
      showError(error.message);
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

  function showError(msg) {
    const finalMessage = normalizeLoginErrorMessage(msg);
    if (loginErrorMessage) loginErrorMessage.textContent = finalMessage;
    loginErrorBox?.removeAttribute('hidden');
  }

  function clearError() {
    if (loginErrorMessage) loginErrorMessage.textContent = '';
    loginErrorBox?.setAttribute('hidden', 'hidden');
  }

  function normalizeLoginErrorMessage(message) {
    const text = String(message || '').toLowerCase();
    if (text.includes('invalid credentials')) {
      return 'Invalid credentials. Please verify your email and password.';
    }
    return message || 'Unable to connect to server. Please try again.';
  }

  function persistRememberedIdentifier(identifier, remember) {
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, identifier);
      return;
    }
    localStorage.removeItem(REMEMBER_KEY);
  }

  function hydrateRememberedIdentifier() {
    const remembered = String(localStorage.getItem(REMEMBER_KEY) || '').trim();
    if (!remembered || !adminKeyInput) return;
    adminKeyInput.value = remembered;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  function persistAuthData({ token, role, user, remember }) {
    const primary = remember ? localStorage : sessionStorage;
    const secondary = remember ? sessionStorage : localStorage;

    ['token', 'accessToken', 'role', 'user', 'teacher'].forEach((key) => {
      secondary.removeItem(key);
    });

    primary.setItem('token', token);
    primary.setItem('accessToken', token);
    primary.setItem('role', role);
    primary.setItem('user', JSON.stringify(user));
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
