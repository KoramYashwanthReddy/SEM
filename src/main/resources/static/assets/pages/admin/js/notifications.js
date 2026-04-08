(function () {
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
    localStorage.removeItem("role");
    sessionStorage.removeItem("role");
  };

  const api = async (path, options = {}) => {
    if (window.AdminLive?.api) {
      return window.AdminLive.api(path, options);
    }

    const base = /^https?:/i.test(window.location.origin) ? window.location.origin : "http://localhost:8080";
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
        window.location.href = "admin-login.html";
      }
      throw new Error((data && typeof data === "object" && (data.message || data.error)) || `Request failed (${res.status})`);
    }
    return data;
  };

  const state = {
    items: [],
    filter: "all",
    connected: false,
    socket: null,
    stomp: null
  };

  const categoryLabel = {
    cheating: "Cheating Alerts",
    exam: "Exam Updates",
    cert: "Certificates",
    system: "System",
    user: "User Changes"
  };

  const iconByType = {
    cheating: "fa-user-shield",
    exam: "fa-file-circle-plus",
    cert: "fa-award",
    system: "fa-satellite-dish",
    user: "fa-user-gear"
  };

  const typeAlias = (value) => {
    const raw = String(value || "system").toLowerCase();
    if (raw.includes("cert")) return "cert";
    if (raw.includes("cheat") || raw.includes("proctor")) return "cheating";
    if (raw.includes("exam")) return "exam";
    if (raw.includes("user")) return "user";
    return "system";
  };

  const fmtRelative = (timestamp) => {
    if (!timestamp) return "Just now";
    const value = new Date(timestamp);
    if (Number.isNaN(value.getTime())) return String(timestamp);
    const delta = Date.now() - value.getTime();
    const mins = Math.max(1, Math.round(delta / 60000));
    if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  };

  const normalizeItem = (item) => ({
    id: item?.id,
    type: typeAlias(item?.type || item?.category),
    title: item?.title || item?.message || "Admin Notification",
    desc: item?.desc || item?.message || "",
    unread: Boolean(item?.unread),
    timestamp: item?.timestamp || item?.createdAt || Date.now(),
    source: item?.source || "",
    severity: item?.severity || "info",
    targetUrl: item?.targetUrl || ""
  });

  const getFilterCount = (type) => {
    if (type === "all") return state.items.length;
    return state.items.filter((item) => item.type === type).length;
  };

  const getUnreadCount = () => state.items.filter((item) => item.unread).length;

  const updateBadges = () => {
    const badge = document.getElementById("admin-notif-badge");
    if (badge) badge.textContent = String(getUnreadCount());

    document.querySelectorAll(".n-filter").forEach((button) => {
      const match = (button.getAttribute("onclick") || "").match(/'([^']+)'/);
      if (!match) return;
      const key = match[1];
      const count = getFilterCount(key);
      const span = button.querySelector("span");
      if (span) span.textContent = String(count);
    });
  };

  const render = (filter = state.filter) => {
    state.filter = filter || "all";
    window.allNotifs = state.items;
    const container = document.getElementById("notif-list");
    if (!container) return;

    const rows = state.filter === "all"
      ? state.items
      : state.items.filter((item) => item.type === state.filter);

    updateBadges();

    if (!rows.length) {
      container.innerHTML = `
        <div class="glass-card" style="padding:60px; text-align:center; color:var(--text-tertiary)">
          <i class="fa-solid fa-inbox" style="font-size:56px; margin-bottom:18px; opacity:0.18"></i>
          <p style="font-size:18px; font-weight:700; font-family:'Syne'; margin-bottom:8px">No notifications yet</p>
          <p style="font-size:13px; opacity:0.7">New admin alerts will appear here in real time.</p>
        </div>`;
      return;
    }

    container.innerHTML = rows.map((item) => {
      const icon = iconByType[item.type] || "fa-circle-info";
      const unreadClass = item.unread ? "unread" : "";
      return `
        <div class="notif-item ${unreadClass}" data-id="${item.id}">
          <div class="notif-icon ni-${item.type}">
            <i class="fa-solid ${icon}"></i>
          </div>
          <div class="notif-content">
            <h3 class="notif-title">${item.title}</h3>
            <p class="notif-desc">${item.desc}</p>
            <div class="notif-time">${fmtRelative(item.timestamp)}</div>
          </div>
          <div class="ni-actions">
            ${item.unread ? `<button class="ni-btn" title="Mark Read" onclick="markRead(${item.id})"><i class="fa-solid fa-check"></i></button>` : ""}
            <button class="ni-btn del" title="Delete" onclick="deleteNotif(${item.id})"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`;
    }).join("");
  };

  const loadNotifications = async (category = "all") => {
    const query = category === "all" ? "" : `?category=${encodeURIComponent(category)}`;
    const res = await api(`/api/admin/notifications${query}`);
    const items = Array.isArray(res) ? res : (res?.data || res?.notifications || []);
    state.items = items.map(normalizeItem);
    window.allNotifs = state.items;
    render(category === "all" ? state.filter : category);
    return state.items;
  };

  const syncCounts = async () => {
    try {
      await api("/api/admin/notifications/count");
    } catch (_) {
      // badge updates happen from the full payload; ignore count-only failures.
    }
  };

  const markRead = async (id) => {
    await api(`/api/admin/notifications/${id}/read`, { method: "POST" });
    state.items = state.items.map((item) => item.id === id ? { ...item, unread: false } : item);
    window.allNotifs = state.items;
    render(state.filter);
    window.showToast?.("Notification marked as read", "success");
    await syncCounts();
  };

  const markAllRead = async () => {
    await api("/api/admin/notifications/read-all", { method: "POST" });
    state.items = state.items.map((item) => ({ ...item, unread: false }));
    window.allNotifs = state.items;
    render(state.filter);
    window.showToast?.("All notifications marked as read", "success");
    await syncCounts();
  };

  const deleteNotif = async (id) => {
    await api(`/api/admin/notifications/${id}`, { method: "DELETE" });
    state.items = state.items.filter((item) => item.id !== id);
    window.allNotifs = state.items;
    render(state.filter);
    window.showToast?.("Notification deleted", "info");
    await syncCounts();
  };

  const clearNotifs = async () => {
    if (!confirm("Clear the admin inbox?")) return;
    await api("/api/admin/notifications/clear", { method: "DELETE" });
    state.items = [];
    window.allNotifs = state.items;
    render(state.filter);
    window.showToast?.("Inbox cleared", "info");
    await syncCounts();
  };

  const filterNotifs = (type, button) => {
    document.querySelectorAll(".n-filter").forEach((el) => el.classList.remove("active"));
    if (button) button.classList.add("active");
    render(type || "all");
  };

  const pushIncoming = (payload) => {
    const item = normalizeItem(payload);
    if (!item.id) {
      item.id = Date.now();
    }
    const index = state.items.findIndex((entry) => String(entry.id) === String(item.id));
    if (index >= 0) {
      state.items[index] = { ...state.items[index], ...item };
    } else {
      state.items.unshift(item);
    }
    window.allNotifs = state.items;
    render(state.filter);
    window.showToast?.(item.title || "New admin notification", "info");
  };

  const connectStream = () => {
    if (state.connected || !window.SockJS || !window.Stomp) return;

    try {
      state.socket = new window.SockJS("/ws");
      state.stomp = window.Stomp.over(state.socket);
      state.stomp.debug = null;
      state.stomp.connect(
        {},
        () => {
          state.connected = true;
          state.stomp.subscribe("/topic/admin-alerts", (frame) => {
            try {
              const payload = JSON.parse(frame.body);
              pushIncoming(payload);
            } catch (error) {
              console.error("Failed to parse admin notification payload", error);
            }
          });
        },
        (error) => {
          console.warn("Admin notification stream unavailable:", error);
        }
      );
    } catch (error) {
      console.warn("Failed to connect admin notification stream:", error);
    }
  };

  const boot = async () => {
    window.allNotifs = state.items;
    window.renderNotifications = render;
    window.filterNotifs = filterNotifs;
    window.markRead = markRead;
    window.markAllRead = markAllRead;
    window.deleteNotif = deleteNotif;
    window.clearNotifs = clearNotifs;

    try {
      await loadNotifications("all");
    } catch (error) {
      console.error("Failed to load admin notifications:", error);
      render("all");
    }

    connectStream();
  };

  document.addEventListener("DOMContentLoaded", boot);

  window.AdminNotifications = {
    refresh: () => loadNotifications(state.filter),
    setFilter: filterNotifs,
    push: pushIncoming
  };

  window.renderNotifications = render;
  window.filterNotifs = filterNotifs;
  window.markRead = markRead;
  window.markAllRead = markAllRead;
  window.deleteNotif = deleteNotif;
  window.clearNotifs = clearNotifs;
})();
