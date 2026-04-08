const Signup = (() => {
  const API_BASE = /^https?:/i.test(window.location.origin)
    ? window.location.origin
    : "http://localhost:8080";

  const form = document.getElementById("signup-form");
  const btn = document.getElementById("submit-btn");
  const btnText = btn?.querySelector(".btn-text");
  const confirmOverlay = document.getElementById("confirm-overlay");
  const confirmBtn = document.getElementById("confirm-btn");
  const confirmClose = document.getElementById("confirm-close");
  const overlay = document.getElementById("otp-overlay");
  const otpEmail = document.getElementById("otp-email");
  const otpMetaEmail = document.getElementById("otp-meta-email");
  const otpRequestId = document.getElementById("otp-request-id");
  const otpLiveFor = document.getElementById("otp-live-for");
  const email = document.getElementById("email");
  const fullName = document.getElementById("fullName");
  const password = document.getElementById("password");
  const verifyBtn = document.getElementById("verify-btn");
  const changeLink = document.getElementById("otp-change");
  const closeBtn = document.getElementById("otp-close");
  const confirmName = document.getElementById("confirm-name");
  const confirmEmail = document.getElementById("confirm-email");
  const confirmPassword = document.getElementById("confirm-password");

  const ROLE = "student";
  const DEFAULT_OTP_SECONDS = 600;

  let speedTimeout;
  let pendingSignup = null;
  let pendingSignupOtpId = null;
  let currentOtpSeconds = DEFAULT_OTP_SECONDS;
  let emailExists = false;
  let emailCheckTimer = null;
  let emailLastChecked = "";

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
      role: user.role || "STUDENT",
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

  async function api(path, body) {
    const response = await fetch(`${API_BASE}/api/auth${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(body)
    });

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_e) {
        data = text;
      }
    }

    if (!response.ok) {
      const message = data && typeof data === "object"
        ? data.message || data.error || data.cause || data.detail
        : (typeof data === "string" && data.trim() ? data.trim() : "");
      throw new Error(message || `Request failed (${response.status})`);
    }

    return data;
  }

  async function apiGet(path) {
    const response = await fetch(`${API_BASE}/api/auth${path}`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_e) {
        data = text;
      }
    }

    if (!response.ok) {
      const message = data && typeof data === "object"
        ? data.message || data.error || data.cause || data.detail
        : (typeof data === "string" && data.trim() ? data.trim() : "");
      throw new Error(message || `Request failed (${response.status})`);
    }
    return data;
  }

  function formatSeconds(totalSeconds) {
    const safe = Math.max(0, Number(totalSeconds) || 0);
    const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
    const seconds = String(safe % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function setEmailMessage(message) {
    const msg = document.querySelector('[data-for="email"]');
    if (msg) msg.textContent = message || "";
  }

  function setButtonState(state, text) {
    if (!btn) return;
    btn.dataset.state = state;
    btn.classList.remove("is-loading", "is-success");

    if (state === "loading") {
      btn.classList.add("is-loading");
      if (btnText) btnText.textContent = text || "Creating...";
      btn.disabled = true;
      return;
    }

    if (state === "success") {
      btn.classList.add("is-success");
      if (btnText) btnText.textContent = "Verified";
      btn.disabled = false;
      return;
    }

    if (btnText) btnText.textContent = text || "Create Account";
    btn.disabled = false;
  }

  function speedMarquee() {
    document.documentElement.style.setProperty("--marquee-speed", "0.5s");
    document.documentElement.style.setProperty("--marquee-speed-fast", "0.4s");

    clearTimeout(speedTimeout);
    speedTimeout = setTimeout(() => {
      document.documentElement.style.setProperty("--marquee-speed", "5s");
      document.documentElement.style.setProperty("--marquee-speed-fast", "4.5s");
    }, 1500);
  }

  function openConfirm() {
    confirmName.textContent = fullName.value || "—";
    confirmEmail.textContent = email.value || "—";
    confirmPassword.textContent = password.value || "••••••••";
    confirmOverlay.classList.add("is-open");
    confirmOverlay.setAttribute("aria-hidden", "false");
  }

  function closeConfirm() {
    confirmOverlay.classList.remove("is-open");
    confirmOverlay.setAttribute("aria-hidden", "true");
  }

  function openOTP(seconds = currentOtpSeconds) {
    currentOtpSeconds = Number(seconds) > 0 ? Number(seconds) : DEFAULT_OTP_SECONDS;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    const activeEmail = pendingSignup?.email || email.value || "your inbox";
    otpEmail.textContent = activeEmail;
    if (otpMetaEmail) otpMetaEmail.textContent = activeEmail;
    if (otpRequestId) otpRequestId.textContent = pendingSignupOtpId || "—";
    if (otpLiveFor) otpLiveFor.textContent = formatSeconds(currentOtpSeconds);
    OTP.activate(currentOtpSeconds);
  }

  function closeOTP() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
  }

  function saveAuthResponse(data) {
    const token = data?.accessToken || data?.token || data?.jwt;
    if (!token) {
      throw new Error("Authentication response did not include a token");
    }

    safeSetStorage("token", token);
    safeSetStorage("accessToken", token);
    safeSetStorage("role", data.role || ROLE.toUpperCase());
    safeSetStorage("user", JSON.stringify(sanitizeUserForStorage(data)));
  }

  async function startSignup() {
    await checkSignupEmailAvailability(email.value, false);
    if (!Validation.validateFields()) {
      throw new Error("Please fix the highlighted fields before continuing.");
    }
    if (emailExists) {
      setEmailMessage("This email is already registered.");
      throw new Error("Email already registered. Please use another email.");
    }

    const payload = {
      name: fullName.value.trim(),
      email: email.value.trim(),
      password: password.value
    };

    setButtonState("loading", "Sending OTP...");
    const result = await api("/signup/start", payload);
    pendingSignup = payload;
    pendingSignupOtpId = result?.id || null;
    currentOtpSeconds = Number(result?.liveFor) || Number(result?.expiresInSeconds) || DEFAULT_OTP_SECONDS;
    sessionStorage.setItem("signup.pendingEmail", payload.email);
    sessionStorage.setItem("signup.pendingRole", ROLE);
    closeConfirm();
    openOTP(currentOtpSeconds);
    setButtonState("default", "Create Account");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await checkSignupEmailAvailability(email.value, false);
    if (emailExists) {
      setEmailMessage("This email is already registered.");
      return;
    }
    if (!Validation.validateFields()) return;
    speedMarquee();
    setButtonState("default", "Create Account");
    openConfirm();
  }

  async function handleConfirm() {
    if (btn?.disabled) return;
    confirmBtn.disabled = true;
    try {
      await startSignup();
    } catch (error) {
      console.error("Signup start error:", error);
      setButtonState("default", "Create Account");
      alert(error.message || "Unable to send verification code");
    } finally {
      confirmBtn.disabled = false;
    }
  }

  async function handleVerify() {
    const otpValue = OTP.getCode();
    if (otpValue.length !== 6) {
      OTP.setMessage("Enter the 6-digit OTP to continue.");
      return;
    }

    const emailValue = pendingSignup?.email || email.value.trim() || sessionStorage.getItem("signup.pendingEmail") || "";
    if (!emailValue) {
      OTP.setMessage("Missing signup session. Please restart registration.");
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verifying...";
    verifyBtn.classList.add("is-loading");

    try {
      const result = await api("/signup/verify", {
        email: emailValue,
        otp: otpValue
      });

      saveAuthResponse(result);
      OTP.setMessage("");
      setButtonState("success");
      closeOTP();
      pendingSignupOtpId = null;
      sessionStorage.removeItem("signup.pendingEmail");
      sessionStorage.removeItem("signup.pendingRole");

      setTimeout(() => {
        window.location.href = "welcome-onboarding.html";
      }, 700);
    } catch (error) {
      console.error("OTP verification error:", error);
      OTP.setMessage(error.message || "Verification failed");
      setButtonState("default", "Create Account");
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.classList.remove("is-loading");
      verifyBtn.textContent = "Verify Code";
    }
  }

  async function resendOtp() {
    const emailValue = pendingSignup?.email || email.value.trim() || sessionStorage.getItem("signup.pendingEmail") || "";
    if (!emailValue) {
      throw new Error("Missing signup session. Please restart registration.");
    }

    const result = await api("/signup/resend", { email: emailValue });
    pendingSignupOtpId = result?.id || pendingSignupOtpId;
    currentOtpSeconds = Number(result?.liveFor) || Number(result?.expiresInSeconds) || currentOtpSeconds || DEFAULT_OTP_SECONDS;
    if (otpRequestId) otpRequestId.textContent = pendingSignupOtpId || "—";
    if (otpMetaEmail) otpMetaEmail.textContent = emailValue;
    if (otpLiveFor) otpLiveFor.textContent = formatSeconds(currentOtpSeconds);
    return currentOtpSeconds;
  }

  async function checkSignupEmailAvailability(rawValue, silent = true) {
    const value = String(rawValue || "").trim();
    emailLastChecked = value;

    if (!value) {
      emailExists = false;
      setEmailMessage("");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      emailExists = false;
      if (!silent) setEmailMessage("Enter a valid email address.");
      return false;
    }

    try {
      const result = await apiGet(`/signup/email-exists?value=${encodeURIComponent(value)}`);
      if (emailLastChecked !== value) return emailExists;
      emailExists = Boolean(result?.exists);
      if (emailExists) {
        setEmailMessage("This email is already registered.");
      } else {
        setEmailMessage("");
      }
      return emailExists;
    } catch (_error) {
      if (!silent) setEmailMessage("Unable to validate email right now.");
      return false;
    }
  }

  function queueEmailAvailabilityCheck() {
    if (emailCheckTimer) clearTimeout(emailCheckTimer);
    emailCheckTimer = setTimeout(() => {
      checkSignupEmailAvailability(email.value, true).catch(() => {});
    }, 300);
  }

  function handleToggle(e) {
    const btnToggle = e.target.closest(".toggle-visibility");
    if (!btnToggle) return;
    const targetId = btnToggle.dataset.target;
    const mode = btnToggle.dataset.mode || "input";
    if (mode === "text") {
      const target = document.getElementById(targetId);
      if (!target) return;
      const isHidden = target.dataset.hidden !== "false";
      target.dataset.hidden = isHidden ? "false" : "true";
      target.textContent = isHidden ? (password.value || "—") : "•".repeat(Math.min(password.value.length, 10));
      btnToggle.textContent = isHidden ? "Hide" : "Show";
      return;
    }

    const input = document.getElementById(targetId);
    if (!input) return;
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    btnToggle.textContent = isPassword ? "Hide" : "Show";
  }

  function initCardEffects() {
    const card = document.querySelector(".card");
    const spotlight = document.querySelector(".card-spotlight");
    if (!card || !spotlight) return;

    card.addEventListener("mousemove", e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      spotlight.style.setProperty("--x", `${x}px`);
      spotlight.style.setProperty("--y", `${y}px`);

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 25;
      const rotateY = (centerX - x) / 25;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
    });
  }

  function init() {
    ThemeController.init();
    initCardEffects();
    if (!form) return;

    form.addEventListener("submit", handleSubmit);
    confirmBtn.addEventListener("click", handleConfirm);
    confirmClose.addEventListener("click", closeConfirm);
    confirmOverlay.addEventListener("click", e => {
      if (e.target === confirmOverlay) closeConfirm();
    });

    verifyBtn.addEventListener("click", handleVerify);
    email.addEventListener("input", queueEmailAvailabilityCheck);
    email.addEventListener("blur", () => {
      checkSignupEmailAvailability(email.value, false).catch(() => {});
    });
    changeLink.addEventListener("click", e => {
      e.preventDefault();
      closeOTP();
      openConfirm();
    });
    closeBtn.addEventListener("click", closeOTP);
    overlay.addEventListener("click", e => {
      if (e.target === overlay) closeOTP();
    });

    document.addEventListener("click", handleToggle);

    window.SignupOtpBridge = {
      resend: resendOtp,
      getEmail: () => (pendingSignup?.email || email.value.trim() || sessionStorage.getItem("signup.pendingEmail") || ""),
      getRole: () => ROLE
    };
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", Signup.init);
