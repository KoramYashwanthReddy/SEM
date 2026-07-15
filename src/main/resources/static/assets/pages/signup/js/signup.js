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

    if (data && typeof data === "object" && Object.prototype.hasOwnProperty.call(data, "data")) {
      return data.data;
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
    if (data && typeof data === "object" && Object.prototype.hasOwnProperty.call(data, "data")) {
      return data.data;
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
    signupCurrentStep = 3;
    updateSignupStepPane();
  }

  function closeConfirm() {
    signupCurrentStep = 2;
    updateSignupStepPane();
  }

  function openOTP(seconds = currentOtpSeconds) {
    currentOtpSeconds = Number(seconds) > 0 ? Number(seconds) : DEFAULT_OTP_SECONDS;
    const activeEmail = pendingSignup?.email || email.value || "your inbox";
    otpEmail.textContent = activeEmail;
    if (otpMetaEmail) otpMetaEmail.textContent = activeEmail;
    if (otpRequestId) otpRequestId.textContent = pendingSignupOtpId || "—";
    if (otpLiveFor) otpLiveFor.textContent = formatSeconds(currentOtpSeconds);
    OTP.activate(currentOtpSeconds);
    signupCurrentStep = 4;
    updateSignupStepPane();
  }

  function closeOTP() {
    signupCurrentStep = 1;
    updateSignupStepPane();
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

  let signupCurrentStep = 1;

  function renderSignupStepper() {
    const stepper = document.getElementById("signupStepper");
    if (!stepper) return;
    const steps = ["Info", "Credentials", "Confirm", "OTP"];
    stepper.innerHTML = steps.map((label, index) => {
      const step = index + 1;
      const active = signupCurrentStep === step;
      const complete = signupCurrentStep > step;
      return `
        <div class="signup-step ${active ? 'active' : ''} ${complete ? 'complete' : ''}" style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; z-index: 2; position: relative;">
          <span class="signup-step-index" style="width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; border: 2px solid ${active ? '#6366f1' : (complete ? '#10b981' : '#e2e8f0')}; background: ${active ? '#6366f1' : (complete ? '#10b981' : '#fff')}; color: ${active || complete ? '#fff' : '#64748b'}; box-shadow: ${active ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none'}; transition: all 0.3s ease;">
            ${complete ? '✓' : step}
          </span>
          <span class="signup-step-label" style="font-size: 10.5px; font-weight: 700; color: ${active ? '#6366f1' : (complete ? '#10b981' : '#64748b')}; transition: color 0.3s ease;">${label}</span>
        </div>`;
    }).join('');
  }

  function updateSignupStepPane() {
    document.querySelectorAll(".signup-step-pane").forEach((pane) => {
      const step = parseInt(pane.dataset.signupStep, 10);
      pane.style.display = (step === signupCurrentStep) ? "block" : "none";
    });

    const backBtn = document.getElementById("signup-back-btn");
    if (backBtn) {
      backBtn.style.display = (signupCurrentStep === 1 || signupCurrentStep === 4) ? "none" : "block";
    }

    const submitBtnText = document.querySelector("#submit-btn .btn-text");
    if (submitBtnText) {
      if (signupCurrentStep === 1) {
        submitBtnText.textContent = "Next Step →";
      } else if (signupCurrentStep === 2) {
        submitBtnText.textContent = "Next Step →";
      } else if (signupCurrentStep === 3) {
        submitBtnText.textContent = "Continue to OTP";
      } else if (signupCurrentStep === 4) {
        submitBtnText.textContent = "Verify Code";
      }
    }


    const showcase = document.getElementById("signupShowcaseContent");
    if (showcase) {
      if (signupCurrentStep === 1) {
        showcase.innerHTML = `
          <!-- Logo Header -->
          <a href="../index.html" class="brand-section">
            <span class="brand-logo-sso">SEM</span>
            <span class="brand-name-sso">Smart Examination Monitor</span>
          </a>

          <!-- Consolidated Portal Info Showcase -->
          <div class="showcase-info" style="animation: ssoFadeIn 0.3s ease;">
            <div class="portal-details">
              <span class="panel-kicker" style="align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #6366f1; background: rgba(99, 102, 241, 0.08); padding: 4px 12px; border-radius: 99px; margin-bottom: 18px; border: 1px solid rgba(99, 102, 241, 0.12);">
                <span class="status-dot-green" style="background: #6366f1; box-shadow: 0 0 6px #6366f1;"></span>
                Student Registration Only
              </span>
              <h1 class="portal-title" style="margin-top: 10px;">Join the Future of Examination</h1>
              <p class="portal-desc">Launch secure, AI-proctored exams in minutes with SEM. Your ultimate partner in academic integrity.</p>
              
              <ul class="portal-features-sso">
                <li>
                  <div class="feature-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <div class="feature-text-wrapper">
                    <span class="feature-title-sso">AI Proctored</span>
                    <span class="feature-desc-sso">Real-time head/eye tracking & cheat detection.</span>
                  </div>
                </li>
                <li>
                  <div class="feature-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                  </div>
                  <div class="feature-text-wrapper">
                    <span class="feature-title-sso">Analytics</span>
                    <span class="feature-desc-sso">Deep performance insights & behavioral metrics.</span>
                  </div>
                </li>
                <li>
                  <div class="feature-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  </div>
                  <div class="feature-text-wrapper">
                    <span class="feature-title-sso">Global Leaderboard</span>
                    <span class="feature-desc-sso">Compete with the world's best performers.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <!-- Premium Status/Metrics Widget -->
          <div class="platform-metrics-widget">
            <div class="metrics-header">
              <span class="metrics-title">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                Platform Monitor
              </span>
              <span class="metrics-status-badge">
                <span class="status-dot-green"></span>
                Operational
              </span>
            </div>
            <div class="metrics-grid">
              <div class="metric-card">
                <span class="metric-value">99.98%</span>
                <span class="metric-label">Proctor Accuracy</span>
              </div>
              <div class="metric-card">
                <span class="metric-value">12ms</span>
                <span class="metric-label">Server Latency</span>
              </div>
              <div class="metric-card">
                <span class="metric-value">100%</span>
                <span class="metric-label">Data Encrypted</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="showcase-footer">
            <span>Enterprise Secure Connection</span>
            <span>v2.4.0</span>
          </div>
        `;
      } else {
        showcase.innerHTML = `
          <!-- Logo Header -->
          <a href="../index.html" class="brand-section">
            <span class="brand-logo-sso">SEM</span>
            <span class="brand-name-sso">Smart Examination Monitor</span>
          </a>

          <!-- Consolidated Portal Info Showcase -->
          <div class="showcase-info" style="animation: ssoFadeIn 0.3s ease;">
            <div class="portal-details">
              <span class="panel-kicker" style="align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #a855f7; background: rgba(168, 85, 247, 0.08); padding: 4px 12px; border-radius: 99px; margin-bottom: 18px; border: 1px solid rgba(168, 85, 247, 0.12);">
                <span class="status-dot-green" style="background: #a855f7; box-shadow: 0 0 6px #a855f7;"></span>
                Security & Credentials
              </span>
              <h1 class="portal-title" style="margin-top: 10px;">Secure Your Profile Credentials</h1>
              <p class="portal-desc">Set up a robust password security layer. Our system enforces standard zero-trust credential rules to ensure your session is always protected.</p>
              
              <ul class="portal-features-sso">
                <li>
                  <div class="feature-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <div class="feature-text-wrapper">
                    <span class="feature-title-sso">8+ Character Requirement</span>
                    <span class="feature-desc-sso">Your password must include uppercase, lowercase, numbers, and symbols.</span>
                  </div>
                </li>
                <li>
                  <div class="feature-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <div class="feature-text-wrapper">
                    <span class="feature-title-sso">Secure Verification Layer</span>
                    <span class="feature-desc-sso">Every registration receives a multi-factor email verification code.</span>
                  </div>
                </li>
                <li>
                  <div class="feature-icon-wrapper">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                  </div>
                  <div class="feature-text-wrapper">
                    <span class="feature-title-sso">Privacy & Terms Agreement</span>
                    <span class="feature-desc-sso">We fully comply with global data governance and security regulations.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <!-- Premium Status/Metrics Widget -->
          <div class="platform-metrics-widget">
            <div class="metrics-header">
              <span class="metrics-title">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                Platform Monitor
              </span>
              <span class="metrics-status-badge">
                <span class="status-dot-green"></span>
                Operational
              </span>
            </div>
            <div class="metrics-grid">
              <div class="metric-card">
                <span class="metric-value">99.98%</span>
                <span class="metric-label">Proctor Accuracy</span>
              </div>
              <div class="metric-card">
                <span class="metric-value">12ms</span>
                <span class="metric-label">Server Latency</span>
              </div>
              <div class="metric-card">
                <span class="metric-value">100%</span>
                <span class="metric-label">Data Encrypted</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="showcase-footer">
            <span>Enterprise Secure Connection</span>
            <span>v2.4.0</span>
          </div>
        `;
      }
    }
    renderSignupStepper();
  }


  async function handleSubmit(e) {
    e.preventDefault();
    if (signupCurrentStep === 1) {
      if (!Validation.validateStep1()) return;
      
      // Check email availability on step 1 before letting them go to password step
      setButtonState("loading", "Checking email...");
      try {
        await checkSignupEmailAvailability(email.value, false);
        if (emailExists) {
          setEmailMessage("This email is already registered.");
          setButtonState("default", "Next Step →");
          return;
        }
      } catch (err) {
        console.error("Availability check error:", err);
      }
      setButtonState("default", "Next Step →");

      signupCurrentStep = 2;
      updateSignupStepPane();
      return;
    }

    if (signupCurrentStep === 2) {
      if (!Validation.validateStep2()) return;
      speedMarquee();
      openConfirm();
      return;
    }

    if (signupCurrentStep === 3) {
      try {
        await startSignup();
      } catch (error) {
        console.error("Signup start error:", error);
        alert(error.message || "Unable to send verification code");
      }
      return;
    }

    if (signupCurrentStep === 4) {
      await handleVerify();
      return;
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

    if (btn) {
      btn.disabled = true;
      if (btnText) btnText.textContent = "Verifying...";
      btn.classList.add("is-loading");
    }

    try {
      const result = await api("/signup/verify", {
        email: emailValue,
        otp: otpValue
      });

      saveAuthResponse(result);
      OTP.setMessage("");
      setButtonState("success");
      pendingSignupOtpId = null;
      sessionStorage.removeItem("signup.pendingEmail");
      sessionStorage.removeItem("signup.pendingRole");

      setTimeout(() => {
        window.location.href = "welcome-onboarding.html";
      }, 700);
    } catch (err) {
      console.error(err);
      OTP.setMessage(err.message || "Invalid OTP code. Please try again.");
      if (btn) {
        btn.disabled = false;
        if (btnText) btnText.textContent = "Verify Code";
        btn.classList.remove("is-loading");
      }
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

    // Back button listener for signup steps
    const backBtn = document.getElementById("signup-back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        if (signupCurrentStep > 1 && signupCurrentStep < 4) {
          signupCurrentStep--;
          updateSignupStepPane();
        }
      });
    }
    updateSignupStepPane();

    form.addEventListener("submit", handleSubmit);

    email.addEventListener("input", queueEmailAvailabilityCheck);
    email.addEventListener("blur", () => {
      checkSignupEmailAvailability(email.value, false).catch(() => {});
    });
    
    if (changeLink) {
      changeLink.addEventListener("click", e => {
        e.preventDefault();
        closeOTP();
      });
    }

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
