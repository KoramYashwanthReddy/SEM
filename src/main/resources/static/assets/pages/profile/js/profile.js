(function () {
  const apiBase = /^https?:/i.test(window.location.origin) ? window.location.origin : "http://localhost:8080";
  const token = () => localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("jwt") || "";
  const unwrap = (payload) => {
    if (payload && typeof payload === "object" && "data" in payload && ("status" in payload || "message" in payload)) {
      return payload.data;
    }
    return payload;
  };
  const txt = (value, fallback = "") => {
    const out = value == null ? "" : String(value).trim();
    return out || fallback;
  };
  const bool = (value) => value === true || value === "true";

  const state = {
    me: null,
    profile: null,
    profileCompleted: false,
    loading: false,
    photoData: ""
  };

  const dom = {};

  function bindDom() {
    [
      "student-profile-form",
      "profile-status-chip",
      "profile-photo-preview",
      "summary-name",
      "summary-email",
      "summary-completion",
      "summary-id",
      "summary-updated",
      "fullName",
      "email",
      "phone",
      "gender",
      "dateOfBirth",
      "collegeName",
      "department",
      "year",
      "rollNumber",
      "section",
      "profilePhotoFile",
      "profile-photo-btn",
      "photo-name",
      "profilePhotoData",
      "profile-reset-btn",
      "profile-save-btn",
      "toast-root"
    ].forEach((id) => { dom[id] = document.getElementById(id); });
  }

  function isLikelyJwt(value) {
    const parts = txt(value).split(".");
    return parts.length === 3 && parts.every(Boolean);
  }

  function ensureAuth() {
    const value = token();
    if (!value || !isLikelyJwt(value)) {
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("jwt");
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  function apiUrl(path) {
    const raw = txt(path);
    if (!raw) return apiBase;
    if (/^https?:/i.test(raw)) return raw;
    return `${apiBase}${raw.startsWith("/") ? raw : `/${raw}`}`;
  }

  function showToast(message, kind = "info") {
    const root = dom["toast-root"];
    if (!root) return;
    const node = document.createElement("div");
    node.className = `toast ${kind}`;
    node.textContent = txt(message, "Unexpected error");
    root.appendChild(node);
    setTimeout(() => node.remove(), 3200);
  }

  async function request(path, options = {}, meta = {}) {
    if (!ensureAuth()) throw new Error("Missing student session");
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json,text/plain,*/*");
    const authToken = txt(token());
    if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
    const reqOptions = { ...options, headers };
    if (reqOptions.body && !(reqOptions.body instanceof FormData) && !(reqOptions.body instanceof Blob) && !(reqOptions.body instanceof URLSearchParams)) {
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      if (typeof reqOptions.body !== "string") reqOptions.body = JSON.stringify(reqOptions.body);
    }
    const response = await fetch(apiUrl(path), reqOptions);
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("jwt");
      showToast("Your session expired. Please login again.", "error");
      window.location.href = "login.html";
      throw new Error(`Auth ${response.status}`);
    }
    if (!response.ok) {
      let message = response.statusText || `Request failed (${response.status})`;
      try {
        const raw = await response.clone().text();
        if (raw) {
          try {
            const json = JSON.parse(raw);
            message = txt(json.message || json.error || json.cause || json.detail, message);
          } catch (_e) {
            message = txt(raw, message);
          }
        }
      } catch (_e) {}
      if (!meta.silent) showToast(message, "error");
      throw new Error(message);
    }
    const contentType = txt(response.headers.get("content-type")).toLowerCase();
    if (contentType.includes("application/json")) return response.json().catch(() => ({}));
    return response.text().catch(() => "");
  }

  function setLoading(active) {
    state.loading = !!active;
    if (dom["profile-save-btn"]) dom["profile-save-btn"].disabled = !!active;
    if (dom["profile-reset-btn"]) dom["profile-reset-btn"].disabled = !!active;
    if (dom["profile-status-chip"]) {
      dom["profile-status-chip"].textContent = active ? "Syncing..." : (state.profileCompleted ? "Profile complete" : "Profile incomplete");
      dom["profile-status-chip"].className = `status-pill ${active ? "" : (state.profileCompleted ? "success" : "warning")}`.trim();
    }
  }

  function mapProfile(rawUser, rawProfile) {
    const user = rawUser || {};
    const profile = rawProfile || {};
    const name = txt(profile.fullName || user.name || "Student");
    return {
      fullName: name,
      email: txt(profile.email || user.email || ""),
      phone: txt(profile.phone || ""),
      gender: txt(profile.gender || ""),
      dateOfBirth: txt(profile.dateOfBirth || ""),
      collegeName: txt(profile.collegeName || ""),
      department: txt(profile.department || user.department || ""),
      year: txt(profile.year || ""),
      rollNumber: txt(profile.rollNumber || ""),
      section: txt(profile.section || ""),
      profilePhoto: profile.profilePhoto || user.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`,
      profileCompleted: bool(profile.profileCompleted)
    };
  }

  function populateForm(profile) {
    const set = (id, value) => {
      if (dom[id]) dom[id].value = txt(value);
    };
    set("fullName", profile.fullName);
    set("email", profile.email);
    set("phone", profile.phone);
    set("gender", profile.gender);
    set("dateOfBirth", profile.dateOfBirth);
    set("collegeName", profile.collegeName);
    set("department", profile.department);
    set("year", profile.year);
    set("rollNumber", profile.rollNumber);
    set("section", profile.section);
    if (dom["profilePhotoData"]) dom["profilePhotoData"].value = profile.profilePhoto || "";
    if (dom["profile-photo-preview"]) dom["profile-photo-preview"].src = profile.profilePhoto || "";
    if (dom["photo-name"]) dom["photo-name"].textContent = profile.profilePhoto ? "Current photo loaded" : "No file selected";
    if (dom["summary-name"]) dom["summary-name"].textContent = profile.fullName || "Student";
    if (dom["summary-email"]) dom["summary-email"].textContent = profile.email || "-";
    if (dom["summary-completion"]) dom["summary-completion"].textContent = profile.profileCompleted ? "100%" : "0%";
    if (dom["summary-id"]) dom["summary-id"].textContent = txt(state.me?.id || "-");
    if (dom["summary-updated"]) dom["summary-updated"].textContent = txt(state.profile?.updatedAt ? new Date(state.profile.updatedAt).toLocaleDateString() : "Pending");
  }

  function syncStatus() {
    const completed = state.profileCompleted || false;
    if (dom["profile-status-chip"]) {
      dom["profile-status-chip"].textContent = completed ? "Profile complete" : "Profile incomplete";
      dom["profile-status-chip"].className = `status-pill ${completed ? "success" : "warning"}`;
    }
  }

  async function loadProfile() {
    if (!ensureAuth()) return;
    setLoading(true);
    try {
      const meRaw = await request("/api/users/me");
      state.me = unwrap(meRaw) || meRaw || {};
      const [profileRes, completedRes] = await Promise.allSettled([
        request("/api/student/profile", {}, { silent: true }),
        request("/api/student/profile/completed", {}, { silent: true })
      ]);
      state.profile = profileRes.status === "fulfilled" ? profileRes.value || null : null;
      state.profileCompleted = completedRes.status === "fulfilled" ? Boolean(completedRes.value) : Boolean(state.profile?.profileCompleted);
      const profile = mapProfile(state.me, state.profile);
      profile.profileCompleted = state.profileCompleted || profile.profileCompleted;
      populateForm(profile);
      syncStatus();
    } catch (error) {
      showToast(error.message || "Failed to load profile.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function readPhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function gatherPayload() {
    return {
      fullName: txt(dom["fullName"]?.value),
      phone: txt(dom["phone"]?.value),
      gender: txt(dom["gender"]?.value),
      dateOfBirth: txt(dom["dateOfBirth"]?.value),
      collegeName: txt(dom["collegeName"]?.value),
      department: txt(dom["department"]?.value),
      year: txt(dom["year"]?.value),
      rollNumber: txt(dom["rollNumber"]?.value),
      section: txt(dom["section"]?.value),
      profilePhoto: txt(dom["profilePhotoData"]?.value)
    };
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!state.me?.id) {
      showToast("Student session is missing.", "error");
      return;
    }
    const payload = gatherPayload();
    if (!payload.fullName || !payload.collegeName || !payload.department || !payload.rollNumber) {
      showToast("Fill the required profile fields before saving.", "error");
      return;
    }
    setLoading(true);
    try {
      const method = state.profile ? "PUT" : "POST";
      const saved = await request("/api/student/profile", { method, body: payload });
      state.profile = saved || null;
      state.profileCompleted = Boolean(saved?.profileCompleted);
      const profile = mapProfile(state.me, state.profile);
      profile.profileCompleted = state.profileCompleted || profile.profileCompleted;
      populateForm(profile);
      syncStatus();
      showToast("Profile saved successfully.", "success");
    } catch (error) {
      showToast(error.message || "Failed to save profile.", "error");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    const profile = mapProfile(state.me, state.profile);
    profile.profileCompleted = state.profileCompleted;
    populateForm(profile);
    syncStatus();
    showToast("Form reset.", "info");
  }

  function setupEvents() {
    dom["profile-photo-btn"]?.addEventListener("click", () => dom["profilePhotoFile"]?.click());
    dom["profilePhotoFile"]?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        if (dom["photo-name"]) dom["photo-name"].textContent = "No file selected";
        return;
      }
      try {
        const dataUrl = await readPhoto(file);
        state.photoData = dataUrl;
        if (dom["profilePhotoData"]) dom["profilePhotoData"].value = dataUrl;
        if (dom["profile-photo-preview"]) dom["profile-photo-preview"].src = dataUrl;
        if (dom["photo-name"]) dom["photo-name"].textContent = file.name;
      } catch (_e) {
        showToast("Could not read image file.", "error");
      }
    });
    dom["profile-reset-btn"]?.addEventListener("click", resetForm);
    dom["student-profile-form"]?.addEventListener("submit", saveProfile);
  }

  function init() {
    bindDom();
    if (!ensureAuth()) return;
    if (window.ThemeController?.init) window.ThemeController.init();
    setupEvents();
    loadProfile();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
