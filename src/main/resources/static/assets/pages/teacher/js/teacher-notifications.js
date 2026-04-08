(function () {
  const base = /^https?:/i.test(window.location.origin) ? window.location.origin : "http://localhost:8080";
  const TOKEN_KEYS = ["token", "accessToken", "jwt", "authToken", "access_token"];
  const normalizeToken = (raw) => {
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
  };
  const token = () => {
    for (const key of TOKEN_KEYS) {
      const localValue = normalizeToken(localStorage.getItem(key));
      if (localValue) return localValue;
      const sessionValue = normalizeToken(sessionStorage.getItem(key));
      if (sessionValue) return sessionValue;
    }
    return "";
  };
  const clearSession = () => {
    TOKEN_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  };

  const api = async (path, options = {}) => {
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    const auth = token();
    if (auth) headers.Authorization = `Bearer ${auth}`;
    if (options.body && !headers["Content-Type"] && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${base}${path}`, { credentials: "same-origin", ...options, headers });
    const raw = await res.text();
    const data = raw ? (() => { try { return JSON.parse(raw); } catch (_) { return raw; } })() : null;
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearSession();
        window.location.href = "teacher-login.html";
      }
      throw new Error((data && typeof data === "object" && (data.message || data.error)) || `Request failed (${res.status})`);
    }
    return data;
  };

  const state = {
    items: [],
    stomp: null,
    socket: null,
    recipientKey: ""
  };

  const formatItem = (item) => {
    const parts = [];
    if (item?.title) parts.push(item.title);
    if (item?.desc && item.desc !== item.title) parts.push(item.desc);
    return parts.join(" - ") || "Teacher notification";
  };

  const normalize = (item) => ({
    id: item?.id,
    title: item?.title || "Teacher notification",
    desc: item?.desc || item?.message || "",
    unread: Boolean(item?.unread),
    type: String(item?.type || "system").toLowerCase(),
    timestamp: item?.timestamp || item?.createdAt || Date.now(),
    text: formatItem(item)
  });

  const syncBridge = () => {
    const bridge = window.TeacherDashboardBridge;
    if (bridge?.setNotifications) {
      bridge.setNotifications(state.items.map((item) => ({ id: item.id, text: item.text })));
    } else {
      const list = document.getElementById("notificationList");
      const count = document.getElementById("notifCount");
      if (list) {
        list.innerHTML = state.items.length
          ? state.items.map((item) => `<li>${item.text}</li>`).join("")
          : "<li>No notifications.</li>";
      }
      if (count) {
        count.textContent = String(state.items.length);
      }
    }
  };

  const load = async () => {
    const res = await api("/api/teacher/notifications");
    const items = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
    state.items = items.map(normalize);
    syncBridge();
    return state.items;
  };

  const refresh = async () => {
    try {
      await load();
    } catch (error) {
      console.warn("Teacher notifications refresh failed:", error);
    }
  };

  const push = async (payload) => {
    const message = typeof payload === "string" ? payload : String(payload?.message || payload?.text || "");
    if (!message.trim()) return null;
    const body = {
      message,
      text: message,
      title: payload?.title || message,
      category: payload?.category || "SYSTEM",
      source: payload?.source || "Teacher Console",
      severity: payload?.severity || "info",
      targetUrl: payload?.targetUrl || null
    };
    const res = await api("/api/teacher/notifications", { method: "POST", body: JSON.stringify(body) });
    const item = normalize(res?.data);
    if (item.id) {
      state.items.unshift(item);
      state.items = state.items.slice(0, 25);
      syncBridge();
    } else {
      await refresh();
    }
    return item;
  };

  const clear = async () => {
    await api("/api/teacher/notifications/clear", { method: "DELETE" });
    state.items = [];
    syncBridge();
  };

  const markAllRead = async () => {
    await api("/api/teacher/notifications/read-all", { method: "POST" });
    state.items = state.items.map((item) => ({ ...item, unread: false }));
    syncBridge();
  };

  const connect = async () => {
    try {
      const me = await api("/api/users/me");
      state.recipientKey = String(me?.email || me?.name || "").trim().toLowerCase();
      if (!state.recipientKey || !window.SockJS || !window.Stomp) return;
      state.socket = new window.SockJS("/ws");
      state.stomp = window.Stomp.over(state.socket);
      state.stomp.debug = null;
      state.stomp.connect({}, () => {
        state.stomp.subscribe(`/topic/teacher/${state.recipientKey}`, (frame) => {
          try {
            const payload = JSON.parse(frame.body || "{}");
            const item = normalize(payload);
            if (item.id && state.items.some((existing) => String(existing.id) === String(item.id))) return;
            state.items.unshift(item);
            state.items = state.items.slice(0, 25);
            syncBridge();
            window.toast?.(item.text);
          } catch (error) {
            console.warn("Failed to parse teacher notification payload:", error);
          }
        });
      }, (error) => console.warn("Teacher notification stream unavailable:", error));
    } catch (error) {
      console.warn("Teacher notification bootstrap failed:", error);
    }
  };

  const boot = async () => {
    window.TeacherNotificationHub = {
      push,
      clear,
      markAllRead,
      refresh
    };

    await refresh();
    connect();
  };

  document.addEventListener("DOMContentLoaded", boot);
})();
