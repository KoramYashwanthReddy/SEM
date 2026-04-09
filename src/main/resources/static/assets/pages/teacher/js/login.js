/**
 * Teacher Terminal Module
 * Connected to Spring Boot Backend
 */
const TeacherLogin = (() => {

  const API_BASE = /^https?:/i.test(window.location.origin)
    ? window.location.origin
    : "http://localhost:8080";

  const form = document.getElementById('teacher-login-form');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn?.querySelector('.btn-text');
  const teacherIdInput = document.getElementById('teacher-id');
  const passwordInput = document.getElementById('password');
  const rememberCheckbox = document.getElementById('remember-teacher');
  const loginErrorBox = document.getElementById('teacher-login-error');
  const loginErrorMessage = document.getElementById('teacher-login-error-message');
  const REMEMBER_KEY = 'remember.teacher.identifier';
  let speedTimeout;

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
      role: user.role || "TEACHER",
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
    hydrateRememberedIdentifier();
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
    teacherIdInput?.addEventListener('input', clearError);
    passwordInput?.addEventListener('input', clearError);
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
    clearError();

    const email = teacherIdInput?.value.trim();
    const password = passwordInput?.value.trim();
    const remember = Boolean(rememberCheckbox?.checked);

    if (!email || !password) {
      showError("Please enter your email/employee ID and password.");
      return;
    }

    setLoading(true);

    try {

      const response = await fetch(`${API_BASE}/api/auth/login`, {
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
      console.log("LOGIN RESPONSE:", data);

      // Support multiple token names
      const token = data.token || data.accessToken || data.jwt;

      if (!token) {
        throw new Error("Invalid authentication response");
      }

      if (data.role !== "TEACHER") {
        throw new Error("Access denied. Teacher only.");
      }

      // ================= SAVE TOKEN =================
      persistAuthData({
        token,
        role: data.role,
        user: sanitizeUserForStorage(data),
        teacher: {
        id: data.id,
        name: data.name,
        email: data.email,
        department: data.department,
        designation: data.designation,
        qualification: data.qualification,
        employeeId: data.employeeId
        },
        remember
      });
      persistRememberedIdentifier(email, remember);

      setSuccess();

      setTimeout(() => {
        window.location.href = "teacher-dashboard.html";
      }, 800);

    } catch (error) {
      console.error("Teacher Login Error:", error);
      setLoading(false);
      showError(error.message);
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
    if (!remembered || !teacherIdInput) return;
    teacherIdInput.value = remembered;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  function persistAuthData({ token, role, user, teacher, remember }) {
    const primary = remember ? localStorage : sessionStorage;
    const secondary = remember ? sessionStorage : localStorage;

    ['token', 'accessToken', 'role', 'user', 'teacher'].forEach((key) => {
      secondary.removeItem(key);
    });

    primary.setItem('token', token);
    primary.setItem('accessToken', token);
    primary.setItem('role', role);
    primary.setItem('teacher', JSON.stringify(teacher));
    primary.setItem('user', JSON.stringify(user));
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', TeacherLogin.init);
