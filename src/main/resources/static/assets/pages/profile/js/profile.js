const ProfileBriefing = (() => {
  const API_BASE = /^https?:/i.test(window.location.origin)
    ? window.location.origin
    : "http://localhost:8080";

  const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%232563eb'/%3E%3Cstop offset='1' stop-color='%230891b2'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='160' height='160' rx='28' fill='%23e2e8f0'/%3E%3Ccircle cx='80' cy='62' r='26' fill='url(%23g)' opacity='0.9'/%3E%3Cpath d='M34 131c7-22 26-34 46-34s39 12 46 34' fill='none' stroke='%23475569' stroke-width='10' stroke-linecap='round'/%3E%3C/svg%3E";
  const AUTH_KEYS = ["token", "accessToken", "jwt", "authToken", "access_token"];

  function normalizeToken(raw) {
    if (!raw) return "";
    let value = String(raw).trim();
    if (!value) return "";
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).trim();
    }
    if (/^bearer\s+/i.test(value)) {
      value = value.replace(/^bearer\s+/i, "").trim();
    }
    return value;
  }

  function clearAuthStorage() {
    AUTH_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    localStorage.removeItem("role");
    sessionStorage.removeItem("role");
  }

  const form = document.querySelector("#profile-multi-step-form");
  const steps = Array.from(document.querySelectorAll(".step-content"));
  const badges = Array.from(document.querySelectorAll(".step-item"));
  const prevBtn = document.querySelector("#prev-step");
  const nextBtn = document.querySelector("#next-step");
  const submitBtn = document.querySelector("#submit-step");
  const confirmOverlay = document.querySelector("#confirm-overlay");
  const reviewGrid = document.querySelector("#review-summary");
  const photoInput = document.querySelector("#photoInput");
  const photoPreview = document.querySelector("#photo-preview");
  const uploadTrigger = document.querySelector("#trigger-upload");
  const finalConfirmBtn = document.querySelector("#final-confirm");
  const cancelConfirmBtn = document.querySelector("#cancel-confirm");
  const clearBtn = document.querySelector("#clear-step");
  const rollNumberInput = document.querySelector("#rollNumber");
  const phoneInput = document.querySelector("#phone");
  const stepIndicators = {
    1: document.querySelector("#badge-1"),
    2: document.querySelector("#badge-2"),
    3: document.querySelector("#badge-3")
  };

  const state = {
    currentStep: 1,
    loaded: false,
    saving: false,
    user: null,
    profile: null,
    profilePersisted: false,
    profileCompleted: false,
    photoUrl: "",
    uploadedPhotoUrl: "",
    currentPhotoName: "",
    rollNumberExists: false,
    rollNumberCheckTimer: null,
    rollNumberLastChecked: "",
    phoneExists: false,
    phoneCheckTimer: null,
    phoneLastChecked: ""
  };

  function getToken() {
    for (const key of AUTH_KEYS) {
      const value = normalizeToken(localStorage.getItem(key));
      if (value) return value;
      const sessionValue = normalizeToken(sessionStorage.getItem(key));
      if (sessionValue) return sessionValue;
    }
    return "";
  }

  function getStoredUser() {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      if (parsed.data && typeof parsed.data === "object") return parsed.data;
      return parsed;
    } catch (_e) {
      return null;
    }
  }

  function getPayloadFromToken(token) {
    try {
      const parts = String(token || "").split(".");
      if (parts.length < 2) return {};
      const payload = parts[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
      const json = atob(payload);
      const parsed = JSON.parse(json);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_e) {
      return {};
    }
  }

  function redirectToLogin() {
    window.location.href = "role-selection.html";
  }

  function withTimeout(promise, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Request timed out")), timeoutMs);
      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  async function request(path, options = {}) {
    const token = getToken();
    if (!token) {
      redirectToLogin();
      throw new Error("Missing authentication token");
    }

    const headers = { Accept: "application/json", ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const res = await withTimeout(fetch(`${API_BASE}/api${path}`, {
      credentials: "same-origin",
      ...options,
      headers
    }));

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_e) {
        data = text;
      }
    }

    if (!res.ok) {
      const message = data && typeof data === "object"
        ? data.message || data.error || data.cause || data.detail
        : (typeof data === "string" && data.trim() ? data.trim() : "");
      const err = new Error(message || `Request failed (${res.status})`);
      err.status = res.status;
      err.code = data && typeof data === "object" ? (data.errorCode || data.code || "") : "";
      err.causeText = data && typeof data === "object" ? (data.cause || data.detail || "") : "";
      err.fieldErrors = data && typeof data === "object" && data.fieldErrors && typeof data.fieldErrors === "object"
        ? data.fieldErrors
        : {};
      if (res.status === 401 || res.status === 403) {
        clearAuthStorage();
        redirectToLogin();
      }
      throw err;
    }

    return data;
  }

  function clearFieldErrors() {
    document.querySelectorAll(".form-error").forEach((el) => el.remove());
    document.querySelectorAll(".form-group input, .form-group select").forEach((input) => {
      input.style.borderColor = "var(--border-subtle)";
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    });
  }

  function showFieldErrors(fieldErrors = {}) {
    clearFieldErrors();
    const keys = Object.keys(fieldErrors);
    if (keys.length === 0) return;

    keys.forEach((fieldName) => {
      const message = String(fieldErrors[fieldName] || "").trim();
      if (!message) return;

      const input = document.getElementById(fieldName) || document.querySelector(`[name="${fieldName}"]`);
      if (!input) return;
      input.style.borderColor = "var(--accent-pink)";
      input.setAttribute("aria-invalid", "true");

      const errorEl = document.createElement("div");
      const errorId = `${fieldName}-error`;
      errorEl.id = errorId;
      errorEl.className = "form-error";
      errorEl.textContent = message;
      input.setAttribute("aria-describedby", errorId);

      const host = input.closest(".form-group");
      if (host) {
        host.appendChild(errorEl);
      }
    });

    const firstField = document.getElementById(keys[0]) || document.querySelector(`[name="${keys[0]}"]`);
    if (firstField && typeof firstField.focus === "function") {
      firstField.focus();
    }
  }

  function clearFieldError(fieldName) {
    const input = document.getElementById(fieldName) || document.querySelector(`[name="${fieldName}"]`);
    if (!input) return;
    input.style.borderColor = "var(--border-subtle)";
    input.removeAttribute("aria-invalid");
    const describedBy = input.getAttribute("aria-describedby");
    if (describedBy) {
      const existingError = document.getElementById(describedBy);
      existingError?.remove();
      input.removeAttribute("aria-describedby");
    } else {
      input.closest(".form-group")?.querySelector(".form-error")?.remove();
    }
  }

  function setFieldError(fieldName, message) {
    const input = document.getElementById(fieldName) || document.querySelector(`[name="${fieldName}"]`);
    if (!input) return;
    clearFieldError(fieldName);
    input.style.borderColor = "var(--accent-pink)";
    input.setAttribute("aria-invalid", "true");

    const errorEl = document.createElement("div");
    const errorId = `${fieldName}-error`;
    errorEl.id = errorId;
    errorEl.className = "form-error";
    errorEl.textContent = message;
    input.setAttribute("aria-describedby", errorId);
    input.closest(".form-group")?.appendChild(errorEl);
  }

  function formatBackendError(error, fallbackMessage) {
    const code = error && error.code ? String(error.code).trim() : "";
    const baseMessage = error && error.message ? String(error.message).trim() : fallbackMessage;
    const causeText = error && error.causeText ? String(error.causeText).trim() : "";
    if (code && causeText) return `[${code}] ${baseMessage} - ${causeText}`;
    if (code) return `[${code}] ${baseMessage}`;
    return baseMessage || fallbackMessage;
  }

  function setStatus(message, tone = "info") {
    let bar = document.getElementById("profile-status-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "profile-status-bar";
      bar.style.margin = "0 48px 16px";
      bar.style.padding = "12px 16px";
      bar.style.borderRadius = "14px";
      bar.style.fontSize = "13px";
      bar.style.fontWeight = "600";
      bar.style.lineHeight = "1.4";
      bar.style.border = "1px solid transparent";
      const host = document.querySelector(".profile-main");
      if (host) host.insertBefore(bar, host.firstChild);
    }

    const palette = {
      info: ["rgba(59,130,246,0.12)", "rgba(59,130,246,0.24)", "var(--text-primary)"],
      success: ["rgba(16,185,129,0.12)", "rgba(16,185,129,0.24)", "var(--text-primary)"],
      error: ["rgba(244,63,94,0.12)", "rgba(244,63,94,0.24)", "var(--text-primary)"]
    };
    const [bg, border, color] = palette[tone] || palette.info;
    bar.style.background = bg;
    bar.style.borderColor = border;
    bar.style.color = color;
    bar.textContent = message;
  }

  function setBusy(isBusy) {
    [prevBtn, nextBtn, submitBtn, clearBtn, uploadTrigger, photoInput].forEach((el) => {
      if (!el) return;
      el.disabled = isBusy;
    });
    if (uploadTrigger) uploadTrigger.disabled = isBusy;
    if (photoInput) photoInput.disabled = isBusy;
    if (prevBtn) prevBtn.disabled = isBusy || state.currentStep === 1;
    if (nextBtn) nextBtn.disabled = isBusy;
    if (submitBtn) submitBtn.disabled = isBusy;
    if (clearBtn) clearBtn.disabled = isBusy;
    if (finalConfirmBtn) finalConfirmBtn.disabled = isBusy;
  }

  function renderStepUI() {
    steps.forEach((step, index) => {
      const stepNumber = index + 1;
      step.classList.toggle("active", stepNumber === state.currentStep);
    });

    badges.forEach((badge, index) => {
      const stepNumber = index + 1;
      badge.classList.toggle("active", stepNumber === state.currentStep);
      badge.classList.toggle("completed", stepNumber < state.currentStep);
    });

    if (stepIndicators[1]) stepIndicators[1].classList.toggle("active", state.currentStep === 1);
    if (stepIndicators[2]) stepIndicators[2].classList.toggle("active", state.currentStep === 2);
    if (stepIndicators[3]) stepIndicators[3].classList.toggle("active", state.currentStep === 3);
    if (stepIndicators[1]) stepIndicators[1].classList.toggle("completed", state.currentStep > 1);
    if (stepIndicators[2]) stepIndicators[2].classList.toggle("completed", state.currentStep > 2);
    if (stepIndicators[3]) stepIndicators[3].classList.toggle("completed", false);

    if (prevBtn) prevBtn.style.visibility = state.currentStep > 1 ? "visible" : "hidden";
    if (nextBtn) nextBtn.style.display = state.currentStep < 3 ? "block" : "none";
    if (submitBtn) submitBtn.style.display = state.currentStep < 3 ? "none" : "block";
  }

  function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value == null ? "" : String(value);
  }

  function getInputValue(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function hydrateForm() {
    const user = state.user || {};
    const profile = state.profile || {};

    setInputValue("userId", user.id || profile.userId || "");
    setInputValue("fullName", profile.fullName || user.name || "");
    setInputValue("email", profile.email || user.email || "");
    setInputValue("phone", profile.phone || user.phone || "");
    setInputValue("gender", profile.gender || "");
    setInputValue("dateOfBirth", profile.dateOfBirth || "");
    setInputValue("collegeName", profile.collegeName || "");
    setInputValue("department", profile.department || user.department || "");
    setInputValue("year", profile.year || "1st Year");
    setInputValue("rollNumber", profile.rollNumber || "");
    setInputValue("section", profile.section || "");

    if (profile.email || user.email) {
      const emailInput = document.getElementById("email");
      if (emailInput) {
        emailInput.readOnly = true;
        emailInput.title = "Your email comes from the signed-in account";
      }
    }

    const photo = profile.profilePhoto || user.profileImage || DEFAULT_AVATAR;
    state.photoUrl = photo;
    if (photoPreview) photoPreview.src = photo;

    if (submitBtn) {
      const submitLabel = submitBtn.querySelector("span");
      if (submitLabel) {
        submitLabel.textContent = state.profile?.profileCompleted ? "Update & Save" : "Submit & Save";
      }
    }
  }

  function hydrateFromLocalSession() {
    const localUser = getStoredUser() || {};
    const token = getToken();
    const jwtPayload = getPayloadFromToken(token);
    const emailFromJwt = String(jwtPayload.email || jwtPayload.sub || jwtPayload.username || "").trim();
    const nameFromJwt = String(jwtPayload.name || "").trim();
    const pendingEmail = String(sessionStorage.getItem("signup.pendingEmail") || "").trim();
    if (!state.user) state.user = {};

    if (!state.user.email && emailFromJwt) {
      state.user.email = emailFromJwt;
    }
    if (!state.user.email && localUser.email) {
      state.user.email = localUser.email;
    }
    if (!state.user.email && pendingEmail) {
      state.user.email = pendingEmail;
    }
    if (!state.user.name && nameFromJwt) {
      state.user.name = nameFromJwt;
    }
    if (!state.user.name && localUser.name) {
      state.user.name = localUser.name;
    }
    if (!state.user.phone && localUser.phone) {
      state.user.phone = localUser.phone;
    }
    if (!state.user.department && localUser.department) {
      state.user.department = localUser.department;
    }

    hydrateForm();
    forceEmailPrefill();
  }

  function resolveSessionEmail() {
    const localUser = getStoredUser() || {};
    const token = getToken();
    const jwtPayload = getPayloadFromToken(token);
    const emailFromJwt = String(jwtPayload.email || jwtPayload.sub || jwtPayload.username || "").trim();
    const pendingEmail = String(sessionStorage.getItem("signup.pendingEmail") || "").trim();
    return String(
      (state.user && state.user.email) ||
      (state.profile && state.profile.email) ||
      emailFromJwt ||
      localUser.email ||
      pendingEmail ||
      ""
    ).trim();
  }

  function forceEmailPrefill() {
    const emailInput = document.getElementById("email");
    if (!emailInput) return;
    const resolvedEmail = resolveSessionEmail();
    if (resolvedEmail) {
      emailInput.value = resolvedEmail;
      emailInput.readOnly = true;
      emailInput.title = "Auto-filled from verified account";
      if (!state.user) state.user = {};
      state.user.email = resolvedEmail;
    }
  }

  async function loadData() {
    clearFieldErrors();
    setStatus("Loading student profile from the server...", "info");

    try {
      const [me, profile, completed] = await Promise.all([
        request("/users/me"),
        request("/student/profile"),
        request("/student/profile/completed").catch(() => false)
      ]);

      state.user = me;
      state.profile = profile;
      state.profilePersisted = Boolean(profile?.id);
      state.profileCompleted = Boolean(completed);
      hydrateForm();
      forceEmailPrefill();
      renderStepUI();
      setStatus(state.profileCompleted ? "Profile loaded and complete." : "Profile loaded and ready to edit.", "success");
      state.loaded = true;
    } catch (error) {
      console.error("Profile load failed:", error);
      setStatus(formatBackendError(error, "Failed to load profile"), "error");
    }
  }

  function validateCurrentStep(step) {
    const activeStepEl = document.querySelector(`#step-${step}`);
    if (!activeStepEl) return true;

    const requiredInputs = Array.from(activeStepEl.querySelectorAll("[required]"));
    let ok = true;
    let firstInvalid = null;

    requiredInputs.forEach((input) => {
      const value = String(input.value || "").trim();
      const valid = value.length > 0 && (typeof input.checkValidity === "function" ? input.checkValidity() : true);
      input.style.borderColor = valid ? "var(--border-subtle)" : "var(--accent-pink)";
      if (!valid) {
        ok = false;
        if (!firstInvalid) firstInvalid = input;
      }
    });

    if (step === 3 && photoPreview) {
      photoPreview.style.outline = "none";
    }

    if (step === 2 && state.rollNumberExists) {
      ok = false;
      setFieldError("rollNumber", "ID already exists");
      const rollInput = document.getElementById("rollNumber");
      if (!firstInvalid && rollInput) firstInvalid = rollInput;
    }
    if (step === 1 && state.phoneExists) {
      ok = false;
      setFieldError("phone", "Mobile number already exists");
      const mobileInput = document.getElementById("phone");
      if (!firstInvalid && mobileInput) firstInvalid = mobileInput;
    }

    if (!ok) {
      activeStepEl.classList.add("shake");
      setTimeout(() => activeStepEl.classList.remove("shake"), 400);
      if (firstInvalid && typeof firstInvalid.focus === "function") {
        firstInvalid.focus();
      }
      if (step === 1) {
        setStatus("Please fill all required personal details to continue.", "error");
      } else if (step === 2) {
        setStatus("Please complete required institution details to continue.", "error");
      }
    } else if (step < 3) {
      setStatus("Step validated. You can proceed.", "success");
    }

    return ok;
  }

  async function checkRollNumberUniqueness(rawValue) {
    const value = String(rawValue || "").trim();
    if (!value) {
      state.rollNumberExists = false;
      state.rollNumberLastChecked = "";
      clearFieldError("rollNumber");
      return;
    }

    state.rollNumberLastChecked = value;
    try {
      const data = await request(`/student/profile/roll-number-exists?value=${encodeURIComponent(value)}`);
      if (state.rollNumberLastChecked !== value) return;
      const exists = Boolean(data && data.exists);
      state.rollNumberExists = exists;
      if (exists) {
        setFieldError("rollNumber", "ID already exists");
        setStatus("ID already exists. Please use a different ID.", "error");
      } else {
        clearFieldError("rollNumber");
      }
    } catch (error) {
      console.warn("Roll number check failed:", error);
    }
  }

  async function checkPhoneUniqueness(rawValue) {
    const value = String(rawValue || "").trim();
    if (!value) {
      state.phoneExists = false;
      state.phoneLastChecked = "";
      clearFieldError("phone");
      return;
    }

    if (!/^\d{10}$/.test(value)) {
      state.phoneExists = false;
      setFieldError("phone", "Enter exactly 10 digits");
      return;
    }

    state.phoneLastChecked = value;
    try {
      const data = await request(`/student/profile/phone-exists?value=${encodeURIComponent(value)}`);
      if (state.phoneLastChecked !== value) return;
      const exists = Boolean(data && data.exists);
      state.phoneExists = exists;
      if (exists) {
        setFieldError("phone", "Mobile number already exists");
        setStatus("Mobile number already exists. Please use a different one.", "error");
      } else {
        clearFieldError("phone");
      }
    } catch (error) {
      console.warn("Phone check failed:", error);
    }
  }

  function queueRollNumberCheck(value) {
    if (state.rollNumberCheckTimer) {
      clearTimeout(state.rollNumberCheckTimer);
    }
    state.rollNumberCheckTimer = setTimeout(() => {
      checkRollNumberUniqueness(value);
    }, 320);
  }

  function queuePhoneCheck(value) {
    if (state.phoneCheckTimer) {
      clearTimeout(state.phoneCheckTimer);
    }
    state.phoneCheckTimer = setTimeout(() => {
      checkPhoneUniqueness(value);
    }, 320);
  }

  function buildPayload() {
    const previewSrc = String(photoPreview?.src || "").trim();
    const resolvedPhoto = state.photoUrl || previewSrc || "";
    // Never send base64 data URLs in student profile save payload; they are too heavy
    // and can break persistence. Use URL only when it is a real URL/path.
    const persistedPhoto = resolvedPhoto.startsWith("data:") ? "" : resolvedPhoto;
    return {
      fullName: getInputValue("fullName"),
      email: getInputValue("email"),
      phone: getInputValue("phone"),
      gender: getInputValue("gender"),
      dateOfBirth: getInputValue("dateOfBirth") || null,
      collegeName: getInputValue("collegeName"),
      department: getInputValue("department"),
      year: getInputValue("year"),
      rollNumber: getInputValue("rollNumber"),
      section: getInputValue("section"),
      profilePhoto: persistedPhoto === DEFAULT_AVATAR ? "" : persistedPhoto
    };
  }

  function showReviewSummary(payload) {
    if (!reviewGrid) return;

    const escapeHtml = (value) => String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    const items = [
      ["Full Name", payload.fullName],
      ["Email", payload.email],
      ["Phone", payload.phone],
      ["Gender", payload.gender],
      ["Date of Birth", payload.dateOfBirth],
      ["College", payload.collegeName],
      ["Department", payload.department],
      ["Year", payload.year],
      ["Roll Number", payload.rollNumber],
      ["Section", payload.section]
    ];

    reviewGrid.innerHTML = `
      <div class="review-hero">
        <img src="${payload.profilePhoto || DEFAULT_AVATAR}" alt="Profile preview" class="review-hero-photo">
        <div>
          <div class="review-label">Profile Photo</div>
          <div class="review-val">Ready for verification</div>
        </div>
      </div>
      ${items.map(([label, value]) => `
        <div class="review-item review-line-item" data-full="${escapeHtml(value || "--")}">
          <div class="review-label">${escapeHtml(label)}</div>
          <div class="review-val">${escapeHtml(value || "--")}</div>
        </div>
      `).join("")}
    `;
    bindReviewInteractions();
    confirmOverlay.style.display = "flex";
    confirmOverlay.classList.add("active");
    confirmOverlay.classList.add("is-hovering-popup");
    document.body.classList.add("confirm-open");
    const confirmCard = confirmOverlay.querySelector(".confirm-card");
    if (confirmCard) confirmCard.scrollTop = 0;
  }

  function bindReviewInteractions() {
    if (!confirmOverlay) return;
    confirmOverlay.classList.remove("show-hover-center");
    confirmOverlay.querySelector(".review-hover-center")?.remove();
    confirmOverlay.classList.add("is-hovering-popup");
  }

  function closeConfirmOverlay() {
    confirmOverlay.classList.remove("show-hover-center");
    confirmOverlay.classList.remove("is-hovering-popup");
    confirmOverlay.classList.remove("active");
    confirmOverlay.querySelector(".review-hover-center")?.remove();
    confirmOverlay.style.display = "none";
    document.body.classList.remove("confirm-open");
  }

  async function uploadPhoto(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await request("/users/profile-image", {
      method: "POST",
      body: formData
    });

    const uploadedUrl = response?.profileImage || response?.url || response?.imageUrl || "";
    if (uploadedUrl) {
      state.photoUrl = uploadedUrl;
      state.uploadedPhotoUrl = uploadedUrl;
      if (photoPreview) photoPreview.src = uploadedUrl;
      if (!String(uploadedUrl).startsWith("data:")) {
        try {
          localStorage.setItem("student-profile-photo", uploadedUrl);
        } catch (storageError) {
          console.warn("Skipping student-profile-photo cache due to storage limit:", storageError);
        }
      }
    }
    return uploadedUrl;
  }

  function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    state.currentPhotoName = file.name || "";
    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      const localPreview = String(loadEvent.target?.result || "");
      if (photoPreview) photoPreview.src = localPreview;
      state.photoUrl = localPreview;

      setStatus("Uploading profile photo...", "info");
      try {
        await uploadPhoto(file);
        setStatus("Profile photo uploaded successfully.", "success");
      } catch (error) {
        console.error("Photo upload failed:", error);
        setStatus(formatBackendError(error, "Photo upload failed"), "error");
      }
    };
    reader.readAsDataURL(file);
  }

  function clearCurrentStep() {
    clearFieldErrors();
    const activeStepEl = document.querySelector(`#step-${state.currentStep}`);
    if (!activeStepEl) return;

    const inputs = activeStepEl.querySelectorAll("input, select");
    inputs.forEach((input) => {
      if (input.type === "hidden" || input.id === "email") return;
      if (input.type === "file") {
        input.value = "";
        return;
      }
      input.value = "";
      input.style.borderColor = "var(--border-subtle)";
    });

    if (state.currentStep === 3) {
      state.photoUrl = "";
      state.uploadedPhotoUrl = "";
      state.currentPhotoName = "";
      if (photoPreview) {
        photoPreview.src = DEFAULT_AVATAR;
        photoPreview.style.outline = "none";
      }
    }
  }

  async function saveProfile() {
    if (state.saving) return;

    forceEmailPrefill();
    await checkRollNumberUniqueness(getInputValue("rollNumber"));
    await checkPhoneUniqueness(getInputValue("phone"));
    if (state.rollNumberExists) {
      setFieldError("rollNumber", "ID already exists");
      throw new Error("ID already exists. Please use a different ID.");
    }
    if (state.phoneExists) {
      setFieldError("phone", "Mobile number already exists");
      throw new Error("Mobile number already exists. Please use a different number.");
    }

    const payload = buildPayload();

    state.saving = true;
    setBusy(true);
    setStatus("Saving profile to the server...", "info");

    try {
      const endpoint = "/student/profile";
      let method = state.profilePersisted ? "PUT" : "POST";
      let saved;
      try {
        saved = await request(endpoint, {
          method,
          body: JSON.stringify(payload)
        });
      } catch (firstError) {
        // Fallback retry: if create/update path mismatch happened, try the other method once.
        const retryMethod = method === "POST" ? "PUT" : "POST";
        saved = await request(endpoint, {
          method: retryMethod,
          body: JSON.stringify(payload)
        });
        method = retryMethod;
      }

      state.profile = saved;
      state.profilePersisted = true;
      state.profileCompleted = Boolean(saved?.profileCompleted ?? true);

      // Storage is best-effort only; DB save and redirect must not fail due to browser quota.
      try {
        const safeProfile = { ...saved };
        if (String(safeProfile.profilePhoto || "").startsWith("data:")) {
          safeProfile.profilePhoto = "";
        }
        localStorage.setItem("student-profile", JSON.stringify(safeProfile));
      } catch (storageError) {
        console.warn("Skipping student-profile cache due to storage limit:", storageError);
      }

      try {
        const safeUiProfile = {
          fullName: saved.fullName,
          email: saved.email,
          phone: saved.phone,
          collegeName: saved.collegeName,
          department: saved.department,
          year: saved.year,
          rollNumber: saved.rollNumber,
          section: saved.section,
          profilePhoto: String(saved.profilePhoto || "").startsWith("data:") ? "" : (saved.profilePhoto || "")
        };
        localStorage.setItem("student-ui-profile", JSON.stringify(safeUiProfile));
      } catch (storageError) {
        console.warn("Skipping student-ui-profile cache due to storage limit:", storageError);
      }

      setStatus("Profile saved successfully. Redirecting to student workspace...", "success");
      closeConfirmOverlay();
      window.location.replace("student-ui.html");
      setTimeout(() => { window.location.href = "student-ui.html"; }, 120);
    } catch (error) {
      console.error("Profile save failed:", error);
      showFieldErrors(error.fieldErrors || {});
      setStatus(formatBackendError(error, "Failed to save profile"), "error");
      throw error;
    } finally {
      state.saving = false;
      setBusy(false);
    }
  }

  function bindEvents() {
    photoPreview?.addEventListener("error", () => {
      photoPreview.src = DEFAULT_AVATAR;
    });

    nextBtn?.addEventListener("click", async () => {
      forceEmailPrefill();
      if (state.currentStep === 2) {
        await checkRollNumberUniqueness(getInputValue("rollNumber"));
      }
      if (!validateCurrentStep(state.currentStep)) return;
      state.currentStep = Math.min(3, state.currentStep + 1);
      renderStepUI();
    });

    prevBtn?.addEventListener("click", () => {
      state.currentStep = Math.max(1, state.currentStep - 1);
      renderStepUI();
    });

    clearBtn?.addEventListener("click", clearCurrentStep);

    uploadTrigger?.addEventListener("click", () => photoInput?.click());
    photoInput?.addEventListener("change", handlePhotoUpload);
    rollNumberInput?.addEventListener("input", (event) => {
      const value = String(event.target?.value || "");
      state.rollNumberExists = false;
      clearFieldError("rollNumber");
      queueRollNumberCheck(value);
    });
    rollNumberInput?.addEventListener("blur", (event) => {
      const value = String(event.target?.value || "");
      queueRollNumberCheck(value);
    });
    phoneInput?.addEventListener("input", (event) => {
      const value = String(event.target?.value || "");
      state.phoneExists = false;
      clearFieldError("phone");
      queuePhoneCheck(value);
    });
    phoneInput?.addEventListener("blur", (event) => {
      const value = String(event.target?.value || "");
      queuePhoneCheck(value);
    });

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      forceEmailPrefill();
      if (![1, 2, 3].every((step) => validateCurrentStep(step))) return;
      const payload = buildPayload();
      if (state.rollNumberExists) {
        setFieldError("rollNumber", "ID already exists");
        setStatus("Please resolve duplicate ID before proceeding.", "error");
        state.currentStep = 2;
        renderStepUI();
        return;
      }
      showReviewSummary(payload);
      setStatus("Review your details and click Finalize to save.", "info");
    });

    finalConfirmBtn?.addEventListener("click", async () => {
      if (state.saving) return;
      finalConfirmBtn.innerHTML = "<span>Saving...</span>";
      finalConfirmBtn.disabled = true;
      try {
        await saveProfile();
        closeConfirmOverlay();
      } catch (error) {
        console.error("Profile save failed:", error);
        setStatus(formatBackendError(error, "Failed to save profile"), "error");
      } finally {
        finalConfirmBtn.innerHTML = "<span>Finalize & Enter Student UI</span>";
        finalConfirmBtn.disabled = false;
      }
    });
    if (!finalConfirmBtn) {
      const confirmActions = document.getElementById("confirm-actions");
      confirmActions?.addEventListener("click", async (event) => {
        const target = event.target.closest("#final-confirm");
        if (!target || state.saving) return;
        target.innerHTML = "<span>Saving...</span>";
        target.disabled = true;
        try {
          await saveProfile();
        } catch (error) {
          console.error("Profile save failed:", error);
          setStatus(formatBackendError(error, "Failed to save profile"), "error");
        } finally {
          target.innerHTML = "<span>Finalize & Enter Student UI</span>";
          target.disabled = false;
        }
      });
    }

    cancelConfirmBtn?.addEventListener("click", closeConfirmOverlay);
    confirmOverlay?.addEventListener("click", (event) => {
      if (event.target === confirmOverlay) closeConfirmOverlay();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeConfirmOverlay();
    });
  }

  async function init() {
    if (typeof ThemeController !== "undefined" && typeof ThemeController.init === "function") {
      ThemeController.init();
    }

    if (!form) return;

    window.__PROFILE_MAIN_READY = true;
    document.body.dataset.profileBound = "1";

    // Ensure confirm modal is attached to body so fixed positioning covers full viewport.
    if (confirmOverlay && confirmOverlay.parentElement !== document.body) {
      document.body.appendChild(confirmOverlay);
    }

    bindEvents();
    renderStepUI();
    hydrateFromLocalSession();
    await loadData();
    forceEmailPrefill();
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", ProfileBriefing.init);
