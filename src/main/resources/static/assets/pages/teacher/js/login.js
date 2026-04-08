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

  function safeSetStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Skipping localStorage key '${key}' due to quota/storage error`, error);
      return false;
    }
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

    const email = document.getElementById('teacher-id')?.value.trim();
    const password = document.getElementById('password')?.value.trim();

    if (!email || !password) {
      alert("Please enter teacher credentials");
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
      safeSetStorage("token", token);
      safeSetStorage("accessToken", token);
      safeSetStorage("role", data.role);

      // ================= SAVE TEACHER DATA =================
      safeSetStorage("teacher", JSON.stringify({
        id: data.id,
        name: data.name,
        email: data.email,
        department: data.department,
        designation: data.designation,
        qualification: data.qualification,
        employeeId: data.employeeId
      }));

      // Save full response
      safeSetStorage("user", JSON.stringify(sanitizeUserForStorage(data)));

      setSuccess();

      setTimeout(() => {
        window.location.href = "teacher-dashboard.html";
      }, 800);

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
