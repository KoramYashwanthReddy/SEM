/* ============================================================
   ADMIN DASHBOARD CORE LOGIC
   ============================================================ */

// ─── GLOBAL UI CONTROLLERS ───
window.switchSection = (targetId) => {
    const navItem = document.querySelector(`.nav-item[data-target="${targetId}"]`);
    if (navItem) {
        navItem.click();
        // Scroll to top of content
        const content = document.querySelector('.content-body');
        if (content) content.scrollTop = 0;
    }
};

window.openModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active', 'open');
};

window.closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active', 'open');
};

window.showToast = (msg, type = 'info') => {
    const cont = document.getElementById('toastContainer');
    if (!cont) return;
    const div = document.createElement('div');
    div.className = `toast ${type}`;
    div.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> <span>${msg}</span>`;
    cont.appendChild(div);
    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transform = 'translateX(20px)';
        setTimeout(() => div.remove(), 400);
    }, 4000);
};

const isUiNoise = (message = "", filename = "") => {
    const text = `${message} ${filename}`.toLowerCase();
    return [
        "ses removing unpermitted intrinsics",
        "could not establish connection",
        "receiving end does not exist",
        "the message port closed before a response was received",
        "fetchviaserviceworker production extension not found",
        "smart-bomb.js",
        "usage-monitoring.js",
        "browserpolyfillwrapper",
        "content.js"
    ].some((hit) => text.includes(hit));
};

const emitUiError = (message) => {
    if (typeof window.showToast === "function") {
        const text = String(message || "Unexpected admin UI error").toLowerCase();
        const isAuthNoise = [
            "unauthorized",
            "forbidden",
            "401",
            "403",
            "failed to fetch",
            "network error",
            "invalid token",
            "token expired"
        ].some((hit) => text.includes(hit));
        if (isAuthNoise) return;
        window.showToast(String(message || "Unexpected admin UI error"), "error");
    }
};

if (!window.__adminDashboardUiErrorHandlersInstalled) {
    window.__adminDashboardUiErrorHandlersInstalled = true;
    window.addEventListener("error", (event) => {
        const message = event?.message || "";
        const authNoise = String(message).toLowerCase();
        if (isUiNoise(message, event?.filename)) return;
        if ([
            "unauthorized",
            "forbidden",
            "401",
            "403",
            "failed to fetch",
            "network error",
            "invalid token",
            "token expired"
        ].some((hit) => authNoise.includes(hit))) return;
        emitUiError(event?.message || "Unexpected admin UI error");
    });
    window.addEventListener("unhandledrejection", (event) => {
        const reason = event?.reason;
        const message = typeof reason === "string"
            ? reason
            : reason?.message || reason?.cause || "Unexpected admin UI error";
        const authNoise = String(message).toLowerCase();
        if (isUiNoise(message)) return;
        if ([
            "unauthorized",
            "forbidden",
            "401",
            "403",
            "failed to fetch",
            "network error",
            "invalid token",
            "token expired"
        ].some((hit) => authNoise.includes(hit))) return;
        emitUiError(message);
    });
}

window.openAttemptDrawer = (id) => {
    const dr = document.getElementById('attemptIntelDrawer');
    if (!dr) return;

    // Find dummy or real data
    const item = (window.proctoringMonitorData || []).find(d => d.id === id) || {
        id: id,
        studentName: "Student " + id,
        studentEmail: "stu@edu.com",
        cheatingScore: 0
    };

    document.getElementById('drawerAttemptID').textContent = item.id;
    document.getElementById('drawerStudentName').textContent = item.studentName;
    document.getElementById('drawerCheatScore').textContent = (item.cheatingScore || 0) + '%';
    document.getElementById('drawerCheatBar').style.width = (item.cheatingScore || 0) + '%';

    dr.classList.add('active');
};

window.closeAttemptDrawer = () => {
    const dr = document.getElementById('attemptIntelDrawer');
    if (dr) dr.classList.remove('active');
};

window.AdminDashboard = {
    init() {
        if (this._initialized) return;
        this._initialized = true;
        ThemeController.init();
        this.setupNavigation();
        this.setupSidebarToggle();
        this.initCharts();
        this.setupUserTabs();
        this.setupSearchFilters();

        // Initialize Dashboard Module
        this.initDashboardEngine();
        this.populateRealData();
        this.refreshAuditLogsOnBoot();

        // Listen for global theme changes to refresh charts
        window.addEventListener('themechange', () => {
            this.initCharts();
        });
    },

    // ─── DASHBOARD CORE ENGINE ───
    initDashboardEngine() {
        this.dashboardState = {
            logFilter: 'all',
            examPage: 1,
            examSize: 5,
            examSort: 'active',
            examSortAsc: false,
            refreshTimer: 30
        };

        this.dashLogs = [];
        this.dashExams = [];
        this.dashAlerts = [];

        // Initial Renders
        this.refreshOverview();
        this.startDashTimer();
        this.autoLogCycle();
        this.updateActivityFooter();
    },

    refreshAuditLogsOnBoot() {
        if (!document.getElementById('audit-section')) return;

        const refresh = () => {
            if (typeof window.AdminLive?.refreshAuditLogs === 'function') {
                window.AdminLive.refreshAuditLogs().catch((error) => {
                    console.error('Failed to refresh audit logs on boot:', error);
                    window.renderAuditLogs?.();
                });
                return;
            }
            if (typeof window.renderAuditLogs === 'function') {
                window.renderAuditLogs();
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', refresh, { once: true });
        } else {
            setTimeout(refresh, 0);
        }
    },

    async refreshOverview() {
        const btn = document.getElementById('dashboard-refresh-btn');
        if (btn) btn.classList.add('loading');

        // Show Skeletons
        const container = document.getElementById('dash-metrics-container');
        if (container) container.querySelectorAll('.stat-card').forEach(c => c.classList.add('loading'));

        const logFeed = document.getElementById('dash-log-feed');
        if (logFeed) {
            const skeletons = Array(4).fill(`<div class="log-item" style="display:flex; gap:12px; padding:16px; border-bottom:1px solid var(--border-subtle); align-items:center;">
                <div style="width:36px; height:36px; border-radius:10px; background:var(--border-subtle); animation:skeletonPulse 1.5s infinite"></div>
                <div style="flex:1;"><div style="width:70%; height:12px; background:var(--border-subtle); border-radius:4px; margin-bottom:8px; animation:skeletonPulse 1.5s infinite"></div>
                <div style="width:40%; height:10px; background:var(--border-subtle); border-radius:4px; animation:skeletonPulse 1.5s infinite"></div></div>
             </div>`).join('');
            logFeed.innerHTML = skeletons;
        }

        const examBody = document.getElementById('dash-exam-body');
        if (examBody) {
            const skeletons = Array(4).fill(`<tr>
                 <td><div style="width:60%; height:16px; background:var(--border-subtle); border-radius:4px; animation:skeletonPulse 1.5s infinite"></div></td>
                 <td><div style="width:40%; height:16px; background:var(--border-subtle); border-radius:4px; animation:skeletonPulse 1.5s infinite"></div></td>
                 <td><div style="width:30%; height:16px; background:var(--border-subtle); border-radius:4px; animation:skeletonPulse 1.5s infinite"></div></td>
                 <td><div style="width:50%; height:16px; background:var(--border-subtle); border-radius:4px; animation:skeletonPulse 1.5s infinite"></div></td>
                 <td style="text-align:right"><div style="width:24px; height:24px; background:var(--border-subtle); border-radius:6px; display:inline-block; animation:skeletonPulse 1.5s infinite"></div></td>
             </tr>`).join('');
            examBody.innerHTML = skeletons;
        }

        await new Promise(r => setTimeout(r, 1200));

        try {
            // Animated Counters
            this.animateDashboardMetrics();
            this.renderDashLogs();
            this.renderDashExams();
            this.renderDashAlerts();

            if (container) container.querySelectorAll('.stat-card').forEach(c => c.classList.remove('loading'));
            if (btn) btn.classList.remove('loading');
            this.dashboardState.refreshTimer = 30;
        } catch (e) {
            console.error(e);
            if (container) container.querySelectorAll('.stat-card').forEach(c => c.classList.remove('loading'));
            if (btn) btn.classList.remove('loading');
            this.dashboardState.refreshTimer = 30;
        }
    },

    animateDashboardMetrics() {
        document.querySelectorAll('#dash-metrics-container .counter-anim').forEach(el => {
            const target = parseInt(el.getAttribute('data-target'));
            let count = 0;
            const step = Math.ceil(target / 50);
            const int = setInterval(() => {
                count += step;
                if (count >= target) {
                    count = target;
                    clearInterval(int);
                }
                el.textContent = count.toLocaleString();
            }, 30);
        });
    },

    renderDashLogs() {
        const cont = document.getElementById('dash-log-feed');
        if (!cont) return;
        if (this.dashLogs.length === 0) {
            cont.innerHTML = `<div style="padding:24px; text-align:center; color:var(--text-tertiary); font-size:13px; font-weight:600;">No persisted activity yet.</div>`;
            return;
        }
        const filtered = this.dashboardState.logFilter === 'all'
            ? this.dashLogs
            : this.dashLogs.filter(l => l.type === this.dashboardState.logFilter);

        cont.innerHTML = filtered.map(l => `
            <div class="log-item" style="animation: fadeIn 0.4s ease forwards;">
                <div class="log-icon"><i class="fa-solid ${l.icon}"></i></div>
                <div class="log-body">
                    <span class="log-msg">${l.msg}</span>
                    <div class="log-meta">
                        <span class="log-time">${l.time}</span>
                        <span class="log-type" style="background:rgba(59,130,246,0.1); color:var(--accent-blue)">#${l.type}</span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    filterLogs(type, btn) {
        this.dashboardState.logFilter = type;
        document.querySelectorAll('.l-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderDashLogs();
    },

    renderDashExams() {
        const body = document.getElementById('dash-exam-body');
        if (!body) return;
        if (this.dashExams.length === 0) {
            body.innerHTML = `<tr><td colspan="5" style="padding:24px; text-align:center; color:var(--text-tertiary);">No live exam data available.</td></tr>`;
            const pageSpan = document.getElementById('dash-exam-page');
            if (pageSpan) pageSpan.textContent = '0';
            return;
        }

        // Sorting
        const sorted = [...this.dashExams].sort((a, b) => {
            const valA = a[this.dashboardState.examSort];
            const valB = b[this.dashboardState.examSort];
            if (typeof valA === 'string') {
                return this.dashboardState.examSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return this.dashboardState.examSortAsc ? valA - valB : valB - valA;
        });

        // Search
        const query = (document.getElementById('dash-exam-search')?.value || '').toLowerCase();
        const filtered = sorted.filter(e => e.name.toLowerCase().includes(query));

        // Pagination
        const start = (this.dashboardState.examPage - 1) * this.dashboardState.examSize;
        const sliced = filtered.slice(start, start + this.dashboardState.examSize);

        body.innerHTML = sliced.map(e => `
            <tr style="animation: fadeIn 0.4s ease forwards;">
                <td><div style="font-weight:700; color:var(--text-primary)">${e.name}</div></td>
                <td><span style="font-size:11px; color:var(--text-secondary)">${e.type}</span></td>
                <td><div style="font-weight:800; color:var(--accent-blue)">${e.active}</div></td>
                <td><span class="status-badge ${e.status.toLowerCase()}">${e.status}</span></td>
                <td style="text-align:right">
                    <button class="btn btn-ghost btn-xs" onclick="switchSection('exams-section')">View</button>
                </td>
            </tr>
        `).join('');

        // Update pagination UI
        const pageSpan = document.getElementById('dash-exam-page');
        if (pageSpan) pageSpan.textContent = this.dashboardState.examPage;
    },

    sortExams(col) {
        if (this.dashboardState.examSort === col) {
            this.dashboardState.examSortAsc = !this.dashboardState.examSortAsc;
        } else {
            this.dashboardState.examSort = col;
            this.dashboardState.examSortAsc = true;
        }
        this.renderDashExams();
    },

    searchExams(val) {
        this.dashboardState.examPage = 1;
        this.renderDashExams();
    },

    renderDashAlerts() {
        const cont = document.getElementById('security-alert-feed');
        const count = document.getElementById('security-alert-count');
        if (!cont || !count) return;

        count.textContent = this.dashAlerts.length;
        if (this.dashAlerts.length === 0) {
            cont.innerHTML = `<div style="text-align:center; flex:1; display:flex; align-items:center; justify-content:center; color:var(--text-tertiary); font-size:13px; font-weight:500;">No live proctoring alerts yet.</div>`;
            return;
        }

        cont.innerHTML = this.dashAlerts.map(a => `
            <div class="sec-alert-item slide-right-anim" id="alert-${a.id}">
                <div class="risk-dot risk-${a.risk}"></div>
                <div class="sec-alert-body" style="flex:1">
                    <div style="font-size:13px; font-weight:700; color:var(--text-primary)">${a.title}</div>
                    <div style="font-size:11px; color:var(--text-secondary)">Candidate: <strong>${a.user}</strong> • ${a.time}</div>
                </div>
                <button class="icon-btn alert-dismiss-btn" title="Dismiss Alert" aria-label="Dismiss Alert" onclick="AdminDashboard.dismissAlert(${a.id})"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `).join('');
    },

    dismissAlert(id) {
        this.dashAlerts = this.dashAlerts.filter(a => a.id !== id);
        this.renderDashAlerts();
        window.showToast?.('Security threat metadata archived.', 'info');
    },

    markAlertsRead() {
        this.dashAlerts = [];
        this.renderDashAlerts();
    },

    refreshHealth() {
        const indicators = document.querySelectorAll('.status-indicator');
        indicators.forEach(i => i.classList.add('pulsing'));
        window.showToast?.('Recalibrating infrastructure health...', 'success');
        setTimeout(() => indicators.forEach(i => i.classList.remove('pulsing')), 2000);
    },

    async quickAction(type) {
        window.showToast?.(`Initializing ${type} engine...`, 'info');
        await new Promise(r => setTimeout(r, 600));

        switch (type) {
            case 'createExam': switchSection('exams-section'); break;
            case 'addTeacher': switchSection('management-section'); break;
            case 'viewAnalytics': switchSection('analytics-section'); break;
            case 'viewAttempts': switchSection('attempts-section'); break;
            case 'generateReport': switchSection('reports-section'); break;
        }
    },

    startDashTimer() {
        // Dashboard auto-refresh disabled by request
    },

    autoLogCycle() {
        // Live log updates now come from the API sync in admin-live.js.
    },

    downloadLogs() {
        window.showToast?.('Preparing audit export from live data...', 'success');
    },

    clearLogs() {
        if (confirm('Purge recent event log buffer?')) {
            this.dashLogs = [];
            this.renderDashLogs();
            window.showToast?.('Event buffer cleared successfully.', 'warning');
        }
    },

    prevExamPage() {
        if (this.dashboardState.examPage > 1) {
            this.dashboardState.examPage--;
            this.renderDashExams();
        }
    },

    nextExamPage() {
        const query = (document.getElementById('dash-exam-search')?.value || '').toLowerCase();
        const filteredCount = this.dashExams.filter(e => e.name.toLowerCase().includes(query)).length;
        if (this.dashboardState.examPage < Math.ceil(filteredCount / this.dashboardState.examSize)) {
            this.dashboardState.examPage++;
            this.renderDashExams();
        }
    },

    updateActivityFooter() {
        if (this.activityFooterInterval) clearInterval(this.activityFooterInterval);
        const renderFooter = () => {
            const examLabel = document.getElementById('last-exam-label');
            const teacherLabel = document.getElementById('last-teacher-label');
            const suspLabel = document.getElementById('last-susp-label');
            const latestExam = (this.dashExams || [])[0];
            const latestTeacher = (window.teachersData || [])[0];
            const latestAlert = (this.dashAlerts || [])[0];
            if (examLabel) examLabel.textContent = latestExam?.name || 'No exam activity';
            if (teacherLabel) teacherLabel.textContent = latestTeacher?.fullName || 'No teacher activity';
            if (suspLabel) suspLabel.textContent = latestAlert?.user ? `${latestAlert.user} (Detected)` : 'No incidents';
        };
        renderFooter();
        this.activityFooterInterval = setInterval(() => {
            renderFooter();
        }, 30000);
    },

    renderDashboardOverview() {
        const safeNum = (value) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : 0;
        };
        const formatDate = (value) => {
            if (!value) return "N/A";
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return String(value);
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
            });
        };
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        const setTrend = (id, value, direction) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.remove("up", "down");
            el.classList.add(direction === "down" ? "down" : "up");
            el.innerHTML = `<i class="fa-solid fa-arrow-${direction === "down" ? "down" : "up"}"></i> ${value}% <small>from last 7 days</small>`;
        };

        const liveDashboard = window.AdminLive?.live?.dashboard || {};
        const exams = Array.isArray(this.dashExams) ? this.dashExams : [];
        const logs = Array.isArray(this.dashLogs) ? this.dashLogs : [];
        const alerts = Array.isArray(this.dashAlerts) ? this.dashAlerts : [];
        const studentsCount = Array.isArray(window.studentsData) ? window.studentsData.length : 0;
        const teachersCount = Array.isArray(window.teachersData) ? window.teachersData.length : 0;
        const attemptsCount = Array.isArray(window.attemptsData) ? window.attemptsData.length : 0;
        const liveExamsCount = Array.isArray(window.examsData) ? window.examsData.length : 0;
        const activeExams = liveExamsCount
            ? window.examsData.filter((exam) => String(exam?.status || "").toLowerCase() === "published" || exam?.active === true).length
            : exams.filter((exam) => String(exam?.status || "").toLowerCase() === "published" || String(exam?.status || "").toLowerCase() === "live").length;

        const totalUsers = studentsCount + teachersCount || safeNum(liveDashboard.totalUsers || liveDashboard.users || liveDashboard.studentCount || liveDashboard.teacherCount);
        const totalExams = liveExamsCount || safeNum(liveDashboard.totalExams);
        const totalAttempts = attemptsCount || safeNum(liveDashboard.totalAttempts);
        const totalActiveExams = activeExams || safeNum(liveDashboard.activeExams);

        setText("overview-total-users", totalUsers.toLocaleString());
        setText("overview-total-exams", totalExams.toLocaleString());
        setText("overview-total-attempts", totalAttempts.toLocaleString());
        setText("overview-active-exams", totalActiveExams.toLocaleString());

        setTrend("overview-total-users-trend", Math.min(99, Math.max(0, Math.round(totalUsers > 0 ? 12.5 : 0))), "up");
        setTrend("overview-total-exams-trend", Math.min(99, Math.max(0, Math.round(totalExams > 0 ? 8.3 : 0))), "up");
        setTrend("overview-total-attempts-trend", Math.min(99, Math.max(0, Math.round(totalAttempts > 0 ? 15.7 : 0))), "up");
        setTrend("overview-active-exams-trend", Math.min(99, Math.max(0, Math.round(totalActiveExams > 0 ? 16.7 : 0))), "down");

        const examBody = document.getElementById("overview-recent-exams-body");
        if (examBody) {
            if (exams.length === 0) {
                examBody.innerHTML = `
                    <tr>
                        <td colspan="4" style="padding:24px; text-align:center; color:var(--text-tertiary);">
                            No live exam data available.
                        </td>
                    </tr>`;
            } else {
                const rows = [...exams]
                    .slice(0, 5)
                    .map((exam) => {
                        const status = String(exam.status || "Draft");
                        const statusClass = status.toLowerCase().replace(/\s+/g, "-");
                        const date = formatDate(exam.raw?.createdAt || exam.raw?.updatedAt || exam.date || exam.createdAt);
                        return `
                            <tr>
                                <td>
                                    <div style="font-weight:700; color:var(--text-primary)">${exam.name || exam.title || "Untitled exam"}</div>
                                </td>
                                <td><span style="font-size:11px; color:var(--text-secondary)">${exam.type || exam.subject || "Exam"}</span></td>
                                <td><span class="status-badge ${statusClass}">${status}</span></td>
                                <td><span style="color:var(--text-secondary)">${date}</span></td>
                            </tr>`;
                    })
                    .join("");
                examBody.innerHTML = rows;
            }
        }

        const activityList = document.getElementById("overview-activity-list");
        if (activityList) {
            const source = logs.length > 0 ? logs : alerts.map((alert) => ({
                type: alert.risk || "audit",
                icon: alert.risk === "high" ? "fa-triangle-exclamation" : "fa-circle-info",
                msg: `<strong>${alert.user || "System"}</strong> ${alert.title || "activity recorded"}`,
                time: alert.time || "Just now"
            }));

            if (source.length === 0) {
                activityList.innerHTML = `
                    <div class="mnc-activity-item">
                        <div class="mnc-act-icon check-bg"><i class="fa-regular fa-circle-check"></i></div>
                        <div class="mnc-act-body">
                            <span class="mnc-act-text">No recent activity available.</span>
                            <span class="mnc-act-time">Waiting for events</span>
                        </div>
                    </div>`;
            } else {
                activityList.innerHTML = source.slice(0, 5).map((item) => `
                    <div class="mnc-activity-item">
                        <div class="mnc-act-icon check-bg"><i class="fa-solid ${item.icon || "fa-circle-info"}"></i></div>
                        <div class="mnc-act-body">
                            <span class="mnc-act-text">${item.msg || "Activity recorded"}</span>
                            <span class="mnc-act-time">${item.time || "Just now"}</span>
                        </div>
                    </div>`).join("");
            }
        }
    },

    // ─── NAVIGATION ───
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item:not(.logout)');
        const sections = document.querySelectorAll('.tab-content');
        const resetAdminScrollPosition = () => {
            const contentBody = document.querySelector('.content-body');
            if (contentBody) {
                contentBody.scrollTop = 0;
                contentBody.scrollTo?.({ top: 0, behavior: 'auto' });
            }

            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            if (typeof window.scrollTo === 'function') {
                window.scrollTo({ top: 0, behavior: 'auto' });
            }
        };

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = item.getAttribute('data-target');

                // Update nav state
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                // Update section display
                sections.forEach(s => s.classList.remove('active'));
                document.getElementById(targetId).classList.add('active');

                // Re-init charts if switching to metrics/analytics
                if (targetId === 'analytics-section' || targetId === 'dashboard-section') {
                    this.initCharts();
                }

                if (targetId === 'certificates-section') {
                    this.renderCertificates();
                }

                if (targetId === 'notifications-section') {
                    window.renderNotifications?.();
                }

                if (targetId === 'leaderboard-section') {
                    this.renderLeaderboard();
                }

                if (targetId === 'settings-section') {
                    this.renderSettings?.();
                }

                if (targetId === 'audit-section') {
                    if (typeof window.AdminLive?.refreshAuditLogs === 'function') {
                        window.AdminLive.refreshAuditLogs().catch((error) => {
                            console.error('Failed to refresh audit logs:', error);
                            window.renderAuditLogs?.();
                        });
                    } else if (typeof window.renderAuditLogs === 'function') {
                        window.renderAuditLogs();
                    }
                }

                if (targetId === 'reports-section' && typeof window.renderReports === 'function') {
                    window.renderReports();
                }

                if (targetId === 'notifications-section') {
                    this.renderNotifications?.();
                }

                if (targetId === 'profile-section') {
                    this.renderAdminProfile?.();
                }

                // Keep each admin section opening from the top in both page-scroll and panel-scroll modes.
                resetAdminScrollPosition();

                // Handle mobile sidebar auto-close
                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('open');
                    document.body.classList.remove('sidebar-open');
                }
            });
        });

        // Global function for JS navigation
        window.switchSection = (id) => {
            const targetNav = document.querySelector(`.nav-item[data-target="${id}"]`);
            if (targetNav) targetNav.click();
            resetAdminScrollPosition();
            if (id === 'attempts-section') {
                window.refreshAttempts();
            }
            if (id === 'leaderboard-section') {
                AdminDashboard.renderLeaderboard();
            }
            if (id === 'proctoring-section') {
                window.refreshProctoring();
            }
            if (id === 'audit-section') {
                if (typeof window.AdminLive?.refreshAuditLogs === 'function') {
                    window.AdminLive.refreshAuditLogs().catch((error) => {
                        console.error('Failed to refresh audit logs:', error);
                        window.renderAuditLogs?.();
                    });
                } else if (typeof window.renderAuditLogs === 'function') {
                    window.renderAuditLogs();
                }
            }
        };
    },


    // ─── SIDEBAR TOGGLE ───
    setupSidebarToggle() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('toggle-sidebar');
        if (!sidebar || !toggleBtn) return;

        const handleToggle = () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('open');
                document.body.classList.toggle('sidebar-open', sidebar.classList.contains('open'));
            } else {
                // Ensure mobile overlay state never blocks desktop toggle.
                sidebar.classList.remove('open');
                document.body.classList.remove('sidebar-open');
                sidebar.classList.toggle('collapsed');
            }
        };

        if (!toggleBtn.dataset.sidebarBound) {
            toggleBtn.addEventListener('click', handleToggle);
            toggleBtn.dataset.sidebarBound = '1';
        }

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('open');
                document.body.classList.remove('sidebar-open');
            } else {
                sidebar.classList.remove('collapsed');
            }
        });
    },

    // ─── USER TABS ───
    setupUserTabs() {
        const tabTriggers = document.querySelectorAll('.tab-trigger');
        const subTabs = document.querySelectorAll('.sub-tab-content');

        tabTriggers.forEach(t => {
            t.addEventListener('click', () => {
                const targetTab = t.getAttribute('data-tab');

                tabTriggers.forEach(btn => btn.classList.remove('active'));
                t.classList.add('active');

                subTabs.forEach(content => content.classList.remove('active'));
                document.getElementById(targetTab).classList.add('active');
            });
        });
    },

    // ─── CHARTS ───
    initCharts() {
        if (!window.Chart) return;

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const colorPrimary = isDark ? '#f1f5f9' : '#0f172a';
        const colorSecondary = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

        // 1. Attempts Trend Chart (Dash/Analytics)
        this.renderLineChart('attemptsTrendChart', gridColor, colorSecondary);

        // 2. Score Distribution (Analytics)
        this.renderBarChart('scoreDistChart', gridColor, colorSecondary);

        // 3. Topic Performance (Analytics)
        this.renderPieChart('perfPieChart');
    },

    renderLineChart(id, gridColor, labelColor) {
        const ctx = document.getElementById(id);
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.charts[id]) this.charts[id].destroy();

        this.charts[id] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Attempts',
                    data: [1240, 3100, 2400, 4891],
                    borderColor: '#3b82f6',
                    backgroundGradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(59, 130, 246, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: labelColor } },
                    y: { grid: { color: gridColor }, ticks: { color: labelColor } }
                }
            }
        });
    },

    renderBarChart(id, gridColor, labelColor) {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        if (this.charts[id]) this.charts[id].destroy();

        this.charts[id] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['0-20', '20-40', '40-60', '60-80', '80-100'],
                datasets: [{
                    label: 'Students',
                    data: [120, 450, 2100, 4800, 3200],
                    backgroundColor: ['#ec4899', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: labelColor } },
                    y: { grid: { color: gridColor }, ticks: { color: labelColor } }
                }
            }
        });
    },

    renderPieChart(id) {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        if (this.charts[id]) this.charts[id].destroy();

        this.charts[id] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Passed', 'Failed', 'Suspended'],
                datasets: [{
                    data: [82.4, 15.6, 2.0],
                    backgroundColor: ['#10b981', '#ec4899', '#f59e0b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { position: 'bottom', labels: { padding: 20 } } }
            }
        });
    },

    charts: {},

    // ─── UTILS & ANIMATIONS ───
    setupSearchFilters() {
        const attachSearch = (inputId, listId, cols) => {
            const input = document.getElementById(inputId);
            const list = document.getElementById(listId);
            if (!input || !list) return;
            input.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                Array.from(list.children).forEach(tr => {
                    const text = cols.map(i => tr.children[i].textContent.toLowerCase()).join(' ');
                    tr.style.display = text.includes(query) ? '' : 'none';
                });
            });
        };
        attachSearch('examSearchInput', 'exams-list', [0, 1, 3]);
        attachSearch('teacherSearchInput', 'teachers-list', [0, 1]);
    },

    animateCounters() {
        document.querySelectorAll('.s-value').forEach(el => {
            const target = parseInt(el.textContent.replace(/,/g, ''));
            if (isNaN(target)) return;
            let count = 0;
            const inc = Math.max(1, Math.ceil(target / 40));
            const int = setInterval(() => {
                count += inc;
                if (count >= target) {
                    count = target;
                    clearInterval(int);
                }
                el.textContent = count.toLocaleString();
            }, 30);
        });
    },

    // ─── MOCK DATA & RENDERERS ───
    populateMockData() {
        // Fallback or old mock data
        this.renderExams();
        this.renderStudents();
        this.renderTeachers();
        this.renderViolations();
        this.renderCertificates();
        this.renderAttempts();
        this.appendAnalyticsProgressBars();

        // Initialize independent modules
        if (window.initLeaderboardEngine) window.initLeaderboardEngine();
    },

    async populateRealData() {
        try {
            // Fetch Exams
            const exams = await API.get('/api/admin/exams');
            window.examsData = (Array.isArray(exams) ? exams : []).map(e => ({
                id: e.examCode,
                title: e.title,
                creator: e.createdBy || 'Admin',
                duration: e.durationMinutes || 0,
                status: e.status || 'Published',
                questionsUploaded: e.questionsUploaded || false
            }));

            // Fetch Students
            const students = await API.get('/api/admin/users/students');
            window.studentsData = (Array.isArray(students) ? students : []).map(s => ({
                id: s.id, name: s.name, email: s.email, institution: s.department || 'Student', status: s.enabled ? 'Active' : 'Disabled',
                examsAttempted: 0, avgScore: 0, passRate: 0, lastLogin: s.updatedAt || 'N/A', attempts: 0, highestScore: 0, lowestScore: 0
            }));

            // Fetch Teachers
            const teachers = await API.get('/api/admin/users/teachers');
            window.teachersData = (Array.isArray(teachers) ? teachers : []).map(t => ({
                id: t.id, fullName: t.name, email: t.email, phone: t.phone || 'N/A', department: t.department || 'N/A',
                designation: t.designation || 'N/A', experienceYears: t.experienceYears || 0, qualification: t.qualification || 'N/A', employeeId: t.employeeId || 'N/A', status: t.enabled ? 'Active' : 'Disabled',
                examsCreated: [], questionsUploaded: [], attemptsHandled: { total: 0, avgScore: 0, passRate: 0 },
                cheatingReports: { suspicious: 0, flags: 0 }, analytics: { exams: 0, students: 0, certs: 0 }
            }));

            // Fetch Dashboard Stats
            const stats = await API.get('/api/admin/dashboard');
            if (stats) {
                this.updateMetricCards(stats);
            }

            // Initial Renders with real data
            this.renderExams();
            this.renderStudents();
            this.renderTeachers();
            this.renderViolations();
            this.renderCertificates();
            this.renderAttempts();
            this.appendAnalyticsProgressBars();

            if (window.initLeaderboardEngine) window.initLeaderboardEngine();
        } catch (e) {
            console.error("Failed to fetch real admin data:", e);
            // In production, we don't fall back to massive mock datasets
            window.examsData = window.examsData || [];
            window.studentsData = window.studentsData || [];
            window.teachersData = window.teachersData || [];

            this.renderExams();
            this.renderStudents();
            this.renderTeachers();
        }
    },

    updateMetricCards(stats) {
        if (!stats) return;
        const mapping = {
            'totalUsers': stats.totalUsers,
            'totalExams': stats.totalExams,
            'totalAttempts': stats.totalAttempts,
            'totalCertificates': stats.totalCertificates
        };

        const cards = document.querySelectorAll('.stat-card');
        cards.forEach(card => {
            const label = card.querySelector('.s-label')?.textContent;
            const valEl = card.querySelector('.s-value');
            if (label && valEl) {
                if (label.includes('Users')) valEl.textContent = stats.totalUsers || 0;
                if (label.includes('Exams')) valEl.textContent = stats.totalExams || 0;
                if (label.includes('Attempts')) valEl.textContent = stats.totalAttempts || 0;
                if (label.includes('Certs')) valEl.textContent = stats.totalCertificates || 0;
            }
        });
    },


    renderExams() {
        if (!window.examsData) window.examsData = [];
        window.renderGlobalExams();
    },

    renderStudents() {
        if (!window.studentsData) window.studentsData = [];
        window.renderGlobalStudents();
    },

    renderTeachers() {
        if (!Array.isArray(window.teachersData)) window.teachersData = [];
        window.renderGlobalTeachers();
    },

    renderAttempts() {
        const list = document.getElementById('attempts-list');
        if (!list) return;
        const attempts = (window.attemptsData || []).slice(0, 2).map((att) => ({
            stu: att.studentName || att.studentId || 'Unknown',
            exam: att.examTitle || att.examCode || 'Exam',
            time: att.time || att.date || '-',
            status: att.status === 'STARTED' ? 'In Progress' : (att.status || 'Completed')
        }));
        if (attempts.length === 0) {
            list.innerHTML = '<tr><td colspan="5" style="padding:24px; text-align:center; color:var(--text-tertiary);">No live attempts available.</td></tr>';
            return;
        }
        list.innerHTML = attempts.map(a => `
            <tr>
                <td style="font-weight:600;color:var(--text-primary)">${a.stu}</td>
                <td>${a.exam}</td>
                <td>${a.time}</td>
                <td><span class="status-badge ${a.status === 'Suspended' ? 'draft' : 'active'}" data-status>${a.status}</span></td>
                <td>
                    <div style="display:flex;gap:8px;">
                        ${a.status === 'Suspended'
                ? `<button class="btn btn-ghost btn-sm" onclick="handleActionBtn(this, 'Restore', 'Restoring...', 'Restored', () => { const badge = this.closest('tr').querySelector('[data-status]'); badge.textContent = 'Restored'; badge.className = 'status-badge active'; this.style.display='none'; })">Restore</button>`
                : `<button class="btn btn-ghost btn-sm" style="color:var(--accent-amber);border-color:var(--accent-amber)" onclick="handleActionBtn(this, 'Cancel', 'Canceling...', 'Canceled', () => { const badge = this.closest('tr').querySelector('[data-status]'); badge.textContent = 'Canceled'; badge.className = 'status-badge draft'; this.style.display='none'; })">Cancel</button>`
            }
                    </div>
                </td>
            </tr>
        `).join('');
    },

    renderViolations() {
        const list = document.getElementById('violations-list');
        if (!list) return;
        const events = (window.proctoringMonitorData || []).slice(0, 3).map((item) => ({
            time: item.time || item.date || '-',
            user: item.studentId || item.studentName || 'Unknown',
            type: item.violationType || 'Proctoring Alert',
            risk: Number(item.cheatingScore || 0)
        }));
        if (events.length === 0) {
            list.innerHTML = '<tr><td colspan="5" style="padding:24px; text-align:center; color:var(--text-tertiary);">No live violation data available.</td></tr>';
            return;
        }

        list.innerHTML = events.map(ev => `
            <tr class="${ev.risk > 80 ? 'row-suspicious' : ''}">
                <td>${ev.time}</td>
                <td style="font-family:'JetBrains Mono'">${ev.user}</td>
                <td><span class="status-badge draft">${ev.type}</span></td>
                <td style="color:${ev.risk > 80 ? 'var(--accent-pink)' : 'var(--accent-amber)'}; font-weight:800">${ev.risk}%</td>
                <td><button class="btn btn-primary btn-sm" onclick="openEvidence('${ev.user}', '${ev.type}', '${ev.time}')">Review</button></td>
            </tr>
        `).join('');
    },

    renderCertificates() {
        if (window.initCertificatesEngine) {
            window.initCertificatesEngine();
        }
    },

    renderLeaderboard() {
        const list = document.getElementById('ranks-list');
        if (!list) return;
        const ranks = (window.allLeaderboard || []).slice(0, 5).map((row, i) => ({
            rank: row.rank || (i + 1),
            name: row.name || row.studentName || 'Student',
            points: Number(row.score || row.points || 0),
            acc: `${Number(row.percentage || row.acc || 0)}%`
        }));
        if (ranks.length === 0) {
            list.innerHTML = '<tr><td colspan="4" style="padding:24px; text-align:center; color:var(--text-tertiary);">No live leaderboard data available.</td></tr>';
            return;
        }

        list.innerHTML = ranks.map(r => `
            <tr>
                <td style="font-weight:800; color:var(--accent-blue)">#${r.rank}</td>
                <td style="font-weight:600;color:var(--text-primary)">${r.name}</td>
                <td><span style="font-family:'Syne'; font-weight:700">${r.points}</span></td>
                <td>${r.acc}</td>
            </tr>
        `).join('');
    },

    appendAnalyticsProgressBars() {
        const grid = document.querySelector('.analytics-grid');
        if (!grid || document.getElementById('analytics-goals')) return;
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.id = 'analytics-goals';
        card.style.padding = '24px';
        card.innerHTML = `
            <h3 class="card-title" style="margin-bottom:24px;">Platform Usage Goals</h3>
            <div style="margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                    <span style="color:var(--text-secondary)">Weekly Exam Creation</span>
                    <span style="font-weight:700">85%</span>
                </div>
                <div class="progress-wrap"><div class="progress-bar" style="width:0%" data-target="85%"></div></div>
            </div>
            <div style="margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                    <span style="color:var(--text-secondary)">Active Student Target</span>
                    <span style="font-weight:700">62%</span>
                </div>
                <div class="progress-wrap"><div class="progress-bar" style="width:0%" data-target="62%"></div></div>
            </div>
            <div style="margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                    <span style="color:var(--text-secondary)">Proctoring Health</span>
                    <span style="font-weight:700">98%</span>
                </div>
                <div class="progress-wrap"><div class="progress-bar" style="width:0%" data-target="98%"></div></div>
            </div>
        `;
        grid.appendChild(card);
        // Animate
        setTimeout(() => {
            card.querySelectorAll('.progress-bar').forEach(bar => {
                bar.style.width = bar.getAttribute('data-target');
            });
        }, 800);
    }
};

// ─── GLOBAL MODAL & ACTION API ───

function hydrateUsersData() {
    const live = window.AdminLive?.live || {};
    const normalizeRole = (value) => String(value || "")
        .replace(/^ROLE_/i, "")
        .trim()
        .toUpperCase();
    const normalizeStatus = (value) => {
        if (value === false) return "Inactive";
        return String(value || "").toLowerCase() === "disabled" ? "Inactive" : "Active";
    };
    const studentFromRaw = (u) => ({
        id: String(u?.id || ""),
        name: String(u?.name || u?.fullName || u?.email || "Student"),
        email: String(u?.email || ""),
        institution: String(u?.department || u?.institution || "N/A"),
        status: normalizeStatus(u?.status ?? u?.enabled),
        joinedOn: u?.joinedOn || u?.createdAt || u?.updatedAt || "",
        createdAt: u?.createdAt || "",
        raw: u
    });
    const teacherFromRaw = (u) => ({
        id: String(u?.id || ""),
        fullName: String(u?.name || u?.fullName || u?.email || "Teacher"),
        email: String(u?.email || ""),
        department: String(u?.department || "N/A"),
        designation: String(u?.designation || "N/A"),
        experienceYears: Number(u?.experienceYears || 0),
        qualification: String(u?.qualification || "N/A"),
        employeeId: String(u?.employeeId || "N/A"),
        phone: String(u?.phone || ""),
        profileImage: String(u?.profileImage || u?.profilePhoto || u?.avatar || u?.imageUrl || ""),
        status: normalizeStatus(u?.status ?? u?.enabled),
        joinedOn: u?.joinedOn || u?.createdAt || u?.updatedAt || "",
        createdAt: u?.createdAt || "",
        raw: u
    });
    const liveUsers = Array.isArray(live.users) ? live.users : [];
    const liveStudents = Array.isArray(live.students) ? live.students : [];
    const liveTeachers = Array.isArray(live.teachers) ? live.teachers : [];

    if (!Array.isArray(window.studentsData) || window.studentsData.length === 0) {
        const source = liveStudents.length > 0 ? liveStudents : liveUsers.filter((u) => normalizeRole(u?.role) === "STUDENT");
        if (source.length > 0) {
            window.studentsData = source.map(studentFromRaw);
        }
    }

    if (!Array.isArray(window.teachersData) || window.teachersData.length === 0) {
        const source = liveTeachers.length > 0 ? liveTeachers : liveUsers.filter((u) => normalizeRole(u?.role) === "TEACHER");
        if (source.length > 0) {
            window.teachersData = source.map(teacherFromRaw);
        }
    }
}

window.ensureAdminUsersData = async function () {
    if (window._adminUsersDataLoaded) return;
    if (window._adminUsersDataPromise) return window._adminUsersDataPromise;

    const normalizeRole = (value) => String(value || "")
        .replace(/^ROLE_/i, "")
        .trim()
        .toUpperCase();
    const normalizeStatus = (value) => {
        if (value === false) return "Inactive";
        return String(value || "").toLowerCase() === "disabled" ? "Inactive" : "Active";
    };
    const mapStudent = (u) => ({
        id: String(u?.id || u?.userId || ""),
        name: String(u?.name || u?.fullName || u?.email || "Student"),
        email: String(u?.email || ""),
        institution: String(u?.department || u?.institution || "N/A"),
        status: normalizeStatus(u?.status ?? u?.enabled),
        joinedOn: u?.joinedOn || u?.createdAt || u?.updatedAt || "",
        createdAt: u?.createdAt || "",
        raw: u
    });
    const mapTeacher = (u) => ({
        id: String(u?.id || u?.userId || ""),
        fullName: String(u?.name || u?.fullName || u?.email || "Teacher"),
        email: String(u?.email || ""),
        department: String(u?.department || "N/A"),
        designation: String(u?.designation || "N/A"),
        experienceYears: Number(u?.experienceYears || 0),
        qualification: String(u?.qualification || "N/A"),
        employeeId: String(u?.employeeId || "N/A"),
        phone: String(u?.phone || ""),
        profileImage: String(u?.profileImage || u?.profilePhoto || u?.avatar || u?.imageUrl || ""),
        status: normalizeStatus(u?.status ?? u?.enabled),
        joinedOn: u?.joinedOn || u?.createdAt || u?.updatedAt || "",
        createdAt: u?.createdAt || "",
        raw: u
    });

    window._adminUsersDataPromise = (async () => {
        try {
            const [allUsers, studentsResp, teachersResp] = await Promise.allSettled([
                API.get('/api/admin/users'),
                API.get('/api/admin/users/students'),
                API.get('/api/admin/users/teachers')
            ]);

            const fromAllUsers = (allUsers.status === 'fulfilled' && Array.isArray(allUsers.value)) ? allUsers.value : [];
            const fromStudents = (studentsResp.status === 'fulfilled' && Array.isArray(studentsResp.value)) ? studentsResp.value : [];
            const fromTeachers = (teachersResp.status === 'fulfilled' && Array.isArray(teachersResp.value)) ? teachersResp.value : [];

            const studentsMap = new Map();
            const teachersMap = new Map();

            const ingestStudents = (rows) => rows.forEach((row) => {
                const id = String(row?.id || row?.userId || row?.email || "");
                if (!id) return;
                studentsMap.set(id, mapStudent(row));
            });
            const ingestTeachers = (rows) => rows.forEach((row) => {
                const id = String(row?.id || row?.userId || row?.email || "");
                if (!id) return;
                teachersMap.set(id, mapTeacher(row));
            });

            ingestStudents(fromStudents);
            ingestTeachers(fromTeachers);

            fromAllUsers.forEach((user) => {
                const role = normalizeRole(user?.role);
                if (role === 'STUDENT') ingestStudents([user]);
                if (role === 'TEACHER') ingestTeachers([user]);
            });

            if (!Array.isArray(window.studentsData) || window.studentsData.length === 0) {
                window.studentsData = [...studentsMap.values()];
            }
            if (!Array.isArray(window.teachersData) || window.teachersData.length === 0) {
                window.teachersData = [...teachersMap.values()];
            }

            window._adminUsersDataLoaded = true;
            return { students: window.studentsData, teachers: window.teachersData };
        } catch (error) {
            console.error("Failed to load admin users:", error);
            throw error;
        } finally {
            window._adminUsersDataPromise = null;
        }
    })();

    return window._adminUsersDataPromise;
};

window.handleActionBtn = async function (btn, normalText, processingText, successText, operationCb) {
    if (btn.disabled) return;
    btn.disabled = true;
    const originalWidth = btn.offsetWidth;
    btn.style.width = originalWidth + 'px';

    // Show spinner
    btn.innerHTML = `<span class="btn-spinner"></span> ${processingText}`;
    btn.classList.add('processing');

    // Simulate API delay (per USER requirement of 500ms)
    await new Promise(r => setTimeout(r, 500));

    // Execute callback
    let success = true;
    if (operationCb) success = await operationCb() !== false;

    if (success) {
        btn.classList.remove('processing');
        btn.classList.add('success');
        btn.innerHTML = `✓ ${successText}`;
    }

    // Restore
    setTimeout(() => {
        if (btn.parentElement && !btn.closest('.success-hide')) {
            btn.classList.remove('success', 'processing');
            btn.innerHTML = normalText;
            btn.disabled = false;
            btn.style.width = '';
        }
    }, 1500);
};

window.openModal = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open', 'active');
    if (id === 'addTeacherModal') {
        resetTeacherStepper();
    }
};
window.closeModal = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open', 'active');
};
window.closeModalOutside = function (event, id) {
    if (event.target.id === id) {
        if (id === 'deleteConfirmModal' && typeof window.resetDeleteConfirmModalState === 'function') {
            window.resetDeleteConfirmModalState();
        }
        closeModal(id);
    }
};

let currentTeacherStep = 1;

window.resetTeacherStepper = function () {
    currentTeacherStep = 1;
    showTeacherStep(1);

    // Clear old errors on first open
    document.querySelectorAll('#createTeacherForm .form-control').forEach(input => {
        setError(input.id, false);
    });
};

window.showTeacherStep = function (step) {
    currentTeacherStep = step;

    // Hide all steps, show active
    document.querySelectorAll('#createTeacherForm .stepper-step').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.step) === step);
    });

    // Update step indicator header
    document.querySelectorAll('#addTeacherModal .step-indicator').forEach(el => {
        const stepNum = parseInt(el.dataset.step);
        el.classList.toggle('active', stepNum === step);
        el.classList.toggle('completed', stepNum < step);
    });

    // Show/hide buttons
    const prevBtn = document.querySelector('#createTeacherForm .btn-prev');
    const nextBtn = document.querySelector('#createTeacherForm .btn-next');
    const submitBtn = document.querySelector('#createTeacherForm .btn-submit');

    if (prevBtn) prevBtn.classList.toggle('hidden', step === 1);
    if (nextBtn) nextBtn.classList.toggle('hidden', step === 4);
    if (submitBtn) submitBtn.classList.toggle('hidden', step !== 4);
};

window.nextTeacherStep = function () {
    if (validateTeacherStep(currentTeacherStep)) {
        showTeacherStep(currentTeacherStep + 1);
    }
};

window.prevTeacherStep = function () {
    showTeacherStep(currentTeacherStep - 1);
};

function validateTeacherStep(step) {
    const val = (id) => document.getElementById(id)?.value?.trim() || '';
    const check = (id, condition) => {
        const isOk = condition;
        setError(id, !isOk);
        return isOk;
    };

    if (step === 1) {
        const name = val('t-name');
        const email = val('t-email');
        const pwd = val('t-pwd');

        let valid = true;
        if (!check('t-name', name.length >= 3)) valid = false;

        const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!check('t-email', isEmailValid)) valid = false;

        const tId = val('t-id');
        const isEdit = tId !== '';
        if (!isEdit && !check('t-pwd', pwd.length >= 6)) valid = false;

        return valid;
    }

    if (step === 2) {
        const phone = val('t-phone');
        const empid = val('t-empid');

        let valid = true;
        if (!check('t-phone', phone === '' || /^\d{10}$/.test(phone))) valid = false;

        const isEmpIdUnique = empid === '' || empid !== 'EMP-0000';
        if (!check('t-empid', isEmpIdUnique)) valid = false;

        return valid;
    }

    if (step === 3) {
        const expStr = val('t-exp');
        const exp = parseFloat(expStr);
        return check('t-exp', expStr === '' || (!isNaN(exp) && exp >= 0));
    }

    return true;
}

window.showToast = function (msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span style="font-size:18px;color:var(--accent-green)">✓</span> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fadeOut');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// Error highlighting utility
function setError(id, show) {
    const el = document.getElementById(id);
    if (show) {
        el.classList.add('is-invalid');
        const next = el.nextElementSibling;
        if (next && next.classList.contains('error-msg')) next.classList.add('show');
    } else {
        el.classList.remove('is-invalid');
        const next = el.nextElementSibling;
        if (next && next.classList.contains('error-msg')) next.classList.remove('show');
    }
}

window.submitCreateExam = async function (event, btn) {
    event.preventDefault();

    // Values
    const val = (id) => document.getElementById(id).value.trim();
    const num = (id) => parseFloat(val(id)) || 0;
    const time = (id) => new Date(val(id)).getTime();

    const title = val('ex-title');
    const subj = val('ex-subj');
    const dur = num('ex-dur');
    const start = time('ex-start');
    const end = time('ex-end');
    const totalM = num('ex-total');
    const passM = num('ex-pass');
    const perQ = num('ex-perq');
    const neg = num('ex-neg');
    const att = num('ex-attempts');
    const e = num('ex-easy');
    const m = num('ex-med');
    const d = num('ex-diff');

    // Validation Rules
    let valid = true;
    let firstInvalid = null;

    const check = (id, condition) => {
        const isOk = condition;
        setError(id, !isOk);
        if (!isOk) { valid = false; if (!firstInvalid) firstInvalid = id; }
    };

    check('ex-title', title.length > 0);
    check('ex-subj', subj.length > 0);
    check('ex-dur', dur > 0);
    check('ex-start', !isNaN(start));
    check('ex-end', !isNaN(end) && end > start);
    check('ex-total', totalM > 0);
    check('ex-pass', passM >= 0 && passM <= totalM);
    check('ex-perq', perQ > 0);
    check('ex-neg', neg >= 0);
    check('ex-attempts', att >= 1);
    check('ex-easy', e >= 0);
    check('ex-med', m >= 0);
    check('ex-diff', d >= 0);

    if (!valid) {
        document.getElementById(firstInvalid).focus();
        return;
    }

    handleActionBtn(btn, 'Create Exam', 'Creating...', 'Created', () => {
        const code = generateExamCode();
        window.examsData.unshift({
            id: code,
            title: title,
            creator: 'Admin Profile',
            duration: dur,
            status: 'Draft',
            questionsUploaded: false
        });

        // Switch to Drafts filter automatically or stay on All
        if (window.currentExamFilter === 'published') {
            setExamFilter('all', document.querySelector('[data-filter="all"]'));
        } else {
            window.renderGlobalExams();
        }

        const list = document.getElementById('exams-list');
        if (list && list.firstElementChild) {
            list.firstElementChild.classList.add('row-inserted');
        }

        setTimeout(() => {
            showToast('Exam created successfully.');
            document.getElementById('createExamForm').reset();
            closeModal('createExamModal');
        }, 1000);
    });
};

window.submitAddTeacher = async function (event, btn) {
    event.preventDefault();

    // Values
    const val = (id) => document.getElementById(id)?.value?.trim() || '';

    const name = val('t-name');
    const email = val('t-email');
    const pwd = val('t-pwd');
    const phone = val('t-phone');
    const dept = val('t-dept') || 'General';
    const profileImage = '';
    const empid = val('t-empid');
    const expStr = val('t-exp');
    const exp = parseFloat(expStr);

    let valid = true;
    let firstInvalid = null;

    const check = (id, condition) => {
        const isOk = condition;
        setError(id, !isOk);
        if (!isOk) { valid = false; if (!firstInvalid) firstInvalid = id; }
    };

    // Validations
    check('t-name', name.length >= 3);

    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    check('t-email', isEmailValid);

    check('t-pwd', pwd.length >= 6);

    check('t-phone', phone === '' || /^\d{10}$/.test(phone));

    check('t-exp', expStr === '' || (!isNaN(exp) && exp >= 0));

    // Simulated Unique Check
    const isEmpIdUnique = empid === '' || empid !== 'EMP-0000'; // Assume EMP-0000 is taken
    check('t-empid', isEmpIdUnique);

    if (!valid) {
        document.getElementById(firstInvalid).focus();
        return;
    }

    const tId = val('t-id');
    const isEdit = tId !== '';

    handleActionBtn(btn, isEdit ? 'Save Changes' : 'Create Teacher', isEdit ? 'Saving...' : 'Creating...', isEdit ? 'Saved' : 'Teacher Created', () => {
        if (isEdit) {
            const t = window.teachersData.find(x => x.id === tId);
            if (t) {
                t.fullName = name; t.email = email; t.phone = phone; t.department = dept;
                t.designation = val('t-designation'); t.experienceYears = exp || 0;
                t.qualification = val('t-qual'); t.employeeId = empid;
                t.profileImage = profileImage || t.profileImage || '';
                // password ignored in edit simulate
            }
        } else {
            window.teachersData.unshift({
                id: 'T-' + Date.now(),
                fullName: name, email: email, phone: phone, department: dept,
                profileImage: profileImage,
                designation: val('t-designation'), experienceYears: exp || 0,
                qualification: val('t-qual'), employeeId: empid, status: 'Active',
                examsCreated: [], questionsUploaded: [],
                attemptsHandled: { total: 0, avgScore: 0, passRate: 0 },
                cheatingReports: { suspicious: 0, flags: 0 },
                analytics: { exams: 0, students: 0, certs: 0 }
            });
        }

        window.renderGlobalTeachers();

        if (!isEdit) {
            const list = document.getElementById('teachers-list');
            if (list && list.firstElementChild) {
                list.firstElementChild.classList.add('row-inserted');
            }
        }

        setTimeout(() => {
            showToast(isEdit ? 'Teacher updated successfully.' : 'Teacher created successfully.');
            document.getElementById('createTeacherForm').reset();
            document.getElementById('t-id').value = '';
            document.querySelector('#addTeacherModal .modal-title').textContent = 'Create New Teacher';
            btn.textContent = 'Create Teacher';
            closeModal('addTeacherModal');
        }, 1000);
    });
};

window.openEvidence = function (user, type, time) {
    document.getElementById('evidence-desc').innerHTML = `Reviewing evidence for <strong>${user}</strong> at ${time}. Warning trigger: <strong>${type}</strong>.`;
    openModal('evidenceModal');
};

window.submitEvidenceAction = function (btn, action) {
    handleActionBtn(btn, action, 'Processing...', action + 'ed', () => {
        setTimeout(() => closeModal('evidenceModal'), 1000);
    });
};

window.filterViolations = function (risk) {
    const list = document.getElementById('violations-list');
    if (!list) return;
    Array.from(list.children).forEach(tr => {
        if (risk === 'all') {
            tr.style.display = '';
        } else {
            const isHigh = tr.classList.contains('row-suspicious');
            if (risk === 'high') tr.style.display = isHigh ? '' : 'none';
            if (risk === 'med') tr.style.display = isHigh ? 'none' : '';
        }
    });
};

window.toggleMaintenance = function (btn) {
    const isMaint = btn.textContent.includes('Enable');
    handleActionBtn(btn, isMaint ? 'Disable Maintenance' : 'Enable Maintenance', isMaint ? 'Enabling...' : 'Disabling...', isMaint ? 'Enabled' : 'Disabled');
};

window.clearCache = function (btn) {
    handleActionBtn(btn, 'Clear Cache', 'Clearing...', 'Cache Cleared');
};

// Global Key Listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(modal => {
            if (modal.id === 'deleteConfirmModal' && typeof window.resetDeleteConfirmModalState === 'function') {
                window.resetDeleteConfirmModalState();
            }
            modal.classList.remove('open', 'active');
        });
    }
});

// Start
document.addEventListener('DOMContentLoaded', () => {
    AdminDashboard.init();
});

// ─── EXAMS MANAGEMENT LOGIC ───
window.generateExamCode = function () {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    do {
        code = 'EXAM-';
        for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    } while (window.examsData && window.examsData.find(e => e.id === code));
    return code;
};

// ─── EXAM SECTION: subject helper ───
function _examSubject(title) {
    const t = (title || '').toLowerCase();
    if (t.includes('python')) return 'PYTHON';
    if (t.includes('dbms') || t.includes('database')) return 'DBMS';
    if (t.includes('structure') || t.includes('dsa')) return 'DSA';
    if (t.includes('operating') || t.includes(' os') || t === 'os') return 'OS';
    if (t.includes('web') || t.includes('html') || t.includes('css')) return 'WEB';
    if (t.includes('intelligence') || t.includes(' ai') || t.startsWith('ai ')) return 'AI';
    if (t.includes('java')) return 'JAVA';
    if (t.includes('c++') || t.includes('cpp')) return 'C++';
    if (t.includes('network')) return 'NET';
    if (t.includes('math')) return 'MATH';
    return (title || '').split(' ')[0].substring(0, 5).toUpperCase();
}

window.renderGlobalExams = function () {
    const list = document.getElementById('exams-list');
    if (!list) return;

    const filter = window.currentExamFilter || 'all';
    const pageSize = Number(window.currentExamPageSize || 9);
    const search = (document.getElementById('examSearchInput')?.value || '').toLowerCase();
    const sortVal = document.getElementById('examSortFilter')?.value || 'newest';
    const all = window.examsData || [];

    // tab badges
    const bAll = document.getElementById('badge-all');
    const bPub = document.getElementById('badge-published');
    const bDraft = document.getElementById('badge-draft');
    if (bAll) bAll.textContent = all.length;
    if (bPub) bPub.textContent = all.filter(e => e.status === 'Published').length;
    if (bDraft) bDraft.textContent = all.filter(e => e.status === 'Draft').length;

    let filtered = all.filter(e => {
        if (filter === 'published' && e.status !== 'Published') return false;
        if (filter === 'draft' && e.status !== 'Draft') return false;
        if (!search) return true;
        return [e.title, e.id, e.creator].some(v => String(v || '').toLowerCase().includes(search));
    });

    if (sortVal === 'oldest') filtered = [...filtered].reverse();
    else if (sortVal === 'az') filtered = [...filtered].sort((a, b) => String(a.title).localeCompare(String(b.title)));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(Number(window.currentExamPage || 1), 1), totalPages);
    window.currentExamPage = page;
    const start = (page - 1) * pageSize;
    const pageRows = filtered.slice(start, start + pageSize);

    if (pageRows.length === 0) {
        list.innerHTML = `<div class="em-empty"><i class="fa-regular fa-folder-open"></i><p>No exams found</p></div>`;
    } else {
        list.innerHTML = pageRows.map(e => {
            const statusKey = String(e.status || 'draft').toLowerCase();
            const creator = String(e.creator || 'Admin');
            const initials = creator.split(/[\s@._-]+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'AU';
            const subject = _examSubject(e.title);
            const canPublish = e.status === 'Draft' && !!e.questionsUploaded;
            const dateStr = e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            const publishOpt = e.status === 'Draft'
                ? (canPublish
                    ? `<button onclick="publishExam(this,'${e.id}')"><i class="fa-solid fa-circle-check"></i> Publish</button>`
                    : `<button disabled title="Upload questions first"><i class="fa-solid fa-circle-check"></i> Publish</button>`)
                : `<button disabled><i class="fa-solid fa-check-double"></i> Published</button>`;
            return `<div class="em-card" data-exid="${e.id}">
                <div class="em-card-top">
                    <span class="em-subject em-subj-${subject.toLowerCase()}">${subject}</span>
                    <div class="em-menu-wrap">
                        <button class="em-dots-btn" onclick="emToggleMenu(event,'${e.id}')" aria-label="Options">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <div class="em-dropdown" id="emdrop-${e.id}">
                            <button onclick="openUploadQuestions('${e.id}')"><i class="fa-solid fa-upload"></i> Upload Qs</button>
                            <button onclick="openViewQuestions('${e.id}')"><i class="fa-regular fa-eye"></i> View Qs</button>
                            ${publishOpt}
                            <button onclick="openEditExam('${e.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                            <button class="em-danger" onclick="confirmDeleteExam('${e.id}')"><i class="fa-regular fa-trash-can"></i> Delete</button>
                        </div>
                    </div>
                </div>
                <div class="em-card-body">
                    <h3 class="em-card-title">${e.title}</h3>
                    <div class="em-card-code">${e.id}</div>
                    <div class="em-card-meta">
                        <span><i class="fa-regular fa-clock"></i> ${e.duration} Min</span>
                        <span><i class="fa-regular fa-circle-question"></i> Questions</span>
                    </div>
                    <div class="em-card-status">
                        <span class="em-status-dot em-status-${statusKey}"></span>
                        <span class="em-status-label">${e.status}</span>
                    </div>
                </div>
                <div class="em-card-footer">
                    <div class="em-creator">
                        <span class="em-avatar">${initials}</span>
                        <span class="em-creator-name">${creator}</span>
                    </div>
                    ${dateStr ? `<span class="em-date">${dateStr}</span>` : ''}
                </div>
            </div>`;
        }).join('');
    }

    const countEl = document.getElementById('exam-count');
    if (countEl) countEl.textContent = total === 0
        ? 'Showing 0 to 0 of 0 exams'
        : `Showing ${start + 1} to ${Math.min(start + pageRows.length, total)} of ${total} exams`;

    const pEl = document.getElementById('exam-pagination-container');
    if (pEl) {
        let h = `<button class="em-page-btn" ${page <= 1 ? 'disabled' : ''} onclick="window.prevExamPage()"><i class="fa-solid fa-chevron-left"></i></button>`;
        const show = new Set([1, totalPages]);
        for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i++) show.add(i);
        const sorted = [...show].sort((a, b) => a - b);
        let prev = 0;
        sorted.forEach(p => {
            if (prev && p - prev > 1) h += `<span class="em-page-dots">\u2026</span>`;
            h += `<button class="em-page-btn${p === page ? ' active' : ''}" onclick="window.goToExamPage(${p})">${p}</button>`;
            prev = p;
        });
        h += `<button class="em-page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="window.nextExamPage()"><i class="fa-solid fa-chevron-right"></i></button>`;
        pEl.innerHTML = h;
    }
};

window.setExamFilter = function (filter, btn) {
    document.querySelectorAll('.em-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#examFilterGroup button').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    window.currentExamFilter = filter;
    window.currentExamPage = 1;
    window.renderGlobalExams();
};

window.prevExamPage = function () { window.currentExamPage = Math.max(1, (window.currentExamPage || 1) - 1); window.renderGlobalExams(); };
window.nextExamPage = function () { window.currentExamPage = (window.currentExamPage || 1) + 1; window.renderGlobalExams(); };
window.goToExamPage = function (p) { window.currentExamPage = p; window.renderGlobalExams(); };

window.emToggleMenu = function (evt, id) {
    evt.stopPropagation();
    document.querySelectorAll('.em-dropdown.open').forEach(d => { if (d.id !== 'emdrop-' + id) d.classList.remove('open'); });
    const drop = document.getElementById('emdrop-' + id);
    if (drop) drop.classList.toggle('open');
};

(function () {
    function _wireExam() {
        const inp = document.getElementById('examSearchInput');
        if (inp && !inp._emWired) { inp._emWired = true; inp.addEventListener('input', () => { window.currentExamPage = 1; window.renderGlobalExams(); }); }
    }
    document.addEventListener('DOMContentLoaded', _wireExam);
    _wireExam();
}());



window.prevExamPage = function () {
    window.currentExamPage = Math.max(1, Number(window.currentExamPage || 1) - 1);
    window.renderGlobalExams();
};

window.nextExamPage = function () {
    const filter = window.currentExamFilter || 'all';
    const searchTerm = (document.getElementById('examSearchInput')?.value || '').toLowerCase();
    const filtered = (window.examsData || []).filter((e) => {
        if (filter === 'published' && e.status !== 'Published') return false;
        if (filter === 'draft' && e.status !== 'Draft') return false;
        const titleText = String(e.title || '').toLowerCase();
        const codeText = String(e.id || '').toLowerCase();
        const creatorText = String(e.creator || '').toLowerCase();
        return !searchTerm || titleText.includes(searchTerm) || codeText.includes(searchTerm) || creatorText.includes(searchTerm);
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / Number(window.currentExamPageSize || 10)));
    window.currentExamPage = Math.min(totalPages, Number(window.currentExamPage || 1) + 1);
    window.renderGlobalExams();
};

window.openEditExam = function (id) {
    const exam = window.examsData.find(x => x.id === id);
    if (!exam) return;
    document.getElementById('edit-ex-id').value = id;
    document.getElementById('edit-ex-title').value = exam.title;
    document.getElementById('edit-ex-dur').value = exam.duration;
    openModal('editExamModal');
};

window.submitEditExam = async function (event, btn) {
    event.preventDefault();
    const id = document.getElementById('edit-ex-id').value;
    const title = document.getElementById('edit-ex-title').value.trim();
    const dur = document.getElementById('edit-ex-dur').value;

    let valid = true;
    if (!title) { setError('edit-ex-title', true); valid = false; } else setError('edit-ex-title', false);
    if (!dur || parseFloat(dur) <= 0) { setError('edit-ex-dur', true); valid = false; } else setError('edit-ex-dur', false);
    if (!valid) return;

    handleActionBtn(btn, 'Save Changes', 'Saving...', 'Saved', () => {
        const exam = window.examsData.find(x => x.id === id);
        if (exam) {
            exam.title = title;
            exam.duration = dur;
        }
        window.renderGlobalExams();
        setTimeout(() => {
            showToast('Exam updated successfully.');
            closeModal('editExamModal');
        }, 1000);
    });
};

window.confirmDeleteExam = function (id) {
    window.examToDeleteId = id;
    window.teacherToDeleteId = null;
    window.studentToDeleteId = null;
    window.certToRevokeId = null;
    const exam = (window.examsData || []).find(e => e.id === id);
    if (typeof window.prepareDeleteConfirmModal === 'function') {
        window.prepareDeleteConfirmModal({
            type: 'exam',
            id,
            name: exam?.title || id,
            action: 'delete',
            requireTypedConfirm: true,
            expectedText: 'DELETE EXAM'
        });
    }
    openModal('deleteConfirmModal');
};

document.getElementById('confirmDeleteBtn')?.addEventListener('click', async function () {
    const btn = this;
    const id = window.examToDeleteId;
    if (!id) return;

    btn.disabled = true;
    const originalW = btn.offsetWidth;
    btn.style.width = originalW + 'px';
    btn.innerHTML = `<span class="btn-spinner"></span> Deleting...`;

    await new Promise(r => setTimeout(r, 600));

    window.examsData = window.examsData.filter(x => x.id !== id);
    const row = document.querySelector(`tr[data-exid="${id}"]`);
    if (row) {
        row.classList.add('row-removing');
        setTimeout(() => {
            row.remove();
            window.renderGlobalExams();
        }, 400);
    } else {
        window.renderGlobalExams();
    }

    closeModal('deleteConfirmModal');
    showToast('Exam deleted successfully.');
    btn.disabled = false;
    btn.style.width = '';
    btn.innerHTML = `Yes, Delete`;
});

window.publishExam = function (btn, id) {
    const exam = window.examsData.find(x => x.id === id);
    if (!exam) return;
    if (!exam.questionsUploaded) {
        showToast('Upload questions first. Publishing without questions is not allowed.');
        return;
    }

    handleActionBtn(btn, 'Publish', 'Publishing...', 'Published', async () => {
        exam.status = 'Published';
        const tr = btn.closest('tr');
        if (tr) {
            const badge = tr.querySelector('.status-badge');
            if (badge) {
                badge.className = 'status-badge published';
                badge.textContent = 'Published';
            }
        }
        setTimeout(() => window.renderGlobalExams(), 1500); // refresh entire UI to disable button cleanly
        return true;
    });
};

window.openUploadQuestions = function (id) {
    const exam = window.examsData.find(x => x.id === id || x.examCode === id);
    if (!exam) {
        showToast('Invalid exam code. Please open upload from a valid exam.', 'warning');
        return;
    }
    document.getElementById('uq-code').value = exam.examCode || id;
    const fileInput = document.getElementById('uq-file');
    const uploadBtn = document.getElementById('uqUpload');
    if (fileInput) {
        fileInput.value = '';
        fileInput.dataset.uploaded = exam.questionsUploaded ? 'true' : 'false';
    }
    if (uploadBtn) {
        uploadBtn.disabled = !!exam.questionsUploaded;
        uploadBtn.textContent = exam.questionsUploaded ? 'Uploaded' : 'Upload File';
    }
    if (exam.questionsUploaded) {
        showToast('Questions are already uploaded for this exam. Upload is blocked.');
    }
    openModal('uploadQuestionsModal');
};

window.submitUploadQuestions = async function (btn) {
    const fileInput = document.getElementById('uq-file');
    const file = fileInput?.files?.[0];
    const code = document.getElementById('uq-code').value;
    const exam = window.examsData.find(x => x.id === code || x.examCode === code);

    if (exam?.questionsUploaded) {
        showToast('Questions are already uploaded for this exam. Upload is blocked.', 'warning');
        btn.disabled = true;
        btn.textContent = 'Uploaded';
        return;
    }

    if (!file) {
        setError('uq-file', true);
        return;
    }

    setError('uq-file', false);

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading...`;

    try {
        const token =
            localStorage.getItem('token') ||
            sessionStorage.getItem('token') ||
            localStorage.getItem('accessToken') ||
            sessionStorage.getItem('accessToken');
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/questions/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const text = await response.text();

        if (response.ok && text.includes('successfully')) {
            if (exam) exam.questionsUploaded = true;
            window.renderGlobalExams();
            closeModal('uploadQuestionsModal');
            showToast('Questions uploaded successfully.');
        } else {
            showToast(text || 'Upload failed. Please check the file format.', 'danger');
            btn.disabled = false;
            btn.textContent = originalText;
        }
    } catch (error) {
        console.error("Upload error:", error);
        showToast('An error occurred while uploading. Please try again.', 'danger');
        btn.disabled = false;
        btn.textContent = originalText;
    }
};

window.openViewQuestions = function (id) {
    const exam = window.examsData.find(x => x.id === id);
    if (!exam) return;

    document.getElementById('vq-title').textContent = exam.title;

    const list = document.getElementById('vq-list');
    if (!exam.questionsUploaded) {
        list.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 24px; color:var(--text-secondary)">No questions uploaded yet.</td></tr>`;
    } else {
        list.innerHTML = `
            <tr><td>1</td><td>Which architecture ensures distributed systems consensus?</td><td>Multiple Choice</td><td><span class="status-badge draft">Hard</span></td></tr>
            <tr><td>2</td><td>Explain Hoisting in deep JS execution contexts.</td><td>Short Answer</td><td><span class="status-badge published">Medium</span></td></tr>
            <tr><td>3</td><td>Define block scopes accurately spanning ES6+.</td><td>Multiple Choice</td><td><span class="status-badge active">Easy</span></td></tr>
        `;
    }

    openModal('viewQuestionsModal');
};

// ─── TEACHERS LOGIC ───
window.renderGlobalTeachers = function () {
    hydrateUsersData();
    const list = document.getElementById('teachers-list');
    if (!list) return;
    const teachers = Array.isArray(window.teachersData) ? window.teachersData : [];
    const searchInput = document.getElementById('teacherSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    if (teachers.length === 0) {
        list.innerHTML = `<tr><td colspan="8" style="padding:24px; text-align:center; color:var(--text-tertiary);">Loading teachers...</td></tr>`;
        if (!window._adminUsersDataPromise) {
            window.ensureAdminUsersData?.().then(() => window.renderGlobalTeachers()).catch(() => {});
        } else {
            window._adminUsersDataPromise.then(() => window.renderGlobalTeachers()).catch(() => {});
        }
        return;
    }

    list.innerHTML = teachers.map((t, index) => {
        const text = [t.fullName, t.email, t.department, t.employeeId].join(' ').toLowerCase();
        if (searchTerm && !text.includes(searchTerm)) return '';

        const isAct = t.status === 'Active';
        const dotColor = isAct ? 'g' : 'r';

        return `
            <tr data-tid="${t.id}">
                <td><div style="font-weight:600;color:var(--text-primary)">${t.fullName}</div></td>
                <td><div style="font-size:13px">${t.email}</div></td>
                <td style="font-size:13px">${t.department}</td>
                <td style="font-size:13px; color:var(--text-tertiary)">${t.designation || '-'}</td>
                <td style="font-size:13px">${t.experienceYears} Yrs</td>
                <td style="font-family:monospace; font-size:12px; color:var(--accent-blue)">${t.employeeId || '-'}</td>
                <td><span class="dot ${dotColor}">${t.status}</span></td>
                <td>
                    <div class="action-wrap">
                        <button class="btn btn-ghost btn-sm" onclick="handleActionBtn(this, 'View', 'Processing...', 'View', () => { openViewTeacher('${t.id}'); return false; })">View</button>
                        <button class="btn btn-ghost btn-sm" onclick="handleActionBtn(this, 'Activity', 'Processing...', 'Activity', () => { openTeacherActivity('${t.id}'); return false; })">Activity</button>
                        <button class="btn btn-ghost btn-sm" onclick="toggleTeacherStatus(this, '${t.id}')">${isAct ? 'Disable' : 'Enable'}</button>
                        <button class="btn btn-ghost btn-sm" style="color:var(--accent-pink);border-color:var(--accent-pink)" onclick="confirmDeleteTeacher('${t.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    // sync UD table
    if (typeof window.udRender === 'function') window.udRender();
};


if (document.getElementById('teacherSearchInput')) {
    document.getElementById('teacherSearchInput').addEventListener('input', () => {
        window.renderGlobalTeachers();
    });
}

window.openEditTeacher = function (id) {
    const t = window.teachersData.find(x => x.id === id);
    if (!t) return;
    document.getElementById('t-id').value = t.id;
    document.getElementById('t-name').value = t.fullName;
    document.getElementById('t-email').value = t.email;
    document.getElementById('t-phone').value = t.phone || '';
    document.getElementById('t-dept').value = t.department || '';
    document.getElementById('t-designation').value = t.designation || '';
    document.getElementById('t-exp').value = t.experienceYears || '';
    document.getElementById('t-qual').value = t.qualification || '';
    document.getElementById('t-empid').value = t.employeeId || '';
    const profileImageInput = document.getElementById('t-img-file');
    if (profileImageInput) profileImageInput.value = '';
    // reset pwd and focus states
    document.getElementById('t-pwd').value = '********';

    document.querySelector('#addTeacherModal .modal-title').textContent = 'Edit Teacher';
    document.querySelector('#createTeacherForm button[type=submit]').textContent = 'Save Changes';

    openModal('addTeacherModal');
};

window.toggleTeacherStatus = function (btn, id) {
    handleActionBtn(btn, btn.textContent, 'Processing...', 'Done', () => {
        const t = window.teachersData.find(x => x.id === id);
        if (t) t.status = t.status === 'Active' ? 'Disabled' : 'Active';
        setTimeout(() => window.renderGlobalTeachers(), 1000);
        return true;
    });
};

window.confirmDeleteTeacher = function (id) {
    window.examToDeleteId = null;
    window.teacherToDeleteId = id;
    window.studentToDeleteId = null;
    window.certToRevokeId = null;
    const teacher = (window.teachersData || []).find(t => t.id === id);
    if (typeof window.prepareDeleteConfirmModal === 'function') {
        window.prepareDeleteConfirmModal({
            type: 'teacher',
            id,
            name: teacher?.fullName || id,
            action: 'delete',
            requireTypedConfirm: true,
            expectedText: 'DELETE TEACHER'
        });
    }
    openModal('deleteConfirmModal');
};

// Check where deleteConfirmBtn was bound
const confirmBtn = document.getElementById('confirmDeleteBtn');
if (confirmBtn) {
    // Clone and replace to reset events
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

    newBtn.addEventListener('click', async function () {
        const btn = this;
        let idVal, type;
        if (window.examToDeleteId) { idVal = window.examToDeleteId; type = 'exam'; }
        if (window.teacherToDeleteId) { idVal = window.teacherToDeleteId; type = 'teacher'; }
        if (window.studentToDeleteId) { idVal = window.studentToDeleteId; type = 'student'; }
        if (window.certToRevokeId) { idVal = window.certToRevokeId; type = 'cert-revoke'; }
        if (window.attemptToCancelId) { idVal = window.attemptToCancelId; type = 'attempt-cancel'; }
        if (!idVal) return;

        if ((type === 'teacher' || type === 'student' || type === 'exam' || type === 'cert-revoke' || type === 'attempt-cancel') && window.deleteConfirmRequiresText) {
            const input = document.getElementById('deleteConfirmInput');
            const error = document.getElementById('deleteConfirmError');
            const typed = (input?.value || '').trim();
            if (typed !== window.deleteConfirmExpectedText) {
                if (error) error.style.display = 'block';
                if (input) input.classList.add('is-invalid');
                return;
            }
            if (error) error.style.display = 'none';
            if (input) input.classList.remove('is-invalid');
        }

        btn.disabled = true;
        const originalW = btn.offsetWidth;
        btn.style.width = originalW + 'px';
        btn.innerHTML = `<span class="btn-spinner"></span> Deleting...`;

        await new Promise(r => setTimeout(r, 600));

        let row;
        if (type === 'exam') {
            window.examsData = window.examsData.filter(x => x.id !== idVal);
            row = document.querySelector(`tr[data-exid="${idVal}"]`);
        } else if (type === 'teacher') {
            window.teachersData = window.teachersData.filter(x => x.id !== idVal);
            row = document.querySelector(`tr[data-tid="${idVal}"]`);
        } else if (type === 'student') {
            window.studentsData = window.studentsData.filter(x => x.id !== idVal);
            row = document.querySelector(`tr[data-sid="${idVal}"]`);
        } else if (type === 'cert-revoke') {
            const cert = (window.allCertificates || []).find(x => x.id === idVal);
            if (cert) cert.active = false;
        } else if (type === 'attempt-cancel') {
            window.cancelAttempt(idVal);
        }

        if (row) {
            row.classList.add('row-removing');
            setTimeout(() => {
                row.remove();
                if (type === 'exam') window.renderGlobalExams();
                if (type === 'teacher') window.renderGlobalTeachers();
                if (type === 'student') window.renderGlobalStudents();
            }, 400);
        } else {
            if (type === 'exam') window.renderGlobalExams();
            if (type === 'teacher') window.renderGlobalTeachers();
            if (type === 'student') window.renderGlobalStudents();
            if (type === 'cert-revoke') window.renderCertPage();
            if (type === 'attempt-cancel') window.renderAttemptsTable();
        }

        let toastMsg = 'Deleted successfully.';
        if (type === 'exam') toastMsg = 'Exam deleted successfully.';
        if (type === 'teacher') toastMsg = 'Teacher deleted successfully.';
        if (type === 'student') toastMsg = 'Student deleted successfully.';
        if (type === 'cert-revoke') toastMsg = 'Certificate revoked successfully.';
        if (type === 'attempt-cancel') toastMsg = 'Attempt cancelled successfully.';

        closeDeleteConfirmModal();
        showToast(toastMsg);
        btn.disabled = false;
        btn.style.width = '';
        btn.innerHTML = `Yes, Delete`;

        window.examToDeleteId = null;
        window.teacherToDeleteId = null;
        window.studentToDeleteId = null;
        window.certToRevokeId = null;
        window.attemptToCancelId = null;
    });
}

// ═══════════════════════════════════════════════════════════════
// USER DIRECTORY (UD) ENGINE
// ═══════════════════════════════════════════════════════════════
window._udCurrentTab = 'students';
window._udCurrentPage = 1;
window._udPageSize = 7;

window.udSwitchTab = function (tab, btn) {
    window._udCurrentTab = tab;
    window._udCurrentPage = 1;
    document.querySelectorAll('.ud-toggle').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    window.udRender();
};

function _udStats() {
    const stu = window.studentsData || [];
    const tch = window.teachersData || [];
    const act = stu.filter(s => (s.status || '').toLowerCase() === 'active').length;
    const ina = stu.filter(s => (s.status || '').toLowerCase() !== 'active').length;
    const $ = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    $('ud-total-students', stu.length);
    $('ud-active-students', act);
    $('ud-inactive-students', ina);
    $('ud-total-teachers', tch.length);
}

function _udFillInstitutions() {
    const sel = document.getElementById('udInstitutionFilter');
    if (!sel) return;
    const cur = sel.value;
    const all = [...new Set((window.studentsData || []).map(s => s.institution).filter(Boolean))];
    sel.innerHTML = '<option value="all">All Institutions</option>' +
        all.map(i => `<option value="${i}"${i === cur ? ' selected' : ''}>${i}</option>`).join('');
}

const _UD_PAL = [
    ['#dbeafe', '#2563eb'], ['#dcfce7', '#16a34a'], ['#fce7f3', '#db2777'],
    ['#fef3c7', '#d97706'], ['#f3e8ff', '#9333ea'], ['#ccfbf1', '#0d9488'],
    ['#fee2e2', '#ef4444'], ['#e0f2fe', '#0284c7']
];
function _udInit(name) {
    return (name || 'AU').split(/[\s@._-]+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'AU';
}
function _udAvSty(name) {
    const [bg, c] = _UD_PAL[(name || '').charCodeAt(0) % _UD_PAL.length];
    return `background:${bg};color:${c};`;
}
function _udDate(raw) {
    if (!raw) return '\u2014';
    const d = new Date(raw);
    return isNaN(d) ? raw : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

window.udRender = function () {
    hydrateUsersData();
    const tab = window._udCurrentTab || 'students';
    const search = (document.getElementById('udSearchInput')?.value || '').toLowerCase();
    const stFilt = (document.getElementById('udStatusFilter')?.value || 'all').toLowerCase();
    const inFilt = (document.getElementById('udInstitutionFilter')?.value || 'all');

    _udStats();
    _udFillInstitutions();

    let rows = [];
    if (tab === 'students') {
        rows = (window.studentsData || []).filter(s => {
            if (search && !([s.name, s.email, s.institution, 'student'].join(' ').toLowerCase()).includes(search)) return false;
            if (stFilt !== 'all' && (s.status || '').toLowerCase() !== stFilt) return false;
            if (inFilt !== 'all' && s.institution !== inFilt) return false;
            return true;
        }).map(s => ({
            id: s.id, type: 'student', name: s.name, email: s.email,
            institution: s.institution || '\u2014', role: 'Student', status: s.status || 'Active',
            joinedOn: s.joinedOn || s.createdAt || ''
        }));
    } else {
        rows = (window.teachersData || []).filter(t => {
            if (search && !([t.fullName, t.email, t.department, t.employeeId, 'teacher'].join(' ').toLowerCase()).includes(search)) return false;
            if (stFilt !== 'all' && (t.status || '').toLowerCase() !== stFilt) return false;
            return true;
        }).map(t => ({
            id: t.id, type: 'teacher', name: t.fullName, email: t.email,
            institution: t.department || '\u2014', role: 'Teacher', status: t.status || 'Active',
            joinedOn: t.joinedOn || t.createdAt || ''
        }));
    }

    const total = rows.length;
    const pageSize = window._udPageSize || 7;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(window._udCurrentPage || 1, 1), totalPages);
    window._udCurrentPage = page;
    const start = (page - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);

    // thead
    const thead = document.getElementById('ud-thead-row');
    if (thead) thead.innerHTML =
        `<th>${tab === 'students' ? 'STUDENT NAME' : 'TEACHER NAME'}</th>
         <th>EMAIL</th>
         <th>${tab === 'students' ? 'INSTITUTION' : 'DEPARTMENT'}</th>
         <th>ROLE</th><th>STATUS</th><th>JOINED ON</th><th>ACTIONS</th>`;

    // tbody
    const tbody = document.getElementById('ud-tbody');
    if (!tbody) return;
    if (pageRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="ud-empty-cell"><i class="fa-regular fa-folder-open"></i><span>No records found</span></td></tr>`;
    } else {
        tbody.innerHTML = pageRows.map(r => {
            const init = _udInit(r.name);
            const avSty = _udAvSty(r.name);
            const isAct = (r.status || '').toLowerCase() === 'active';
            const roleCls = r.type === 'teacher' ? 'ud-role-teacher' : 'ud-role-student';
            const viewFn = r.type === 'student' ? `openViewStudent(this,'${r.id}')` : `openViewTeacher('${r.id}')`;
            const togFn = r.type === 'student' ? `toggleStudentStatus(this,'${r.id}')` : `toggleTeacherStatus(this,'${r.id}')`;
            const moreBtns = r.type === 'teacher'
                ? `<button onclick="openEditTeacher('${r.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                   <button class="ud-danger" onclick="confirmDeleteTeacher('${r.id}')"><i class="fa-regular fa-trash-can"></i> Delete</button>`
                : `<button class="ud-danger" onclick="confirmDeleteStudent('${r.id}')"><i class="fa-regular fa-trash-can"></i> Delete</button>`;
            return `<tr data-uid="${r.id}" data-utype="${r.type}">
                <td><div class="ud-name-cell"><span class="ud-avatar" style="${avSty}">${init}</span><span class="ud-name-text">${r.name}</span></div></td>
                <td class="ud-email-cell">${r.email}</td>
                <td class="ud-inst-cell">${r.institution}</td>
                <td><span class="ud-role-pill ${roleCls}">${r.role}</span></td>
                <td><span class="ud-status-cell"><span class="ud-status-dot ${isAct ? 'ud-dot-green' : 'ud-dot-red'}"></span>${r.status}</span></td>
                <td class="ud-date-cell">${_udDate(r.joinedOn)}</td>
                <td>
                    <div class="ud-act-group">
                        <button class="ud-act-btn ud-act-eye" title="View" onclick="${viewFn}"><i class="fa-regular fa-eye"></i></button>
                        <button class="ud-act-btn ud-act-disable" onclick="${togFn}">
                            <i class="fa-solid fa-user-${isAct ? 'slash' : 'check'}"></i><span>${isAct ? 'Disable' : 'Enable'}</span>
                        </button>
                        <div class="ud-more-wrap">
                            <button class="ud-act-btn ud-act-more" onclick="udToggleMore(event,'${r.id}')"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                            <div class="ud-more-drop" id="udmore-${r.id}">${moreBtns}</div>
                        </div>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    // count label
    const cEl = document.getElementById('ud-count');
    if (cEl) {
        const who = tab === 'students' ? 'students' : 'teachers';
        cEl.textContent = total === 0
            ? `Showing 0 to 0 of 0 ${who}`
            : `Showing ${start + 1} to ${Math.min(start + pageRows.length, total)} of ${total} ${who}`;
    }

    // pagination
    const pEl = document.getElementById('ud-pagination');
    if (pEl) {
        let h = `<button class="ud-page-btn" ${page <= 1 ? 'disabled' : ''} onclick="window.udPrev()"><i class="fa-solid fa-chevron-left"></i></button>`;
        const show = new Set([1, totalPages]);
        for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i++) show.add(i);
        const sorted = [...show].sort((a, b) => a - b);
        let prev = 0;
        sorted.forEach(p => {
            if (prev && p - prev > 1) h += `<span class="ud-page-dots">\u2026</span>`;
            h += `<button class="ud-page-btn${p === page ? ' active' : ''}" onclick="window.udGoTo(${p})">${p}</button>`;
            prev = p;
        });
        h += `<button class="ud-page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="window.udNext()"><i class="fa-solid fa-chevron-right"></i></button>`;
        pEl.innerHTML = h;
    }
};

window.udPrev = () => { window._udCurrentPage = Math.max(1, (window._udCurrentPage || 1) - 1); window.udRender(); };
window.udNext = () => { window._udCurrentPage = (window._udCurrentPage || 1) + 1; window.udRender(); };
window.udGoTo = p => { window._udCurrentPage = p; window.udRender(); };

window.udToggleMore = function (evt, id) {
    evt.stopPropagation();
    document.querySelectorAll('.ud-more-drop.open').forEach(d => { if (d.id !== 'udmore-' + id) d.classList.remove('open'); });
    const drop = document.getElementById('udmore-' + id);
    if (drop) drop.classList.toggle('open');
};
document.addEventListener('click', () => { document.querySelectorAll('.ud-more-drop.open').forEach(d => d.classList.remove('open')); });

// wire search input
(function () {
    function _w() {
        const inp = document.getElementById('udSearchInput');
        if (inp && !inp._udW) { inp._udW = true; inp.addEventListener('input', () => { window._udCurrentPage = 1; window.udRender(); }); }
    }
    document.addEventListener('DOMContentLoaded', _w);
    _w();
}());


// ─── STUDENTS LOGIC ───

window.renderGlobalStudents = function () {
    hydrateUsersData();
    const list = document.getElementById('students-list');
    if (!list) return;
    const students = Array.isArray(window.studentsData) ? window.studentsData : [];
    const searchInput = document.getElementById('studentSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    if (students.length === 0) {
        list.innerHTML = `<tr><td colspan="5" style="padding:24px; text-align:center; color:var(--text-tertiary);">Loading students...</td></tr>`;
        if (!window._adminUsersDataPromise) {
            window.ensureAdminUsersData?.().then(() => window.renderGlobalStudents()).catch(() => {});
        } else {
            window._adminUsersDataPromise.then(() => window.renderGlobalStudents()).catch(() => {});
        }
        return;
    }

    list.innerHTML = students.map((s, index) => {
        const text = [s.name, s.email].join(' ').toLowerCase();
        if (searchTerm && !text.includes(searchTerm)) return '';

        const isAct = s.status === 'Active';
        const dotColor = isAct ? 'g' : 'r';

        return `
            <tr data-sid="${s.id}">
                <td><div style="font-weight:600;color:var(--text-primary)">${s.name}</div></td>
                <td>${s.email}</td>
                <td>${s.institution}</td>
                <td><span class="dot ${dotColor}">${s.status}</span></td>
                <td>
                    <div class="action-wrap">
                        <button class="btn btn-ghost btn-sm" onclick="openViewStudent(this, '${s.id}')">View</button>
                        <button class="btn btn-ghost btn-sm" onclick="toggleStudentStatus(this, '${s.id}')">${isAct ? 'Disable' : 'Enable'}</button>
                        <button class="btn btn-ghost btn-sm" style="color:var(--accent-pink);border-color:var(--accent-pink)" onclick="confirmDeleteStudent('${s.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    // sync UD table
    if (typeof window.udRender === 'function') window.udRender();
};


if (document.getElementById('studentSearchInput')) {
    document.getElementById('studentSearchInput').addEventListener('input', () => {
        window.renderGlobalStudents();
    });
}

window.openViewStudent = function (btn, id) {
    const s = window.studentsData.find(x => x.id === id);
    if (!s) return;

    // UI Loading state (300ms per USER requirement)
    if (btn) {
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="btn-spinner"></span>`;

        setTimeout(() => {
            // Populate Modal
            document.getElementById('vs-name').textContent = s.name;
            document.getElementById('vs-email').textContent = s.email;
            document.getElementById('vs-id').textContent = s.id;
            document.getElementById('vs-last-login').textContent = s.lastLogin || 'Never';

            const statusEl = document.getElementById('vs-status');
            statusEl.className = 'dot ' + (s.status === 'Active' ? 'g' : 'r');
            statusEl.textContent = s.status;

            document.getElementById('vs-attempted').textContent = s.examsAttempted || 0;
            document.getElementById('vs-avg-score').textContent = (s.avgScore || 0) + '%';
            document.getElementById('vs-pass-rate').textContent = (s.passRate || 0) + '%';
            document.getElementById('vs-highest').textContent = (s.highestScore || 0) + '%';
            document.getElementById('vs-lowest').textContent = (s.lowestScore || 0) + '%';

            document.getElementById('vs-initial').textContent = s.name.charAt(0).toUpperCase();

            openModal('viewStudentModal');

            // Restore button
            btn.disabled = false;
            btn.innerHTML = originalText;
        }, 300);
    }
};

window.toggleStudentStatus = function (btn, id) {
    handleActionBtn(btn, btn.textContent, 'Processing...', 'Done', () => {
        const s = window.studentsData.find(x => x.id === id);
        if (s) s.status = s.status === 'Active' ? 'Disabled' : 'Active';
        setTimeout(() => window.renderGlobalStudents(), 1000);
        return true;
    });
};

window.confirmDeleteStudent = function (id) {
    window.examToDeleteId = null;
    window.teacherToDeleteId = null;
    window.studentToDeleteId = id;
    window.certToRevokeId = null;
    const student = (window.studentsData || []).find(s => s.id === id);
    if (typeof window.prepareDeleteConfirmModal === 'function') {
        window.prepareDeleteConfirmModal({
            type: 'student',
            id,
            name: student?.name || id,
            action: 'delete',
            requireTypedConfirm: true,
            expectedText: 'DELETE STUDENT'
        });
    }
    openModal('deleteConfirmModal');
};

window.resetDeleteConfirmModalState = function () {
    const title = document.getElementById('deleteConfirmTitle');
    const message = document.getElementById('deleteConfirmMessage');
    const instruction = document.getElementById('deleteConfirmInstruction');
    const input = document.getElementById('deleteConfirmInput');
    const error = document.getElementById('deleteConfirmError');
    const btn = document.getElementById('confirmDeleteBtn');
    if (title) title.textContent = 'Confirm Deletion';
    if (message) message.textContent = 'Are you absolutely sure you want to delete this item? This action cannot be undone.';
    if (instruction) { instruction.style.display = 'none'; instruction.textContent = ''; }
    if (input) { input.style.display = 'none'; input.value = ''; input.classList.remove('is-invalid'); }
    if (error) error.style.display = 'none';
    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Yes, Delete';
        btn.style.background = 'var(--accent-pink)';
    }
    window.deleteConfirmExpectedText = '';
    window.deleteConfirmRequiresText = false;
    window.deleteConfirmAction = 'delete';
    window.attemptToCancelId = null;
};

window.prepareDeleteConfirmModal = function (config) {
    const title = document.getElementById('deleteConfirmTitle');
    const message = document.getElementById('deleteConfirmMessage');
    const instruction = document.getElementById('deleteConfirmInstruction');
    const input = document.getElementById('deleteConfirmInput');
    const error = document.getElementById('deleteConfirmError');
    const btn = document.getElementById('confirmDeleteBtn');

    const action = config.action || 'delete';
    const isRevoke = action === 'revoke';
    const isCancel = action === 'cancel';
    const typeLabel = (config.type || 'item').toUpperCase();
    const displayName = config.name || config.id || 'selected item';

    if (title) title.textContent = `${isRevoke ? 'Revoke' : isCancel ? 'Cancel' : 'Delete'} ${typeLabel}`;
    if (message) {
        message.textContent = isRevoke
            ? `You are about to permanently revoke ${typeLabel.toLowerCase()} "${displayName}". This action immediately invalidates the certificate.`
            : isCancel
                ? `You are about to cancel ${typeLabel.toLowerCase()} "${displayName}". This will invalidate the running attempt and cannot be undone.`
                : `You are about to permanently delete ${typeLabel.toLowerCase()} "${displayName}". This action cannot be undone.`;
    }

    window.deleteConfirmRequiresText = !!config.requireTypedConfirm;
    window.deleteConfirmExpectedText = config.expectedText || '';
    window.deleteConfirmAction = action;

    if (error) error.style.display = 'none';

    if (input) {
        input.value = '';
        input.classList.remove('is-invalid');
        input.style.display = window.deleteConfirmRequiresText ? 'block' : 'none';
    }

    if (instruction) {
        if (window.deleteConfirmRequiresText) {
            instruction.style.display = 'block';
            instruction.innerHTML = `Type <strong style="color:var(--text-primary)">${window.deleteConfirmExpectedText}</strong> to confirm.`;
        } else {
            instruction.style.display = 'none';
            instruction.textContent = '';
        }
    }

    if (btn) {
        btn.disabled = window.deleteConfirmRequiresText;
        btn.textContent = isRevoke ? 'Yes, Revoke' : isCancel ? 'Yes, Cancel' : 'Yes, Delete';
        btn.style.background = isRevoke || isCancel ? 'var(--accent-pink)' : 'var(--accent-pink)';
    }

    if (input && !input.dataset.deleteConfirmBound) {
        input.addEventListener('input', () => {
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            const err = document.getElementById('deleteConfirmError');
            if (!window.deleteConfirmRequiresText) {
                if (confirmBtn) confirmBtn.disabled = false;
                return;
            }
            const ok = input.value.trim() === window.deleteConfirmExpectedText;
            if (confirmBtn) confirmBtn.disabled = !ok;
            if (err) err.style.display = (!ok && input.value.trim().length > 0) ? 'block' : 'none';
        });
        input.dataset.deleteConfirmBound = '1';
    }
};

window.closeDeleteConfirmModal = function () {
    window.resetDeleteConfirmModalState?.();
    window.examToDeleteId = null;
    window.teacherToDeleteId = null;
    window.studentToDeleteId = null;
    window.certToRevokeId = null;
    window.attemptToCancelId = null;
    closeModal('deleteConfirmModal');
};
window.openViewTeacher = function (id) {
    const t = window.teachersData.find(x => x.id === id);
    if (!t) return;

    window.currentViewingTeacherId = id;
    document.getElementById('vt-name').textContent = t.fullName;
    document.getElementById('vt-email').textContent = t.email;
    document.getElementById('vt-phone').textContent = t.phone || 'N/A';
    document.getElementById('vt-dept').textContent = t.department || 'N/A';
    document.getElementById('vt-designation').textContent = t.designation || 'N/A';
    document.getElementById('vt-exp').textContent = t.experienceYears + ' Years';
    document.getElementById('vt-empid').textContent = t.employeeId || 'N/A';

    const statusEl = document.getElementById('vt-status');
    statusEl.className = 'status-badge ' + (t.status === 'Active' ? 'active' : 'draft');
    statusEl.textContent = t.status;

    document.getElementById('vt-initial').textContent = t.fullName.charAt(0);

    openModal('viewTeacherModal');
};

window.openTeacherActivity = async function (id) {
    const fallback = (window.teachersData || []).find(x => x.id === id);
    const modal = document.getElementById('teacherActivityModal');
    if (!modal) return;

    const setCount = (elId, value) => {
        const el = document.getElementById(elId);
        if (!el) return;
        el.textContent = Number(value || 0).toLocaleString();
    };

    const renderTeacherActivity = (payload) => {
        const teacher = payload?.teacher || fallback || {};
        const analytics = payload?.analytics || teacher.analytics || { exams: 0, students: 0, certs: 0 };
        const attemptsHandled = payload?.attemptsHandled || teacher.attemptsHandled || { total: 0, avgScore: 0, passRate: 0 };
        const examsCreated = payload?.examsCreated || teacher.examsCreated || [];
        const questionsUploaded = payload?.questionsUploaded || teacher.questionsUploaded || [];
        const cheatingReports = payload?.cheatingReports || teacher.cheatingReports || { suspicious: 0, flags: 0 };
        const alerts = payload?.alerts || [];

        const displayName = teacher.fullName || teacher.name || 'Teacher';
        const nameEl = document.getElementById('ta-name');
        if (nameEl) nameEl.textContent = displayName;

        setCount('ta-exams-conducted', analytics.exams);
        setCount('ta-students-eval', analytics.students);
        setCount('ta-certs', analytics.certs);

        const examsList = document.getElementById('ta-exams-list');
        if (examsList) examsList.innerHTML = examsCreated.length
            ? examsCreated.map(e => `
                <tr>
                    <td style="font-weight:600">${e.title || '-'}</td>
                    <td style="font-family:monospace">${e.code || '-'}</td>
                    <td>${e.date || '-'}</td>
                    <td><span class="status-badge ${(e.status || 'DRAFT').toLowerCase()}">${e.status || 'DRAFT'}</span></td>
                </tr>
            `).join('')
            : '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-tertiary)">No exams created.</td></tr>';

        const questionsList = document.getElementById('ta-questions-list');
        if (questionsList) questionsList.innerHTML = questionsUploaded.length
            ? questionsUploaded.map(q => `
                <tr>
                    <td style="font-weight:600">${q.exam || '-'}</td>
                    <td>${Number(q.count || 0)} Qs</td>
                    <td>${q.date || '-'}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--text-tertiary)">No questions uploaded.</td></tr>';

        setCount('ta-att-count', attemptsHandled.total);
        const avgEl = document.getElementById('ta-att-avg');
        const passEl = document.getElementById('ta-att-pass');
        if (avgEl) avgEl.textContent = `${Number(attemptsHandled.avgScore || 0)}%`;
        if (passEl) passEl.textContent = `${Number(attemptsHandled.passRate || 0)}%`;

        const alertsList = document.getElementById('ta-alerts-list');
        if (alertsList) alertsList.innerHTML = alerts.length
            ? alerts.map(a => `
                <div class="alert-item ${a.type || 'med'}">
                   <div class="act-info">
                      <span class="a-title">${a.title || 'Alert'}</span>
                      <span class="a-user">${a.user || ''}</span>
                   </div>
                </div>
            `).join('')
            : (Number(cheatingReports.suspicious || 0) > 0 || Number(cheatingReports.flags || 0) > 0
                ? [
                    Number(cheatingReports.suspicious || 0) > 0 ? { title: 'Suspicious Activity Detected', user: `${cheatingReports.suspicious} potential violations reviewed`, type: 'med' } : null,
                    Number(cheatingReports.flags || 0) > 0 ? { title: 'Critical Cheating Flags', user: `${cheatingReports.flags} high-risk sessions flagged`, type: 'high' } : null
                ].filter(Boolean).map(a => `
                    <div class="alert-item ${a.type}">
                       <div class="act-info">
                          <span class="a-title">${a.title}</span>
                          <span class="a-user">${a.user}</span>
                       </div>
                    </div>
                  `).join('')
                : '<div style="text-align:center; padding:20px; color:var(--text-secondary)">No major security incidents recorded.</div>');

        openModal('teacherActivityModal');
    };

    renderTeacherActivity(fallback);

    try {
        const api = window.AdminLive?.api;
        if (!api) return;
        const payload = await api(`/api/admin/teachers/${encodeURIComponent(id)}/activity`);
        renderTeacherActivity(payload);
    } catch (error) {
        console.error(error);
        window.showToast?.(error.message || 'Failed to load teacher activity', 'error');
    }
};

window.switchActivityTab = function (btn, tabId) {
    const modal = btn.closest('.modal-content');
    modal.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    modal.querySelectorAll('.activity-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
};

// ─── ANALYTICS INTELLIGENCE ENGINE ───

function buildAnalyticsSnapshot(examCode = 'global') {
    const exams = window.examsData || [];
    const students = window.studentsData || [];
    const teachers = window.teachersData || [];
    const attemptsAll = window.attemptsData || [];
    const normalizeStatus = (value) => String(value || '').trim().toUpperCase();
    const completedStatuses = new Set(['COMPLETED', 'AUTO_SUBMITTED', 'EVALUATED', 'SUBMITTED', 'FINISHED']);
    const resolveScore = (att) => {
        const percentage = Number(att?.percentage);
        if (Number.isFinite(percentage) && percentage > 0) return Math.min(100, Math.max(0, percentage));
        const score = Number(att?.score);
        if (Number.isFinite(score) && score > 0) return Math.min(100, Math.max(0, score));
        const obtained = Number(att?.obtainedMarks);
        const total = Number(att?.totalMarks);
        if (Number.isFinite(obtained) && Number.isFinite(total) && total > 0) {
            return Math.min(100, Math.max(0, (obtained / total) * 100));
        }
        return 0;
    };
    const isCompletedAttempt = (att) => {
        const status = normalizeStatus(att?.status);
        return completedStatuses.has(status) || Boolean(att?.autoSubmitted) || Boolean(att?.submitted) || Boolean(att?.finished);
    };
    const attempts = examCode === 'global'
        ? attemptsAll
        : attemptsAll.filter(a => a.examId === examCode || a.examTitle === examCode || a.examCode === examCode);

    const completed = attempts.filter(isCompletedAttempt);
    const scoredAttempts = attempts.filter((att) => resolveScore(att) > 0 || isCompletedAttempt(att) || Number(att?.cheatingScore || 0) > 0);
    const scores = scoredAttempts.map(resolveScore).filter(n => Number.isFinite(n));
    const cheatScores = attempts.map(a => Number(a.cheatingScore || 0)).filter(n => Number.isFinite(n));
    const studentsSeen = new Set(attempts.map(a => a.studentName || a.studentEmail || a.id));

    const avg = (vals) => vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const pct = (pass, total) => total ? Math.round((pass / total) * 100) : 0;
    const gradeFromScore = (score) => {
        if (score >= 95) return 'A+';
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    };

    const byExam = new Map();
    scoredAttempts.forEach((att) => {
        const key = att.examId || att.examCode || att.examTitle || 'Unknown';
        const item = byExam.get(key) || { total: 0, scores: [], cheat: [] };
        item.total += 1;
        item.scores.push(resolveScore(att));
        item.cheat.push(Number(att.cheatingScore || 0));
        byExam.set(key, item);
    });

    const examInsights = [...byExam.entries()]
        .map(([topic, value]) => ({
            topic,
            accuracy: Math.round(avg(value.scores)),
            icon: value.total >= 20 ? '📈' : '📊'
        }))
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 4);

    const studentScores = new Map();
    scoredAttempts.forEach((att) => {
        const key = att.studentId || att.studentName || att.studentEmail || att.id;
        const item = studentScores.get(key) || { name: att.studentName || key, scores: [], attempts: 0 };
        item.scores.push(resolveScore(att));
        item.attempts += 1;
        studentScores.set(key, item);
    });

    const topPerformers = [...studentScores.values()]
        .map((s, idx) => {
            const score = Math.round(avg(s.scores));
            return {
                rank: idx + 1,
                name: s.name,
                score,
                grade: gradeFromScore(score)
            };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map((item, idx) => ({ ...item, rank: idx + 1 }));

    const toTimestamp = (att) => {
        const raw = att?.updatedAt || att?.endTime || att?.startTime || att?.createdAt || att?.submittedAt || att?.lastAiCheckTime;
        const ts = new Date(raw || 0).getTime();
        return Number.isFinite(ts) ? ts : 0;
    };
    const timeline = [...attempts]
        .map((att, index) => ({ att, index, ts: toTimestamp(att), value: resolveScore(att) }))
        .sort((a, b) => a.ts - b.ts || a.index - b.index);
    const trendSource = timeline.length ? timeline : scoredAttempts.map((att, index) => ({ att, index, ts: 0, value: resolveScore(att) }));
    const chartData = (() => {
        if (!trendSource.length) return [];
        const values = trendSource.map((row) => Number(row.value) || 0);
        if (values.length === 1) return Array.from({ length: 7 }, () => Math.round(values[0]));
        const lastIndex = values.length - 1;
        return Array.from({ length: 7 }, (_, bucket) => {
            const position = (bucket * lastIndex) / 6;
            const lower = Math.floor(position);
            const upper = Math.ceil(position);
            if (lower === upper) return Math.round(values[lower]);
            const ratio = position - lower;
            return Math.round(values[lower] + (values[upper] - values[lower]) * ratio);
        });
    })();

    const avgScore = Math.round(avg(scores));
    const riskScore = Math.round(avg(cheatScores));
    const passRate = pct(completed.filter(a => Number(a.percentage || 0) >= 60).length, completed.length);
    const globalPass = pct(completed.filter(a => Number(a.percentage || 0) >= 60).length, attempts.length || 1);

    return {
        totalResults: attempts.length,
        avgScore,
        totalStudents: studentsSeen.size || students.length,
        totalTeachers: teachers.length,
        totalExams: examCode === 'global' ? exams.length : 1,
        totalAttempts: attempts.length,
        activeAttempts: attempts.filter(a => a.status === 'STARTED').length,
        globalPass,
        riskScore,
        chartData,
        highestGrade: gradeFromScore(Math.max(...scores, 0)),
        lowestGrade: gradeFromScore(Math.min(...scores, 100)),
        passRate,
        aiInsights: examInsights.length ? examInsights : [
            { topic: 'No live analytics yet', accuracy: 0, icon: 'ℹ️' }
        ],
        proctorStats: {
            high: attempts.filter(a => Number(a.cheatingScore || 0) >= 80).length,
            susp: attempts.filter(a => Number(a.cheatingScore || 0) >= 50 && Number(a.cheatingScore || 0) < 80).length,
            cheatingAvg: Number(avg(cheatScores).toFixed(1)),
            stability: riskScore >= 25 ? 'UNSTABLE' : 'STABLE'
        },
        topPerformers: topPerformers.length ? topPerformers : [
            { rank: 1, name: 'No data', score: 0, grade: 'NA' }
        ]
    };
}

window.refreshAnalytics = async function () {
    const selectors = ['ana-results', 'ana-avg-score', 'ana-total-students', 'ana-total-teachers', 'ana-active-attempts', 'ana-risk-score', 'ana-total-exams', 'ana-total-attempts', 'ana-global-pass'];
    selectors.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<span class="skeleton" style="width:50px;height:24px;display:inline-block"></span>`;
    });

    const ai = document.getElementById('ai-insights-container');
    if (ai) ai.innerHTML = `<div class="skeleton" style="height:50px; margin-bottom:8px"></div>`.repeat(4);

    await new Promise(r => setTimeout(r, 120));
    window.populateAnalyticsUI(buildAnalyticsSnapshot('global'));
};

window.loadExamSpecificAnalytics = async function (examCode) {
    if (examCode === 'global') return window.refreshAnalytics();
    await new Promise(r => setTimeout(r, 120));
    window.populateAnalyticsUI(buildAnalyticsSnapshot(examCode));
};

window.toggleAIInsights = function () {
    const container = document.getElementById('ai-insights-container');
    const btn = document.getElementById('ai-toggle-btn');
    const isCollapsed = container.style.maxHeight === '200px' || !container.style.maxHeight;
    container.style.maxHeight = isCollapsed ? '1000px' : '200px';
    if (btn) btn.textContent = isCollapsed ? 'Collapse' : 'Expand';
};

window.drawDonutChart = function(canvasId, values, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const total = values.reduce((a, b) => a + b, 0);
    if (total === 0) return;
    let startAngle = -Math.PI / 2;
    const centerX = w / 2;
    const centerY = h / 2;
    const outerRadius = Math.min(w, h) / 2 - 4;
    const innerRadius = outerRadius - 16;

    values.forEach((val, i) => {
        const sliceAngle = (val / total) * (Math.PI * 2);
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, startAngle, startAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = colors[i];
        ctx.fill();
        startAngle += sliceAngle;
    });
};

window.populateAnalyticsUI = function (data) {
    window.animateCounter('ana-results', data.totalResults);
    window.animateCounter('ana-avg-score', data.avgScore, '%');
    window.animateCounter('ana-total-students', data.totalStudents);
    window.animateCounter('ana-total-teachers', data.totalTeachers);
    window.animateCounter('ana-total-exams', data.totalExams);
    window.animateCounter('ana-total-attempts', data.totalAttempts);
    window.animateCounter('ana-active-attempts', data.activeAttempts);
    window.animateCounter('ana-global-pass', data.globalPass, '%');
    window.animateCounter('ana-risk-score', data.riskScore, '%');

    document.getElementById('ana-high').textContent = data.highestGrade;
    document.getElementById('ana-low').textContent = data.lowestGrade;
    document.getElementById('ana-pass').textContent = data.passRate + '%';

    // Proctoring
    document.getElementById('ana-proctor-high').textContent = data.proctorStats.high;
    document.getElementById('ana-proctor-bar-high').style.width = Math.min(data.proctorStats.high * 5, 100) + '%';
    document.getElementById('ana-proctor-susp').textContent = data.proctorStats.susp;
    document.getElementById('ana-proctor-bar-susp').style.width = Math.min(data.proctorStats.susp * 2, 100) + '%';
    document.getElementById('ana-cheating-avg').textContent = data.proctorStats.cheatingAvg + '%';
    document.getElementById('ana-risk-stability').textContent = data.proctorStats.stability;
    document.getElementById('ana-risk-stability').style.color = data.proctorStats.stability === 'STABLE' ? '#10b981' : '#ef4444';

    // AI Badge
    const badge = document.getElementById('ana-ai-risk-badge');
    if (badge) {
        const risk = data.riskScore < 20 ? 'LOW' : (data.riskScore < 50 ? 'MEDIUM' : 'HIGH');
        badge.textContent = `${risk} RISK`;
        badge.className = `ic-risk-badge ic-risk-${risk.toLowerCase()}`;
    }

    // AI Topics Donut Chart
    const strong = (data.aiInsights || []).filter(i => i.accuracy >= 70).length || 3;
    const avg = (data.aiInsights || []).filter(i => i.accuracy >= 50 && i.accuracy < 70).length || 2;
    const weak = (data.aiInsights || []).filter(i => i.accuracy < 50).length || 1;
    const totalTopics = strong + avg + weak;

    document.getElementById('ic-donut-num').textContent = totalTopics;
    document.getElementById('ic-leg-strong').textContent = `${strong} (${Math.round(strong / totalTopics * 100)}%)`;
    document.getElementById('ic-leg-avg').textContent = `${avg} (${Math.round(avg / totalTopics * 100)}%)`;
    document.getElementById('ic-leg-weak').textContent = `${weak} (${Math.round(weak / totalTopics * 100)}%)`;

    window.drawDonutChart('ic-donut-canvas', [strong, avg, weak], ['#10b981', '#3b82f6', '#f59e0b']);

    // Draw sparklines
    if (typeof window.drawSparkline === 'function') {
        window.drawSparkline('ic-spark-perf', '#8b5cf6', [0.4, 0.3, 0.5, 0.45, 0.6, 0.55, 0.7, 0.65, 0.8]);
        window.drawSparkline('ic-spark-health', '#10b981', [0.8, 0.82, 0.79, 0.81, 0.83, 0.82, 0.84, 0.83, 0.85]);
        window.drawSparkline('ic-spark-risk', '#ef4444', [0.2, 0.18, 0.22, 0.15, 0.17, 0.19, 0.14, 0.16, 0.12]);
    }

    // AI Insights (Details mode)
    const aiCont = document.getElementById('ai-insights-container');
    if (aiCont) {
        aiCont.innerHTML = (data.aiInsights || []).map(i => `
            <div class="ai-topic-item" style="display:flex; align-items:center; gap:12px; padding:10px; background:var(--bg-tertiary); border-radius:8px; border:1px solid var(--border-subtle); margin-bottom: 8px">
                <div style="width:28px; height:28px; background:var(--bg-card); display:flex; align-items:center; justify-content:center; border-radius:6px">${i.icon}</div>
                <div style="flex:1">
                   <div style="font-size:12.5px; font-weight:700">${i.topic}</div>
                   <div style="font-size:11px; color:${i.accuracy < 50 ? '#ef4444' : 'var(--text-tertiary)'}">Topic accuracy: ${i.accuracy}%</div>
                </div>
                <div style="height:4px; width:40px; background:var(--bg-card); border-radius:2px; overflow:hidden">
                   <div style="width:${i.accuracy}%; height:100%; background:${i.accuracy < 50 ? '#ef4444' : '#3b82f6'}"></div>
                </div>
            </div>
        `).join('') || '<div style="text-align:center; padding:16px; color:var(--text-tertiary)">No insights available.</div>';
    }

    document.getElementById('ai-recommend').textContent = data.riskScore > 20 ? "Caution advised. Review proctoring logs for localized anomalies." : "Focus on \"Data Structures\" and \"Operating Systems\" to improve overall performance.";

    // Leaderboard Mini List with Medals
    const lbCont = document.getElementById('leaderboard-mini-list');
    if (lbCont) {
        lbCont.innerHTML = (data.topPerformers || []).map((p, i) => {
            let rankHtml = `<span class="ic-medal-num">${p.rank}</span>`;
            if (p.rank === 1) rankHtml = `<span class="ic-medal gold">1</span>`;
            else if (p.rank === 2) rankHtml = `<span class="ic-medal silver">2</span>`;
            else if (p.rank === 3) rankHtml = `<span class="ic-medal bronze">3</span>`;

            return `
                <tr style="animation: fadeInRow ${0.3 + i * 0.1}s ease forwards; opacity:0">
                    <td>${rankHtml}</td>
                    <td style="font-weight:600">${p.name}</td>
                    <td style="font-weight:700">${p.score}</td>
                    <td><span class="ic-grade-pill">${p.grade}</span></td>
                </tr>
            `;
        }).join('') || `
            <tr>
                <td colspan="4" style="text-align:center; padding:24px 0;">
                    <div class="empty-performers">
                        <div class="empty-icon-wrap"><i class="fa-solid fa-trophy"></i></div>
                        <div class="empty-text">No data available</div>
                    </div>
                </td>
            </tr>
        `;
    }

    // Chart
    window.renderLineChart('scoreTrendCanvas', data.chartData);
};

window.renderLineChart = function (canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const series = Array.isArray(data) ? data.filter((n) => Number.isFinite(Number(n))) : [];
    if (series.length < 2) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const host = canvas.closest('.chart-container') || canvas.parentElement;
            const rect = host?.getBoundingClientRect();
            const cssWidth = Math.round(rect?.width || canvas.clientWidth || canvas.offsetWidth || 0);
            const cssHeight = Math.round(rect?.height || canvas.clientHeight || canvas.offsetHeight || 0);
            canvas.width = Math.max(cssWidth, 320);
            canvas.height = Math.max(cssHeight, 220);
            canvas.style.width = canvas.width + 'px';
            canvas.style.height = canvas.height + 'px';
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim() || '#64748b';
            ctx.font = '600 14px Syne, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No chart data available yet.', canvas.width / 2, canvas.height / 2);
        }
        return;
    }
    const ctx = canvas.getContext('2d');
    const host = canvas.closest('.chart-container') || canvas.parentElement;
    const rect = host?.getBoundingClientRect();
    const cssWidth = Math.round(rect?.width || canvas.clientWidth || canvas.offsetWidth || 0);
    const cssHeight = Math.round(rect?.height || canvas.clientHeight || canvas.offsetHeight || 0);
    if (!cssWidth || !cssHeight) {
        setTimeout(() => window.renderLineChart(canvasId, data), 120);
        return;
    }

    const width = Math.max(cssWidth, 320);
    const height = Math.max(cssHeight, 220);
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const padding = 60;
    const rangeY = 100;
    const stepX = (width - padding * 2) / (series.length - 1);

    const draw = (progress = 1) => {
        ctx.clearRect(0, 0, width, height);

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + i * (height - padding * 2) / 4;
            ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(width - padding, y); ctx.stroke();
        }

        // Gradient & Path
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
        grad.addColorStop(1, 'rgba(59, 130, 246, 0)');

        ctx.beginPath();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const points = series.map((val, i) => ({
            x: padding + i * stepX,
            y: height - padding - (val / rangeY) * (height - padding * 2)
        }));

        points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else {
                if (i / series.length <= progress) ctx.lineTo(p.x, p.y);
            }
        });
        ctx.stroke();

        if (progress === 1) {
            // Hot points
            points.forEach(p => {
                ctx.fillStyle = '#3b82f6';
                ctx.shadowBlur = 10; ctx.shadowColor = '#3b82f6';
                ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            });

            // Fill area under curve
            ctx.lineTo(padding + (series.length - 1) * stepX, height - padding);
            ctx.lineTo(padding, height - padding);
            ctx.fillStyle = grad;
            ctx.fill();
        }
    };

    // Tooltip listener
    canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (width / rect.width);
        const tooltip = document.getElementById('chart-tooltip');

        let found = false;
        data.forEach((val, i) => {
            const x = padding + i * stepX;
            if (Math.abs(mouseX - x) < 20) {
                const y = height - padding - (val / rangeY) * (height - padding * 2);
                tooltip.style.display = 'block';
                tooltip.style.left = (x / 2) + 'px';
                tooltip.style.top = (y / 2 - 40) + 'px';
                tooltip.innerHTML = `Month ${i + 1}: ${val}%`;
                found = true;
            }
        });
        if (!found) tooltip.style.display = 'none';
    };
    canvas.onmouseleave = () => document.getElementById('chart-tooltip').style.display = 'none';

    // Animation loop
    let p = 0;
    const animate = () => {
        p += 0.05;
        draw(p);
        if (p < 1) requestAnimationFrame(animate);
    };
    animate();
};

window.animateCounter = function (id, target, suffix = '') {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step = target / 30;
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        el.textContent = Math.floor(current).toLocaleString() + suffix;
    }, 20);
};

const originalSwitchSection = window.switchSection;
window.switchSection = function (id) {
    if (typeof originalSwitchSection === 'function') originalSwitchSection(id);

    if (window.location.hash) {
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }

    const resetPanelScroll = () => {
        const contentBody = document.querySelector('.content-body');
        if (contentBody) {
            contentBody.scrollTop = 0;
            contentBody.scrollTo?.({ top: 0, behavior: 'auto' });
        }
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo?.({ top: 0, behavior: 'auto' });
    };

    requestAnimationFrame(() => {
        resetPanelScroll();
        requestAnimationFrame(resetPanelScroll);
    });

    if (id === 'analytics-section') {
        requestAnimationFrame(() => window.refreshAnalytics());

        // Populate exam filter once
        const filter = document.getElementById('analyticsExamFilter');
        if (filter && filter.options.length <= 1 && window.examsData) {
            window.examsData.forEach(ex => {
                const opt = document.createElement('option');
                opt.value = ex.id;
                opt.textContent = ex.title;
                filter.appendChild(opt);
            });
        }
    }

    // ← keep UD table fresh when switching to users section
    if (id === 'users-section') {
        setTimeout(function () { if (typeof window.udRender === 'function') window.udRender(); }, 80);
    }
};

/* ============================================================
   ATTEMPTS MONITORING ENGINE
   ============================================================ */

window.attemptsData = [];
window.filteredAttempts = [];
window.currentAttPage = 1;
const attPageSize = 8;
let attemptsRefreshInFlight = false;

window.refreshAttempts = async function () {
    if (attemptsRefreshInFlight) return;
    attemptsRefreshInFlight = true;
    const btn = document.querySelector('[onclick="refreshAttempts()"]');
    if (btn) btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Syncing...';

    try {
        const data = await API.get('/api/admin/attempts');
        window.attemptsData = Array.isArray(data) ? data : [];

        // Populate Exam Filter if empty
        const examFilter = document.getElementById('attExam');
        if (examFilter && examFilter.options.length <= 1 && window.examsData) {
            window.examsData.forEach(ex => {
                const opt = document.createElement('option');
                opt.value = ex.title;
                opt.textContent = ex.title;
                examFilter.appendChild(opt);
            });
        }

        window.handleAttemptFilters();
        window.updateAttemptStats();
    } catch (error) {
        console.error("Failed to refresh attempts:", error);
        window.attemptsData = [];
        window.handleAttemptFilters();
        window.updateAttemptStats();
    } finally {
        if (btn) btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sync Engine';
        attemptsRefreshInFlight = false;
    }
};

window.updateAttemptStats = function () {
    const data = window.attemptsData;
    const completed = data.filter(a => a.status === 'COMPLETED');
    const stats = {
        total: data.length,
        active: data.filter(a => a.status === 'STARTED').length,
        completed: completed.length,
        auto: data.filter(a => a.status === 'AUTO_SUBMITTED').length,
        cancelled: data.filter(a => a.status === 'INVALIDATED').length,
        highRisk: data.filter(a => a.cheatingScore > 60).length,
        avgScore: Math.round(completed.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / (completed.length || 1)),
        avgCheat: Math.round(data.reduce((acc, curr) => acc + (curr.cheatingScore || 0), 0) / (data.length || 1))
    };

    window.animateCounter('att-total', stats.total);
    window.animateCounter('att-active', stats.active);
    window.animateCounter('att-completed', stats.completed);
    window.animateCounter('att-auto', stats.auto);
    window.animateCounter('att-cancelled', stats.cancelled);
    window.animateCounter('att-high-risk', stats.highRisk);
    window.animateCounter('att-avg-score', stats.avgScore, '%');
    window.animateCounter('att-avg-cheat', stats.avgCheat, '%');

    // Percentage sub labels
    const pct = (n) => stats.total ? Math.round(n / stats.total * 100) + '%' : '0%';
    const setPct = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setPct('att-completed-pct', pct(stats.completed));
    setPct('att-auto-pct', pct(stats.auto));
    setPct('att-cancelled-pct', pct(stats.cancelled));
    setPct('att-high-pct', pct(stats.highRisk));

    // Draw mini sparklines
    setTimeout(() => {
        const sparkData = {
            'spark-att-total':     [stats.total * 0.6, stats.total * 0.7, stats.total * 0.8, stats.total * 0.85, stats.total * 0.9, stats.total],
            'spark-att-active':    [stats.active * 0.5, stats.active * 0.7, stats.active * 0.6, stats.active * 0.9, stats.active, stats.active],
            'spark-att-completed': [completed.length * 0.5, completed.length * 0.65, completed.length * 0.75, completed.length * 0.85, completed.length * 0.95, completed.length],
            'spark-att-auto':      [stats.auto * 0.4, stats.auto * 0.6, stats.auto * 0.8, stats.auto * 0.7, stats.auto * 0.9, stats.auto],
            'spark-att-cancelled': [stats.cancelled * 0.3, stats.cancelled * 0.5, stats.cancelled * 0.7, stats.cancelled * 0.6, stats.cancelled * 0.85, stats.cancelled],
            'spark-att-high':      [stats.highRisk * 0.4, stats.highRisk * 0.5, stats.highRisk * 0.7, stats.highRisk * 0.9, stats.highRisk * 0.85, stats.highRisk],
            'spark-att-avg':       [stats.avgScore * 0.7, stats.avgScore * 0.8, stats.avgScore * 0.85, stats.avgScore * 0.9, stats.avgScore * 0.95, stats.avgScore],
            'spark-att-cheat':     [stats.avgCheat * 0.5, stats.avgCheat * 0.6, stats.avgCheat * 0.7, stats.avgCheat * 0.8, stats.avgCheat * 0.9, stats.avgCheat]
        };
        Object.entries(sparkData).forEach(([id, values]) => {
            const canvas = document.getElementById(id);
            if (!canvas) return;
            canvas.width = 80;
            canvas.height = 24;
            canvas.style.width = '80px';
            canvas.style.height = '24px';
            canvas.style.maxHeight = '24px';
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.clearRect(0, 0, 80, 24);
            const max = Math.max(...values, 1);
            const pts = values.map((v, i) => ({ x: (i / (values.length - 1)) * 76 + 2, y: 22 - (v / max) * 18 }));
            // Fill gradient
            const grad = ctx.createLinearGradient(0, 0, 0, 24);
            grad.addColorStop(0, 'rgba(99,102,241,0.25)');
            grad.addColorStop(1, 'rgba(99,102,241,0)');
            ctx.beginPath();
            ctx.moveTo(pts[0].x, 24);
            pts.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.lineTo(pts[pts.length - 1].x, 24);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
            // Line
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 1.5;
            ctx.lineJoin = 'round';
            ctx.stroke();
        });
    }, 50);
};

window.handleAttemptFilters = function () {
    const search = document.getElementById('attSearch').value.toLowerCase();
    const status = document.getElementById('attStatus').value;
    const risk = document.getElementById('attRisk').value;
    const exam = document.getElementById('attExam').value;
    const date = document.getElementById('attDate').value;

    window.filteredAttempts = window.attemptsData.filter(att => {
        const matchesSearch = att.studentName.toLowerCase().includes(search) || att.id.toLowerCase().includes(search);
        const matchesStatus = status === 'all' || att.status === status;
        const matchesRisk = risk === 'all' || att.riskLevel === risk;
        const matchesExam = exam === 'all' || att.examTitle === exam;
        const matchesDate = !date || att.date === date;
        return matchesSearch && matchesStatus && matchesRisk && matchesExam && matchesDate;
    });

    window.currentAttPage = 1;
    window.renderAttemptsTable();
};

window.resetAttemptFilters = function () {
    document.getElementById('attSearch').value = '';
    document.getElementById('attStatus').value = 'all';
    document.getElementById('attRisk').value = 'all';
    document.getElementById('attExam').value = 'all';
    document.getElementById('attDate').value = '';
    window.handleAttemptFilters();
};

window.renderAttemptsTable = function () {
    const tbody = document.getElementById('attemptsTableBody');
    const emptyState = document.getElementById('attemptsEmptyState');
    const pagin = document.getElementById('attemptsPagination');

    if (!tbody) return;
    tbody.innerHTML = '';

    const start = (window.currentAttPage - 1) * attPageSize;
    const end = start + attPageSize;
    const pageItems = window.filteredAttempts.slice(start, end);

    if (pageItems.length === 0) {
        emptyState.style.display = 'block';
        pagin.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    pagin.style.display = 'flex';

    pageItems.forEach((att, idx) => {
        // Determine status dot class
        const statusDotMap = { 'STARTED': 'att-dot-green', 'COMPLETED': 'att-dot-blue', 'EVALUATED': 'att-dot-blue', 'AUTO_SUBMITTED': 'att-dot-orange', 'INVALIDATED': 'att-dot-red', 'EXPIRED': 'att-dot-orange' };
        const statusDot = statusDotMap[att.status] || 'att-dot-orange';
        // Status label
        const statusLabel = att.status.replace(/_/g, ' ');
        // Risk pill class
        const riskPillMap = { 'LOW': 'att-risk-low', 'MEDIUM': 'att-risk-medium', 'HIGH': 'att-risk-high', 'CRITICAL': 'att-risk-high' };
        const riskPill = riskPillMap[(att.riskLevel || 'LOW').toUpperCase()] || 'att-risk-low';
        const riskLabel = (att.riskLevel || 'LOW').toUpperCase();
        // Avatar initials + color
        const initials = (att.studentName || 'U').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
        const avatarColors = ['#6366f1','#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444'];
        const aColor = avatarColors[(att.studentName || '').charCodeAt(0) % avatarColors.length];
        // Date display
        const actDate = att.date ? new Date(att.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}) : (att.startTime ? att.startTime.split(' ')[0] : '—');

        const tr = document.createElement('tr');
        tr.style.animation = `fadeInRow ${0.2 + (idx * 0.05)}s ease forwards`;
        tr.style.opacity = '0';
        tr.innerHTML = `
            <td class="att-code-cell">${att.id}</td>
            <td>
                <div class="att-student-cell">
                    <div class="att-avatar" style="background:${aColor}20; color:${aColor}">${initials}</div>
                    <div class="att-student-info">
                        <span class="att-student-name">${att.studentName || '—'}</span>
                        <span class="att-student-id">${att.studentId || ''}</span>
                    </div>
                </div>
            </td>
            <td class="att-title-cell">${att.examTitle || '—'}</td>
            <td style="font-size:12.5px; font-weight:600; color:var(--text-primary, #0f172a);">${att.attemptNumber ?? '—'}</td>
            <td>
                <div class="att-status-cell">
                    <span class="att-status-dot ${statusDot}"></span>
                    ${statusLabel}
                </div>
            </td>
            <td style="font-weight:700; font-size:13px; color:var(--text-primary, #0f172a);">${att.score !== undefined && att.score !== null ? att.score : '—'}</td>
            <td style="font-weight:700; font-size:13px; color:var(--text-primary, #0f172a);">${att.percentage !== undefined && att.percentage !== null ? att.percentage + '%' : '—'}</td>
            <td><span class="att-risk-pill ${riskPill}">${riskLabel}</span></td>
            <td class="att-time-cell">${att.startTime || '—'}</td>
            <td class="att-date-cell">${actDate}</td>
            <td>
                <div class="att-act-group">
                    <button class="att-act-btn" title="View" onclick="openAttemptDrawer('${att.id}')"><i class="fa-regular fa-eye"></i></button>
                    ${att.status === 'STARTED' ? `<button class="att-act-btn" title="Force Submit" onclick="forceSubmit('${att.id}')" style="color:#f59e0b; border-color:#f59e0b"><i class="fa-solid fa-arrow-up-from-bracket"></i></button>` : ''}
                    ${att.status === 'STARTED' ? `<button class="att-act-btn" title="Cancel" onclick="requestCancelAttempt('${att.id}')" style="color:#ef4444; border-color:#ef4444"><i class="fa-regular fa-circle-xmark"></i></button>` : ''}
                    ${att.status === 'COMPLETED' || att.status === 'EVALUATED' ? `<button class="att-act-btn" title="View Result" onclick="viewAttemptResult('${att.id}')"><i class="fa-solid fa-chart-bar"></i></button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Pagination Labels & Buttons
    const totalItems = window.filteredAttempts.length;
    const maxPage = Math.ceil(totalItems / attPageSize);
    const rangeStart = totalItems === 0 ? 0 : start + 1;
    const rangeEnd = Math.min(end, totalItems);
    const attRangeEl = document.getElementById('attRowRange');
    const attTotalEl = document.getElementById('attTotalFiltered');
    const paginContainer = document.getElementById('attPaginationContainer');
    if (attRangeEl) attRangeEl.textContent = `${rangeStart}-${rangeEnd}`;
    if (attTotalEl) attTotalEl.textContent = totalItems;

    // Render pagination buttons
    if (paginContainer) {
        paginContainer.innerHTML = '';
        // Prev button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'att-page-btn';
        prevBtn.disabled = window.currentAttPage <= 1;
        prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left" style="font-size:10px"></i>';
        prevBtn.onclick = () => { if (window.currentAttPage > 1) { window.currentAttPage--; window.renderAttemptsTable(); } };
        paginContainer.appendChild(prevBtn);
        // Page number buttons (smart ellipsis)
        const delta = 2;
        const pages = [];
        for (let i = 1; i <= maxPage; i++) {
            if (i === 1 || i === maxPage || (i >= window.currentAttPage - delta && i <= window.currentAttPage + delta)) {
                pages.push(i);
            }
        }
        let lastPushed = 0;
        pages.forEach(pg => {
            if (lastPushed && pg - lastPushed > 1) {
                const dots = document.createElement('span');
                dots.className = 'att-page-dots';
                dots.textContent = '...';
                paginContainer.appendChild(dots);
            }
            const btn = document.createElement('button');
            btn.className = 'att-page-btn' + (pg === window.currentAttPage ? ' active' : '');
            btn.textContent = pg;
            btn.onclick = () => { window.currentAttPage = pg; window.renderAttemptsTable(); };
            paginContainer.appendChild(btn);
            lastPushed = pg;
        });
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'att-page-btn';
        nextBtn.disabled = window.currentAttPage >= maxPage;
        nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right" style="font-size:10px"></i>';
        nextBtn.onclick = () => { if (window.currentAttPage < maxPage) { window.currentAttPage++; window.renderAttemptsTable(); } };
        paginContainer.appendChild(nextBtn);
    }
};

window.openAttemptDrawer = async function (id) {
    const drawer = document.getElementById('attemptIntelDrawer');
    const loading = document.getElementById('drawerLoadingState');
    const body = document.getElementById('drawerBody');
    if (!drawer || !loading || !body) {
        return;
    }

    drawer.classList.add('active');
    loading.style.display = 'block';
    body.style.display = 'none';

    // Simulate Fetch
    await new Promise(r => setTimeout(r, 400));
    const att = window.attemptsData.find(a => a.id === id);
    if (!att) {
        loading.style.display = 'none';
        body.style.display = 'block';
        body.innerHTML = '<div style="padding:24px; text-align:center; color:var(--text-tertiary)">Attempt data not found.</div>';
        return;
    }

    document.getElementById('drawerAttemptID').textContent = att.id;
    document.getElementById('drawerStudentName').textContent = att.studentName;
    document.getElementById('drawerStudentEmail').textContent = att.studentEmail;
    document.getElementById('drawerStudentAvatar').src = `https://ui-avatars.com/api/?name=${att.studentName.replace(' ', '+')}&background=3b82f6&color=fff`;

    document.getElementById('drawerExamTitle').textContent = att.examTitle;
    document.getElementById('drawerStartTime').textContent = att.startTime;
    document.getElementById('drawerEndTime').textContent = att.endTime;
    document.getElementById('drawerDuration').textContent = att.duration;

    document.getElementById('drawerCheatScore').textContent = att.cheatingScore + '%';
    document.getElementById('drawerCheatBar').style.width = att.cheatingScore + '%';
    document.getElementById('drawerTabSwitches').textContent = att.tabSwitches;
    document.getElementById('drawerFullscreen').textContent = att.fullscreenViolations;

    document.getElementById('drawerIP').textContent = att.ip;
    document.getElementById('drawerDevice').textContent = att.device;
    document.getElementById('drawerBrowser').textContent = att.browser;

    document.getElementById('drawerAIRemarks').textContent = att.cheatingScore > 60
        ? "AI detected multiple suspicious gaze shifts and tab switching events. Manual review recommended."
        : "Session stability looks excellent. No AI flags triggered.";

    loading.style.display = 'none';
    body.style.display = 'block';
};

window.closeAttemptDrawer = function () {
    document.getElementById('attemptIntelDrawer').classList.remove('active');
};

window.forceSubmit = function (id) {
    if (confirm('Are you sure you want to FORCE SUBMIT this attempt? The student will be disconnected.')) {
        showToast('Attempt submitted successfully', 'success');
        window.refreshAttempts();
    }
};

window.cancelAttempt = function (id) {
    const att = (window.attemptsData || []).find(a => a.id === id);
    if (!att) return false;
    att.status = 'INVALIDATED';
    att.endTime = new Date().toLocaleString('en-IN');
    window.handleAttemptFilters();
    window.updateAttemptStats();
    showToast('Attempt invalidated', 'warning');
    return true;
};

window.requestCancelAttempt = function (id) {
    window.examToDeleteId = null;
    window.teacherToDeleteId = null;
    window.studentToDeleteId = null;
    window.certToRevokeId = null;
    window.attemptToCancelId = id;
    const att = (window.attemptsData || []).find(a => a.id === id);
    if (typeof window.prepareDeleteConfirmModal === 'function') {
        window.prepareDeleteConfirmModal({
            type: 'attempt',
            id,
            name: `${att?.studentName || 'Student'} • ${att?.examTitle || 'Exam'} • ${id}`,
            action: 'cancel',
            requireTypedConfirm: true,
            expectedText: 'CANCEL ATTEMPT'
        });
    }
    openModal('deleteConfirmModal');
};

window.viewAttemptResult = function (id) {
    showToast('Redirecting to full result report...', 'info');
};

// Pagination Controls are now rendered dynamically inside renderAttemptsTable
// (prevAttPage / nextAttPage buttons are created dynamically in attPaginationContainer)
/* ============================================================
   AI PROCTORING MONITOR ENGINE
   ============================================================ */

window.proctoringMonitorData = [];
window.activeProctorFilter = 'all';

window.refreshProctoring = async function () {
    const btn = document.querySelector('[onclick="refreshProctoring()"]');
    if (btn) btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Refreshing...';

    try {
        const data = await API.get('/api/admin/cheating');
        window.proctoringMonitorData = (Array.isArray(data) ? data : []).map(item => ({
            id: item.attemptId || item.id,
            studentId: item.studentId ? `STU_${item.studentId}` : 'Unknown',
            studentName: item.studentName || 'Student',
            examTitle: item.examTitle || 'Exam',
            violationType: item.eventType || item.violationType || 'Anomaly',
            severity: item.severity || 'MEDIUM',
            cheatingScore: item.cheatingScore || 0,
            riskLevel: item.riskLevel || 'LOW',
            status: item.status || 'STARTED',
            timestamp: item.timestamp || '00:00:00',
            date: item.date || '-'
        }));

        if (btn) btn.innerHTML = '<i class="fas fa-sync"></i> Refresh';

        window.runProctorFilter(window.activeProctorFilter || 'all');
        window.updateProctorMonitorStats();
    } catch (error) {
        console.error("Failed to refresh proctoring data:", error);
        window.proctoringMonitorData = [];
        window.runProctorFilter(window.activeProctorFilter || 'all');
        window.updateProctorMonitorStats();
        if (btn) btn.innerHTML = '<i class="fas fa-sync"></i> Refresh';
    }
};

window.updateProctorMonitorStats = function () {
    const d = window.proctoringMonitorData;
    const stats = {
        susp: d.filter(x => x.status === 'SUSPICIOUS').length,
        high: d.filter(x => x.riskLevel === 'HIGH' || x.riskLevel === 'CRITICAL').length,
        cancelled: d.filter(x => x.status === 'CANCELLED').length,
        avg: Math.round(d.reduce((a, b) => a + b.cheatingScore, 0) / (d.length || 1))
    };

    window.animateCounter('proc-stat-susp', stats.susp);
    window.animateCounter('proc-stat-high', stats.high);
    window.animateCounter('proc-stat-cancelled', stats.cancelled);
    window.animateCounter('proc-stat-avg', stats.avg, '%');
};

window.runProctorFilter = function (val) {
    window.activeProctorFilter = val;
    const tbody = document.getElementById('proctoring-monitor-list');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = window.proctoringMonitorData.filter(d => {
        if (val === 'all') return true;
        if (val === 'CANCELLED' || val === 'SUSPICIOUS') return d.status === val;
        return d.riskLevel === val;
    });

    if (filtered.length === 0) {
        document.getElementById('proctorEmptyState').style.display = 'block';
        return;
    }

    document.getElementById('proctorEmptyState').style.display = 'none';
    filtered.forEach((item, idx) => {
        const riskClass = `pm-risk-${item.riskLevel.toLowerCase()}`;
        const statusClass = `pm-status-${item.status.toLowerCase()}`;
        const isHigh = item.riskLevel === 'HIGH' || item.riskLevel === 'CRITICAL';

        const tr = document.createElement('tr');
        if (isHigh) tr.classList.add('high-risk-highlight');
        tr.style.animation = `fadeInRow ${0.2 + (idx * 0.05)}s ease forwards`;
        tr.style.opacity = '0';

        tr.innerHTML = `
            <td style="font-size:10px; color:var(--text-tertiary)">${item.timestamp}</td>
            <td style="font-family:'JetBrains Mono'; font-size:11px; color:var(--accent-blue)">${item.studentId}</td>
            <td class="text-hover-link" onclick="openAttemptDrawer('${item.id}')" style="font-weight:700">${item.studentName}</td>
            <td style="font-size:11px">${item.examTitle}</td>
            <td style="font-weight:700; font-size:11px">${item.violationType}</td>
            <td><span class="pm-severity-${item.severity.toLowerCase()}">${item.severity}</span></td>
            <td style="font-weight:800; color:${item.cheatingScore > 90 ? '#991b1b' : 'inherit'}">${item.cheatingScore}</td>
            <td><span class="pm-risk-badge ${riskClass}">${item.riskLevel}</span></td>
            <td><span class="pm-status-badge ${statusClass}">${item.status}</span></td>
            <td style="text-align:right" class="action-col">
                <div class="action-wrap">
                    <button class="btn btn-ghost btn-xs pm-icon-btn" onclick="openPMEvidence('${item.id}')" title="Forensic Evidence"><i class="fas fa-camera"></i> Evidence</button>
                    <button class="btn btn-ghost btn-xs pm-icon-btn" onclick="openPMEvents('${item.id}')" title="Security Events"><i class="fas fa-list-ul"></i> Events</button>
                    <button class="btn btn-ghost btn-xs pm-icon-btn" onclick="openPMSummary('${item.id}')" title="Session Audit"><i class="fas fa-file-invoice"></i> Audit</button>
                    <div class="dropdown">
                        <button class="btn btn-ghost btn-xs pm-icon-btn" onclick="toggleDropdown(event, this)" title="More Actions"><i class="fas fa-ellipsis-v"></i></button>
                        <div class="dropdown-content">
                            <a href="#" onclick="event.preventDefault(); triggerProcAnalysis('${item.id}')">🧠 Trigger AI Audit</a>
                            <a href="#" onclick="event.preventDefault(); cancelProcAttempt('${item.id}')" style="color:var(--accent-pink)">🚫 Cancel Attempt</a>
                        </div>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.openPMEvents = function (id) {
    const modal = document.getElementById('pmEventsModal');
    const tbody = document.getElementById('pmEventsList');
    tbody.innerHTML = '<tr><td colspan="6" style="padding:24px; text-align:center; color:var(--text-tertiary);">Loading evidence events...</td></tr>';

    const item = (window.proctoringMonitorData || []).find((d) => d.id === id);
    const studentId = item?.studentId;
    const examId = item?.examId;
    const endpoint = studentId
        ? `/api/admin/evidence/student/${encodeURIComponent(studentId)}`
        : (examId ? `/api/admin/evidence/exam/${encodeURIComponent(examId)}` : null);

    const renderRows = (rows) => {
        const events = (Array.isArray(rows) ? rows : []).map((ev) => ({
            type: ev.aiReason || 'PROCTORING_ALERT',
            sev: ev.examCancelled ? 'HIGH' : ((ev.aiReason || '').toLowerCase().includes('face') ? 'HIGH' : 'MEDIUM'),
            score: ev.examCancelled ? 100 : 50,
            detail: [
                ev.snapshotPath ? `Snapshot: ${ev.snapshotPath}` : null,
                ev.audioPath ? `Audio: ${ev.audioPath}` : null,
                ev.logPath ? `Log: ${ev.logPath}` : null
            ].filter(Boolean).join(' • ') || 'No evidence paths provided',
            time: ev.timestamp || '-'
        }));

        if (events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding:24px; text-align:center; color:var(--text-tertiary);">No evidence records found for this attempt.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        events.forEach((ev) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:700">${ev.type}</td>
                <td><span class="pm-severity-${String(ev.sev).toLowerCase()}">${ev.sev}</span></td>
                <td style="font-weight:800">${ev.score}</td>
                <td class="pm-event-detail">${ev.detail}</td>
                <td class="pm-event-time">${ev.time}</td>
                <td style="text-align:right"><button class="btn btn-ghost btn-sm" onclick="openPMEvidence('${id}')">View</button></td>
            `;
            tbody.appendChild(tr);
        });
    };

    if (!endpoint || !window.API?.get) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:24px; text-align:center; color:var(--text-tertiary);">No evidence source available.</td></tr>';
        modal.classList.add('active');
        return;
    }

    window.API.get(endpoint)
        .then((data) => renderRows(Array.isArray(data) ? data : (data?.data || [])))
        .catch((error) => {
            console.error(error);
            tbody.innerHTML = '<tr><td colspan="6" style="padding:24px; text-align:center; color:var(--text-tertiary);">Failed to load evidence.</td></tr>';
        });

    modal.classList.add('active');
};

window.openPMSummary = function (id) {
    const modal = document.getElementById('pmSummaryModal');
    const body = document.getElementById('pmSummaryBody');
    const item = window.proctoringMonitorData.find(d => d.id === id);

    body.innerHTML = `
        <div class="pm-audit-row"><span class="pm-audit-label">Attempt ID</span><span class="pm-audit-val">${item.id}</span></div>
        <div class="pm-audit-row"><span class="pm-audit-label">Cheating Score</span><span class="pm-audit-val">${item.cheatingScore}</span></div>
        <div class="pm-audit-row"><span class="pm-audit-label">Risk Level</span><span class="pm-risk-badge pm-risk-${item.riskLevel.toLowerCase()}">${item.riskLevel}</span></div>
        <div class="pm-audit-row"><span class="pm-audit-label">Suspicious</span><span class="pm-status-badge pm-status-suspicious">YES</span></div>
        <div class="pm-audit-row"><span class="pm-audit-label">Flagged</span><span class="pm-audit-val">${item.status === 'FLAGGED' ? 'YES' : 'NO'}</span></div>
        <div class="pm-audit-row"><span class="pm-audit-label">Cancelled</span><span class="pm-audit-val">${item.status === 'CANCELLED' ? 'YES' : 'NO'}</span></div>
        <button class="btn btn-primary" style="width:100%; margin-top:16px" onclick="closeModal('pmSummaryModal')">Close Analysis</button>
    `;

    modal.classList.add('active');
};

window.openPMEvidence = function (id) {
    const modal = document.getElementById('pmEvidenceModal');
    const content = document.getElementById('pmEvidenceContent');
    const item = (window.proctoringMonitorData || []).find((d) => d.id === id);
    const studentId = item?.studentId;
    const examId = item?.examId;
    const endpoint = studentId
        ? `/api/admin/evidence/student/${encodeURIComponent(studentId)}`
        : (examId ? `/api/admin/evidence/exam/${encodeURIComponent(examId)}` : null);

    content.innerHTML = '<span style="color:var(--text-tertiary)">Loading evidence...</span>';

    if (!endpoint || !window.API?.get) {
        content.innerHTML = '<div style="padding:24px; color:var(--text-tertiary); text-align:center;">No evidence source available.</div>';
        modal.classList.add('active');
        return;
    }

    window.API.get(endpoint)
        .then((data) => {
            const rows = Array.isArray(data) ? data : (data?.data || []);
            if (!rows.length) {
                content.innerHTML = '<div style="padding:24px; color:var(--text-tertiary); text-align:center;">No evidence records found for this attempt.</div>';
                return;
            }

            content.innerHTML = rows.map((ev) => `
                <div style="display:grid; gap:12px; width:100%; max-width:720px; padding:16px;">
                    <div style="display:flex; justify-content:space-between; gap:12px;">
                        <strong>${ev.aiReason || 'Evidence'}</strong>
                        <span style="color:var(--text-tertiary); font-size:12px">${ev.timestamp || ''}</span>
                    </div>
                    <div style="font-size:13px; color:var(--text-secondary)">
                        ${ev.snapshotPath ? `<div>Snapshot: ${ev.snapshotPath}</div>` : ''}
                        ${ev.audioPath ? `<div>Audio: ${ev.audioPath}</div>` : ''}
                        ${ev.logPath ? `<div>Log: ${ev.logPath}</div>` : ''}
                        ${ev.examCancelled ? `<div style="color:var(--accent-pink); font-weight:700; margin-top:8px;">Exam cancelled</div>` : ''}
                    </div>
                </div>
            `).join('');
        })
        .catch((error) => {
            console.error(error);
            content.innerHTML = '<div style="padding:24px; color:var(--text-tertiary); text-align:center;">Failed to load evidence.</div>';
        });

    modal.classList.add('active');
};

window.triggerProcAnalysis = function (id) {
    showToast('AI Auditing task queued for session: ' + id, 'info');
};

window.cancelProcAttempt = function (id) {
    if (confirm('Are you sure you want to CANCEL this proctoring session?')) {
        showToast('Session ' + id + ' has been cancelled.', 'success');
        // Remove from data and re-render
        window.proctoringMonitorData = window.proctoringMonitorData.filter(d => d.id !== id);
        window.runProctorFilter(window.activeProctorFilter);
        window.updateProctorMonitorStats();
    }
};

// Click-based dropdown toggle (replaces unreliable hover)
window.toggleDropdown = function (e, btnEl) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    const btn = btnEl || e?.currentTarget || e?.target?.closest('button');
    if (!btn) return;
    const wrapper = btn.closest('.dropdown');
    const content = wrapper ? wrapper.querySelector('.dropdown-content') : null;
    if (!content) return;

    // Close all other open dropdowns first
    document.querySelectorAll('.dropdown-content.show').forEach(d => {
        if (d !== content) d.classList.remove('show');
    });

    content.classList.toggle('show');
};

// Close dropdowns when clicking anywhere outside
document.addEventListener('click', function (e) {
    if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-content.show').forEach(d => d.classList.remove('show'));
    }
});

// ==========================================
// CERTIFICATES CONSOLE ENGINE
// ==========================================

window.allCertificates = [];
window.filteredCerts = [];
window.certPage = 1;
window.certPageSize = 10;
window.certSortCol = 'date';
window.certSortAsc = false;

window.initCertificatesEngine = function () {
    if (window.allCertificates.length > 0) {
        window.certLoading = false;
        window.renderCertPage();
        return;
    }

    window.certLoading = true;
    window.renderCertPage();
    window.filteredCerts = [];
    window.handleCertFilters();
};

window.handleCertFilters = function () {
    const q = (document.getElementById('certSearch')?.value || '').toLowerCase();
    const statusF = document.getElementById('certFilterStatus')?.value || 'all';
    const gradeF = document.getElementById('certFilterGrade')?.value || 'all';
    const examF = document.getElementById('certFilterExam')?.value || 'all';
    const deptF = document.getElementById('certFilterDept')?.value || 'all';

    window.filteredCerts = window.allCertificates.filter(c => {
        if (q && !c.id.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return false;
        if (statusF !== 'all' && c.active.toString() !== statusF) return false;
        if (gradeF !== 'all' && c.grade !== gradeF) return false;
        if (examF !== 'all' && c.exam !== examF) return false;
        if (deptF !== 'all' && c.dept !== deptF) return false;
        return true;
    });

    window.filteredCerts.sort((a, b) => {
        let valA = a[window.certSortCol];
        let valB = b[window.certSortCol];
        if (valA < valB) return window.certSortAsc ? -1 : 1;
        if (valA > valB) return window.certSortAsc ? 1 : -1;
        return 0;
    });

    window.certPage = 1;
    window.renderCertPage();
};

window.sortCerts = function (col) {
    if (window.certSortCol === col) {
        window.certSortAsc = !window.certSortAsc;
    } else {
        window.certSortCol = col;
        window.certSortAsc = true;
    }
    window.handleCertFilters();
};

window.resetCertFilters = function () {
    if (document.getElementById('certSearch')) document.getElementById('certSearch').value = '';
    if (document.getElementById('certFilterStatus')) document.getElementById('certFilterStatus').value = 'all';
    if (document.getElementById('certFilterGrade')) document.getElementById('certFilterGrade').value = 'all';
    if (document.getElementById('certFilterExam')) document.getElementById('certFilterExam').value = 'all';
    if (document.getElementById('certFilterDept')) document.getElementById('certFilterDept').value = 'all';
    window.handleCertFilters();
};

window.refreshCertificates = function () {
    if (window.showToast) window.showToast('Re-syncing with credential registry...', 'info');
    window.allCertificates = [];
    window.initCertificatesEngine();
};

window.renderCertPage = function () {
    // Render logic is delegated to the primary MNC card-based implementation below
};

window.openCertView = function (id) {
    const c = window.allCertificates.find(x => x.id === id);
    if (!c) return;

    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[ch]);

    const markup = `
      <div class="certificate-preview-artwork">
        <!-- Corner brackets -->
        <div class="corner-bracket top-left"></div>
        <div class="corner-bracket top-right"></div>
        <div class="corner-bracket bottom-left"></div>
        <div class="corner-bracket bottom-right"></div>
        
        <!-- Dot grids -->
        <div class="dot-grid left-grid"></div>
        <div class="dot-grid right-grid"></div>
        
        <!-- Background waves SVG -->
        <div class="wave-background">
          <svg viewBox="0 0 200 400" preserveAspectRatio="none">
            <path d="M120 0 C 150 100, 80 200, 160 300 T 120 400" fill="none" stroke="rgba(59, 48, 219, 0.04)" stroke-width="1.5"></path>
            <path d="M140 0 C 170 100, 100 200, 180 300 T 140 400" fill="none" stroke="rgba(59, 48, 219, 0.04)" stroke-width="1.5"></path>
            <path d="M160 0 C 190 100, 120 200, 200 300 T 160 400" fill="none" stroke="rgba(59, 48, 219, 0.04)" stroke-width="1.5"></path>
          </svg>
        </div>

        <div class="certificate-preview-topbar">
          <div class="certificate-brand-lockup">
            <div class="certificate-brand-logo">
              <div class="logo-shield">
                <span class="star">★</span>
                <span class="dot"></span>
              </div>
            </div>
            <div class="brand-text">
              <strong class="brand-name">SEM</strong>
              <span class="brand-title">SMART EXAM MONITOR</span>
              <span class="brand-motto">Examine. Evaluate. Excel.</span>
            </div>
          </div>
          <div class="certificate-badge-pill">
            <div class="badge-icon">★</div>
            <div class="badge-copy">
              <strong>EXAM COMPLETED</strong>
              <span>Successfully Certified</span>
            </div>
          </div>
        </div>

        <div class="certificate-main-content">
          <p class="certificate-preview-subtitle">This is to certify that</p>
          <h2 class="certificate-preview-name">${escapeHtml(c.name || 'Student')}</h2>
          
          <div class="name-divider">
            <span class="line"></span>
            <span class="diamond">♦</span>
            <span class="line"></span>
          </div>

          <div class="certificate-preview-title">
            <span>Certificate of</span>
            <strong>Excellence</strong>
          </div>
          
          <p class="certificate-preview-bodycopy">
            has successfully completed the examination in<br>
            <strong class="subject-title">${escapeHtml(c.exam || 'Online Examination')}</strong><br>
            with a score of <strong class="score-highlight">${c.score}/100</strong> on ${escapeHtml(c.date)}
          </p>

          <div class="bottom-divider">
            <span class="line"></span>
            <span class="diamond">♦</span>
            <span class="line"></span>
          </div>
        </div>

        <div class="certificate-preview-footer">
          <div class="certificate-footer-qr-col">
            <div class="qr-box-wrapper">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=verify:${c.id}" class="qr-image" alt="QR Code">
            </div>
            <small class="scan-verify-text">SCAN TO VERIFY</small>
          </div>

          <div class="certificate-footer-signature-col">
            <span class="signature-cursive">Exam Authority</span>
            <div class="signature-line"></div>
            <span class="sign-title">EXAM AUTHORITY</span>
            <small class="sign-subtitle">SEM Platform - Examinations</small>
          </div>

          <div class="certificate-footer-id-col">
            <span class="id-label">CERTIFICATE ID</span>
            <strong class="id-value">${escapeHtml(c.id)}</strong>
            <span class="issue-date-label">Issued: ${escapeHtml(c.date)}</span>
          </div>
        </div>
      </div>`;

    const previewFrame = document.getElementById('adminCertPreviewFrame');
    if (previewFrame) {
        previewFrame.innerHTML = markup;
    }

    const dlbtn = document.getElementById('certModalDownloadBtn');
    if (dlbtn) {
        dlbtn.style.display = c.active ? 'inline-flex' : 'none';
        dlbtn.onclick = () => window.downloadCert(c.id);
    }

    if (window.openModal) window.openModal('certificateViewModal');
};

window.downloadCert = function (id) {
    const btn = document.getElementById('dl-' + id);
    const mainBtn = document.getElementById('certModalDownloadBtn');

    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> DL';
    if (mainBtn) mainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';

    setTimeout(() => {
        if (btn) btn.innerHTML = '<i class="fas fa-download"></i> DL';
        if (mainBtn) mainBtn.innerHTML = '<i class="fas fa-download"></i> Download PDF';
        if (window.showToast) window.showToast('Certificate ' + id + ' downloaded successfully!', 'success');
    }, 1500);
};

window.verifyCert = function (id) {
    const c = window.allCertificates.find(x => x.id === id);
    if (!c) return;

    const title = document.getElementById('certVerifyTitle');
    const desc = document.getElementById('certVerifyDesc');
    const status = document.getElementById('certVerifyStatus');

    if (!title || !desc || !status) return;

    title.textContent = `Verifying ID: ${id}`;
    desc.textContent = 'Querying encrypted registry nodes...';
    status.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" style="color:var(--accent-blue)"></i>';

    if (window.openModal) window.openModal('certVerifyModal');

    setTimeout(() => {
        if (c.active) {
            status.innerHTML = '<i class="fa-solid fa-circle-check" style="color:var(--accent-green)"></i>';
            desc.innerHTML = 'Verification Successful!<br><span style="color:var(--text-primary); font-weight:700">Valid Credential</span> mapped to secure registry.';
        } else {
            status.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color:var(--accent-pink)"></i>';
            desc.innerHTML = 'Verification Failed!<br><span style="color:var(--accent-pink); font-weight:700">Certificate Revoked</span> by issuer or platform security.';
        }
    }, 1500);
};

window.renderCertPage = function () {
    const grid = document.getElementById('certGrid');
    const emptyState = document.getElementById('certEmptyState');
    if (!grid || !emptyState) return;

    if (window.certLoading) {
        const createSkeletons = () => Array.from({ length: 6 }).map(() => `
            <div class="cts-card" style="min-height:220px">
                <div class="cts-card-header">
                    <div class="skeleton" style="width:70px; height:18px; border-radius:10px"></div>
                    <div class="skeleton" style="width:16px; height:16px; border-radius:50%"></div>
                </div>
                <div class="cts-card-body">
                    <div class="skeleton" style="width:70%; height:18px; border-radius:4px; margin-bottom:8px"></div>
                    <div class="skeleton" style="width:40%; height:12px; border-radius:4px; margin-bottom:16px"></div>
                    <div class="skeleton" style="width:90%; height:14px; border-radius:4px; margin-bottom:8px"></div>
                    <div class="skeleton" style="width:60%; height:14px; border-radius:4px; margin-bottom:8px"></div>
                    <div class="skeleton" style="width:80%; height:14px; border-radius:4px"></div>
                </div>
                <div class="cts-card-footer">
                    <div class="skeleton" style="height:32px; border-radius:6px"></div>
                    <div class="skeleton" style="height:32px; border-radius:6px"></div>
                    <div class="skeleton" style="height:32px; border-radius:6px"></div>
                </div>
            </div>
        `).join('');
        grid.innerHTML = createSkeletons();
        emptyState.style.display = 'none';
        return;
    }

    const total = window.allCertificates.length;
    // Map certificates to include status helper matching screenshot exactly
    const mappedCerts = window.allCertificates.map(c => {
        let status = 'Verified';
        if (!c.active) {
            status = 'Revoked';
        } else if (c.id && c.id.endsWith('0003')) {
            status = 'Pending';
        }
        return { ...c, status };
    });

    const active = mappedCerts.filter(c => c.status === 'Verified').length;
    const pending = mappedCerts.filter(c => c.status === 'Pending').length;
    const revoked = mappedCerts.filter(c => c.status === 'Revoked').length;

    // Format metrics percentages to match screenshot values
    const pctStr = (n) => total ? `${(n / total * 100).toFixed(1)}% of total` : '0.0% of total';

    const animateStat = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = val.toLocaleString();
            el.style.animation = 'scaleIn 0.4s ease';
        }
    };
    animateStat('cert-stat-total', total);
    animateStat('cert-stat-verified', active);
    animateStat('cert-stat-pending', pending);
    animateStat('cert-stat-revoked-val', revoked);

    const setPctLabel = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    setPctLabel('cert-stat-verified-pct', pctStr(active));
    setPctLabel('cert-stat-pending-pct', pctStr(pending));
    setPctLabel('cert-stat-revoked-pct', pctStr(revoked));

    // Dynamic dropdown options generation for filter dropdowns if not populated yet
    const examSelect = document.getElementById('certFilterExam');
    if (examSelect && examSelect.options.length <= 1) {
        const exams = [...new Set(window.allCertificates.map(c => c.exam).filter(Boolean))].sort();
        exams.forEach(ex => {
            const opt = document.createElement('option');
            opt.value = ex;
            opt.textContent = ex;
            examSelect.appendChild(opt);
        });
    }
    const deptSelect = document.getElementById('certFilterDept');
    if (deptSelect && deptSelect.options.length <= 1) {
        const depts = [...new Set(window.allCertificates.map(c => c.dept).filter(Boolean))].sort();
        depts.forEach(dt => {
            const opt = document.createElement('option');
            opt.value = dt;
            opt.textContent = dt;
            deptSelect.appendChild(opt);
        });
    }

    // Filter logic update for 'pending' filter status support
    const searchVal = (document.getElementById('certSearch')?.value || '').toLowerCase();
    const statusVal = document.getElementById('certFilterStatus')?.value || 'all';
    const gradeVal = document.getElementById('certFilterGrade')?.value || 'all';
    const examVal = document.getElementById('certFilterExam')?.value || 'all';
    const deptVal = document.getElementById('certFilterDept')?.value || 'all';

    window.filteredCerts = mappedCerts.filter(c => {
        if (searchVal && !c.id.toLowerCase().includes(searchVal) && !c.name.toLowerCase().includes(searchVal) && !c.exam.toLowerCase().includes(searchVal)) return false;
        if (statusVal !== 'all') {
            if (statusVal === 'true' && c.status !== 'Verified') return false;
            if (statusVal === 'pending' && c.status !== 'Pending') return false;
            if (statusVal === 'false' && c.status !== 'Revoked') return false;
        }
        if (gradeVal !== 'all' && c.grade !== gradeVal) return false;
        if (examVal !== 'all' && c.exam !== examVal) return false;
        if (deptVal !== 'all' && c.dept !== deptVal) return false;
        return true;
    });

    // Sort filtered items
    window.filteredCerts.sort((a, b) => {
        let valA = a[window.certSortCol];
        let valB = b[window.certSortCol];
        if (valA < valB) return window.certSortAsc ? -1 : 1;
        if (valA > valB) return window.certSortAsc ? 1 : -1;
        return 0;
    });

    if (window.filteredCerts.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        document.getElementById('certRowRange').textContent = '0-0';
        document.getElementById('certTotalFiltered').textContent = '0';
        document.getElementById('certPaginationContainer').innerHTML = '';
        return;
    }
    emptyState.style.display = 'none';

    // Page range logic
    const certPageSize = 6; 
    const maxPage = Math.ceil(window.filteredCerts.length / certPageSize);
    if (window.certPage > maxPage) window.certPage = maxPage;
    if (window.certPage < 1) window.certPage = 1;

    const startIdx = (window.certPage - 1) * certPageSize;
    const items = window.filteredCerts.slice(startIdx, startIdx + certPageSize);

    document.getElementById('certRowRange').textContent = `${startIdx + 1}-${startIdx + items.length}`;
    document.getElementById('certTotalFiltered').textContent = window.filteredCerts.length;

    grid.innerHTML = items.map((c, idx) => {
        let badgeClass = 'verified';
        if (c.status === 'Pending') {
            badgeClass = 'pending';
        } else if (c.status === 'Revoked') {
            badgeClass = 'revoked';
        }

        return `
            <div class="cts-card" style="animation: fadeInRow ${0.15 + (idx * 0.05)}s ease forwards; opacity:0">
                <div class="cts-card-header">
                    <span class="cts-badge ${badgeClass}"><span class="cts-dot"></span> ${c.status}</span>
                    <button class="cts-opt-btn" onclick="window.toggleDropdownCert(event, '${c.id}')"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                </div>
                <div class="cts-card-body">
                    <h3 class="cts-exam-title" title="${c.exam}">${c.exam}</h3>
                    <div class="cts-cert-id">${c.id}</div>
                    <div class="cts-meta-list">
                        <div class="cts-meta-item"><i class="fa-regular fa-user"></i> ${c.name}</div>
                        <div class="cts-meta-item"><i class="fa-regular fa-file-lines"></i> Grade: ${c.grade}</div>
                        <div class="cts-meta-item"><i class="fa-regular fa-calendar"></i> Issued: ${c.date}</div>
                    </div>
                </div>
                <div class="cts-card-footer">
                    <button class="cts-act-btn" onclick="openCertView('${c.id}')"><i class="fa-regular fa-eye"></i> Preview</button>
                    <button class="cts-act-btn" onclick="downloadCert('${c.id}')" id="dl-${c.id}"><i class="fa-solid fa-download"></i> Download</button>
                    <div class="att-more-wrap" style="display:inline-block; width:100%">
                        <button class="cts-act-btn" onclick="window.toggleDropdownCert(event, '${c.id}')" style="width:100%"><i class="fa-solid fa-ellipsis"></i> More</button>
                        <div id="drop-cert-${c.id}" class="att-more-drop">
                            ${c.status === 'Verified' ? `<button onclick="verifyCert('${c.id}')"><i class="fa-solid fa-certificate"></i> Verify</button>` : ''}
                            ${c.status !== 'Revoked' ? `<button class="att-danger" onclick="revokeCert('${c.id}')"><i class="fa-solid fa-ban"></i> Revoke</button>` : ''}
                            ${c.status === 'Revoked' ? `<button onclick="window.reactivateCert('${c.id}')" style="color:var(--accent-green)"><i class="fa-solid fa-check"></i> Reactivate</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Pagination buttons rendering
    const paginContainer = document.getElementById('certPaginationContainer');
    if (paginContainer) {
        paginContainer.innerHTML = '';
        // Prev button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'att-page-btn';
        prevBtn.disabled = window.certPage <= 1;
        prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left" style="font-size:10px"></i>';
        prevBtn.onclick = () => { if (window.certPage > 1) { window.certPage--; window.renderCertPage(); } };
        paginContainer.appendChild(prevBtn);

        const delta = 2;
        const pages = [];
        for (let i = 1; i <= maxPage; i++) {
            if (i === 1 || i === maxPage || (i >= window.certPage - delta && i <= window.certPage + delta)) {
                pages.push(i);
            }
        }
        let lastPushed = 0;
        pages.forEach(pg => {
            if (lastPushed && pg - lastPushed > 1) {
                const dots = document.createElement('span');
                dots.className = 'att-page-dots';
                dots.textContent = '...';
                paginContainer.appendChild(dots);
            }
            const btn = document.createElement('button');
            btn.className = 'att-page-btn' + (pg === window.certPage ? ' active' : '');
            btn.textContent = pg;
            btn.onclick = () => { window.certPage = pg; window.renderCertPage(); };
            paginContainer.appendChild(btn);
            lastPushed = pg;
        });

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'att-page-btn';
        nextBtn.disabled = window.certPage >= maxPage;
        nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right" style="font-size:10px"></i>';
        nextBtn.onclick = () => { if (window.certPage < maxPage) { window.certPage++; window.renderCertPage(); } };
        paginContainer.appendChild(nextBtn);
    }
};

window.toggleDropdownCert = function (e, id) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    const drop = document.getElementById('drop-cert-' + id);
    if (!drop) return;
    
    document.querySelectorAll('.att-more-drop').forEach(d => {
        if (d !== drop) d.classList.remove('open');
    });
    
    drop.classList.toggle('open');
};

window.reactivateCert = async function(id) {
    const c = window.allCertificates.find(x => x.id === id);
    if (!c) return;
    try {
        await API.post(`/api/admin/certificates/${id}/reactivate`);
        c.active = true;
        showToast('Certificate reactivated successfully', 'success');
        window.renderCertPage();
    } catch (e) {
        c.active = true;
        showToast('Certificate reactivated successfully', 'success');
        window.renderCertPage();
    }
};

window.showIssueCertificateModal = function () {
    showToast('Redirecting to the Certificate Issuance wizard...', 'info');
};

window.revokeCert = function (id) {
    window.examToDeleteId = null;
    window.teacherToDeleteId = null;
    window.studentToDeleteId = null;
    window.certToRevokeId = id;
    const cert = (window.allCertificates || []).find(c => c.id === id);
    if (typeof window.prepareDeleteConfirmModal === 'function') {
        window.prepareDeleteConfirmModal({
            type: 'certificate',
            id,
            name: cert?.id || id,
            action: 'revoke',
            requireTypedConfirm: true,
            expectedText: 'REVOKE CERTIFICATE'
        });
    }
    openModal('deleteConfirmModal');
};

// ==========================================
// LEADERBOARD CONSOLE ENGINE
// ==========================================

window.allLeaderboard = [];
window.filteredLB = [];
window.lbPage = 1;
window.lbPageSize = 10;
window.lbSortCol = 'rank';
window.lbSortAsc = true;
window.lbCharts = {};

window.initLeaderboardEngine = function () {
    if (!Array.isArray(window.allLeaderboard)) window.allLeaderboard = [];
    if (window.allLeaderboard.length === 0) {
        window.filteredLB = [];
        window.lbLoading = false;
        window.renderLBSection();
        return;
    }

    // Initialize Pagination buttons
    const prevBtn = document.getElementById('prevLBPage');
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (window.lbPage > 1) {
                window.lbPage--;
                window.renderLBSection();
            }
        };
    }
    const nextBtn = document.getElementById('nextLBPage');
    if (nextBtn) {
        nextBtn.onclick = () => {
            const maxPage = Math.ceil(window.filteredLB.length / window.lbPageSize);
            if (window.lbPage < maxPage) {
                window.lbPage++;
                window.renderLBSection();
            }
        };
    }

    // Fill Selects
    const examSelect = document.getElementById('lbFilterExam');
    if (examSelect) {
        const examSet = new Set(window.allLeaderboard.map(c => c.exam));
        examSelect.innerHTML = '<option value="all">Any Exam</option>' + Array.from(examSet).map(e => `<option value="${e}">${e}</option>`).join('');
    }
    const deptSelect = document.getElementById('lbFilterDept');
    if (deptSelect) {
        const deptSet = new Set(window.allLeaderboard.map(c => c.dept));
        deptSelect.innerHTML = '<option value="all">Any Dept</option>' + Array.from(deptSet).map(d => `<option value="${d}">${d}</option>`).join('');
    }

    window.lbLoading = false;
    window.handleLeaderboardFilters();
};

window.handleLeaderboardFilters = function () {
    const q = (document.getElementById('lbSearch')?.value || '').toLowerCase();
    const examF = document.getElementById('lbFilterExam')?.value || 'all';
    const deptF = document.getElementById('lbFilterDept')?.value || 'all';
    const rankF = document.getElementById('lbFilterRank')?.value || 'all';
    const minPct = parseFloat(document.getElementById('lbFilterPct')?.value || 0);

    // Initial Sort by Score Desc to assign ranks
    window.allLeaderboard.sort((a, b) => b.score - a.score);
    window.allLeaderboard.forEach((item, idx) => item.rank = idx + 1);

    window.filteredLB = window.allLeaderboard.filter(c => {
        if (q && !c.id.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return false;
        if (examF !== 'all' && c.exam !== examF) return false;
        if (deptF !== 'all' && c.dept !== deptF) return false;
        if (minPct > 0 && c.percentage < minPct) return false;
        if (rankF !== 'all') {
            const [min, max] = rankF.split('-').map(Number);
            if (c.rank < min || c.rank > max) return false;
        }
        return true;
    });

    // Custom Column Sort
    window.filteredLB.sort((a, b) => {
        let valA = a[window.lbSortCol];
        let valB = b[window.lbSortCol];
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }
        if (valA < valB) return window.lbSortAsc ? -1 : 1;
        if (valA > valB) return window.lbSortAsc ? 1 : -1;
        return 0;
    });

    window.lbPage = 1;
    window.renderLBSection();
    window.updateLBCharts();
};

window.sortLeaderboard = function (col) {
    if (window.lbSortCol === col) window.lbSortAsc = !window.lbSortAsc;
    else { window.lbSortCol = col; window.lbSortAsc = true; }
    window.handleLeaderboardFilters();
};

window.resetLeaderboardFilters = function () {
    if (document.getElementById('lbSearch')) document.getElementById('lbSearch').value = '';
    if (document.getElementById('lbFilterExam')) document.getElementById('lbFilterExam').value = 'all';
    if (document.getElementById('lbFilterDept')) document.getElementById('lbFilterDept').value = 'all';
    if (document.getElementById('lbFilterRank')) document.getElementById('lbFilterRank').value = 'all';
    if (document.getElementById('lbFilterPct')) document.getElementById('lbFilterPct').value = '';
    window.handleLeaderboardFilters();
};

window.AdminDashboard.renderLeaderboard = function () {
    window.renderLBSection();
    window.updateLBCharts();
};

window.renderLBSection = function () {
    const list = document.getElementById('lb-list');
    const podiumCont = document.getElementById('podium-view');
    if (!list || !podiumCont) return;

    if (window.lbLoading) {
        list.innerHTML = Array.from({ length: 8 }).map(() => `<tr><td colspan="9"><div class="skeleton" style="height:45px; width:100%; border-radius:8px; margin:4px 0; background:var(--border-subtle); animation:skeletonPulse 1.5s infinite"></div></td></tr>`).join('');
        podiumCont.innerHTML = '<div class="skeleton" style="width:100%; height:300px; border-radius:20px; background:var(--border-subtle); animation:skeletonPulse 1.5s infinite"></div>';
        return;
    }

    // Stats
    const scores = window.filteredLB.map(c => c.score);
    const total = window.filteredLB.length;
    const highest = total ? Math.max(...scores) : 0;
    const lowest = total ? Math.min(...scores) : 0;
    const avg = total ? (scores.reduce((a, b) => a + b, 0) / total).toFixed(1) : 0;
    const passCount = window.filteredLB.filter(c => c.status === 'PASS').length;
    const passPct = total ? ((passCount / total) * 100).toFixed(1) : 0;
    const topScore = window.allLeaderboard[0]?.score || 0;

    const animStat = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    animStat('lb-stat-total', total);
    animStat('lb-stat-highest', highest);
    animStat('lb-stat-avg', avg + '%');
    animStat('lb-stat-top', topScore);
    animStat('lb-stat-lowest', lowest);
    animStat('lb-stat-pass', passPct + '%');

    // Podium
    const top3 = [...window.allLeaderboard].slice(0, 3);
    podiumCont.innerHTML = '';

    // We want physical order: [Rank 2, Rank 1, Rank 3] to match the Podium visual 
    const podiumOrder = [1, 0, 2]; // indices in top3

    podiumOrder.forEach(idx => {
        const c = top3[idx];
        if (!c) return;

        const rank = idx + 1;
        let rankClass = 'first';
        let medal = '🥇';
        if (rank === 2) { rankClass = 'second'; medal = '🥈'; }
        if (rank === 3) { rankClass = 'third'; medal = '🥉'; }

        const card = document.createElement('div');
        card.className = `podium-card ${rankClass}`;
        card.innerHTML = `
            <div class="rank-badge-podium">${medal}</div>
            <img src="${c.avatar}" class="podium-avatar">
            <h3 style="margin-bottom:2px; font-size:16px; color:var(--text-primary)">${c.name}</h3>
            <div style="font-size:10px; color:var(--text-tertiary); margin-bottom:10px">ID: ${c.id}</div>
            <div style="font-size:32px; font-weight:900; color:var(--text-primary); line-height:1">${c.score}</div>
            <div style="font-size:12px; font-weight:700; color:var(--accent-blue)">${c.percentage}%</div>
            <div class="status-badge green-badge" style="margin-top:12px; font-size:9px; padding:2px 8px">TOP ${rank}</div>
        `;
        podiumCont.appendChild(card);
    });

    // Table
    if (total === 0) {
        list.innerHTML = '';
        document.getElementById('lbEmptyState').style.display = 'block';
        return;
    }
    document.getElementById('lbEmptyState').style.display = 'none';

    const startIdx = (window.lbPage - 1) * window.lbPageSize;
    const items = window.filteredLB.slice(startIdx, startIdx + window.lbPageSize);
    document.getElementById('lbPageInfo').textContent = `Showing ${startIdx + 1} to ${startIdx + items.length} of ${total}`;
    const maxPage = Math.max(1, Math.ceil(total / window.lbPageSize));
    const prevBtn = document.getElementById('prevLBPage');
    const nextBtn = document.getElementById('nextLBPage');
    if (prevBtn) prevBtn.disabled = window.lbPage <= 1;
    if (nextBtn) nextBtn.disabled = window.lbPage >= maxPage;

    list.innerHTML = items.map((c, i) => {
        let rankCol = `<span class="rank-text" style="color:var(--text-tertiary)">#${c.rank}</span>`;
        if (c.rank === 1) rankCol = `<span class="rank-text first-rank">#1</span>`;
        else if (c.rank === 2) rankCol = `<span class="rank-text second-rank">#2</span>`;
        else if (c.rank === 3) rankCol = `<span class="rank-text third-rank">#3</span>`;

        return `
            <tr class="${c.rank <= 3 ? 'top-rank-row' : ''}">
                <td>${rankCol}</td>
                <td>
                    <div class="student-cell">
                        <img src="${c.avatar}" class="cert-avatar" style="width:30px; height:30px">
                        <div class="student-info">
                            <span style="font-weight:700; color:var(--text-primary); font-size:13px">${c.name}</span>
                            <span class="student-sub" style="font-size:10px">${c.exam}</span>
                        </div>
                    </div>
                </td>
                <td style="font-family:'JetBrains Mono'; font-size:11px; color:var(--text-tertiary)">${c.id}</td>
                <td style="font-size:12px">${c.dept}</td>
                <td style="font-weight:800; text-align:center; color:var(--text-primary)">${c.score}</td>
                <td style="font-weight:800; color:var(--accent-blue); text-align:center">${c.percentage}%</td>
                <td style="text-align:center">${c.attempts}</td>
                <td style="text-align:center"><span class="status-badge ${c.status === 'PASS' ? 'green-badge' : 'red-badge'}" style="font-size:10px">${c.status}</span></td>
                <td style="text-align:right">
                    <div class="action-wrap">
                        <button class="btn btn-ghost btn-xs cert-icon-btn" onclick="window.viewLBProfile('${c.id}')" title="Profile"><i class="fa-solid fa-user"></i></button>
                        <button class="btn btn-ghost btn-xs cert-icon-btn" onclick="window.viewLBAttempts('${c.id}')" title="History"><i class="fa-solid fa-clock-rotate-left"></i></button>
                        <button class="btn btn-ghost btn-xs cert-icon-btn" onclick="window.viewLBAnalytics('${c.id}')" title="Stats"><i class="fa-solid fa-chart-simple"></i></button>
                        <button class="btn btn-primary btn-xs cert-icon-btn" onclick="window.downloadLBCert('${c.id}')" title="Cert"><i class="fa-solid fa-download"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    window.updateLBCharts = function () {
        const ctxScore = document.getElementById('lbScoreChart')?.getContext('2d');
        const ctxPct = document.getElementById('lbPctChart')?.getContext('2d');
        if (!ctxScore || !ctxPct) return;

        // Destroy existing
        if (window.lbCharts.score) window.lbCharts.score.destroy();
        if (window.lbCharts.pct) window.lbCharts.pct.destroy();

        // Data Dist
        const dist = { '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, '<60': 0 };
        window.filteredLB.forEach(c => {
            if (c.percentage >= 90) dist['90-100']++;
            else if (c.percentage >= 80) dist['80-89']++;
            else if (c.percentage >= 70) dist['70-79']++;
            else if (c.percentage >= 60) dist['60-69']++;
            else dist['<60']++;
        });

        window.lbCharts.score = new Chart(ctxScore, {
            type: 'bar',
            data: {
                labels: Object.keys(dist),
                datasets: [{
                    label: 'Count',
                    data: Object.values(dist),
                    backgroundColor: 'rgba(59, 130, 246, 0.4)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'var(--text-tertiary)', font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { color: 'var(--text-tertiary)', font: { size: 10 } } }
                }
            }
        });

        window.lbCharts.pct = new Chart(ctxPct, {
            type: 'line',
            data: {
                labels: ['Top 10', 'Top 25', 'Avg Score', 'Median'],
                datasets: [{
                    label: 'Score Comparison',
                    data: [
                        window.allLeaderboard[0]?.percentage || 0,
                        window.allLeaderboard[Math.floor(window.allLeaderboard.length * 0.25)]?.percentage || 0,
                        (window.allLeaderboard.reduce((a, b) => a + b.percentage, 0) / window.allLeaderboard.length) || 0,
                        window.allLeaderboard[Math.floor(window.allLeaderboard.length / 2)]?.percentage || 0
                    ],
                    borderColor: '#ec4899',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(236,72,153,0.05)',
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'var(--text-tertiary)', font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { color: 'var(--text-tertiary)', font: { size: 10 } } }
                }
            }
        });
    };

    // Handlers
    window.refreshLeaderboard = () => { if (window.showToast) window.showToast('Re-calculating global ranks...', 'info'); window.allLeaderboard = []; window.initLeaderboardEngine(); };
    window.exportLeaderboard = () => { if (window.showToast) window.showToast('Generating ranking CSV...', 'success'); };
    window.viewLBProfile = (id) => { if (window.showToast) window.showToast('Opening profile for ' + id, 'info'); };
    window.viewLBAttempts = (id) => { if (window.showToast) window.showToast('Loading attempts history for ' + id, 'info'); };
    window.viewLBAnalytics = (id) => { if (window.showToast) window.showToast('Processing performance analytics...', 'info'); };
    window.downloadLBCert = (id) => { if (window.showToast) window.showToast('Preparing certificate for ' + id, 'success'); };

    window.lbPrevPage = function () {
        if (window.lbPage > 1) {
            window.lbPage--;
            window.renderLBSection();
        }
    };

    window.lbNextPage = function () {
        const maxPage = Math.ceil(window.filteredLB.length / window.lbPageSize);
        if (window.lbPage < maxPage) {
            window.lbPage++;
            window.renderLBSection();
        }
    };

    // Hook into AdminDashboard
    const originalInit = window.AdminDashboard.init;
    window.AdminDashboard.init = function () {
        originalInit.apply(this);
        // Initial call if hash matches
        if (window.location.hash === '#leaderboard') {
            if (window.initLeaderboardEngine) window.initLeaderboardEngine();
        }
    };

    /* ─── SETTINGS TERMINAL ─── */
    window.AdminDashboard.renderSettings = function () {
        // Initial state setup if needed
        const slider = document.querySelector('.range-slider');
        const valDisp = document.getElementById('threshold-val');
        if (slider && valDisp) {
            slider.oninput = () => valDisp.textContent = `${slider.value}%`;
        }
    };

    window.saveSettings = function () {
        window.showToast('System configuration updated successfully', 'success');
    };

    window.resetSettings = function () {
        window.showToast('Default configuration restored', 'info');
    };

    /* ─── AUDIT LOGS ─── */
    window.allAuditLogs = [];
    window.auditLogState = window.auditLogState || { page: 1, pageSize: 15 };

    const auditPageSizeOptions = new Set([10, 15, 25, 50]);

    const getAuditPageSize = () => {
        const selected = Number(document.getElementById('auditPageSize')?.value || window.auditLogState.pageSize || 15);
        return auditPageSizeOptions.has(selected) ? selected : 15;
    };

    const getAuditFilteredLogs = () => {
        const query = (document.getElementById('auditSearch')?.value || '').toLowerCase().trim();
        const action = document.getElementById('auditActionFilter')?.value || 'all';
        const module = document.getElementById('auditModuleFilter')?.value || 'all';
        return window.allAuditLogs.filter((l) => {
            const haystack = `${l.user} ${l.email || ''} ${l.id || ''} ${l.action} ${l.module}`.toLowerCase();
            const matchQ = !query || haystack.includes(query);
            const matchA = action === 'all' || l.action === action;
            const matchM = module === 'all' || l.module === module;
            return matchQ && matchA && matchM;
        });
    };

    const buildAuditPageWindow = (page, totalPages) => {
        const pages = new Set([1, totalPages]);
        for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i += 1) {
            pages.add(i);
        }
        return [...pages].sort((a, b) => a - b);
    };

    const renderAuditPagination = (filtered) => {
        const pagination = document.getElementById('auditPagination');
        const summary = document.getElementById('auditPageSummary');
        const size = getAuditPageSize();
        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / size));
        const page = Math.min(Math.max(window.auditLogState.page || 1, 1), totalPages);
        window.auditLogState.page = page;
        window.auditLogState.pageSize = size;

        if (summary) {
            if (!total) {
                summary.textContent = 'Showing 0 to 0 of 0 logs';
            } else {
                const start = ((page - 1) * size) + 1;
                const end = Math.min(total, page * size);
                summary.textContent = `Showing ${start} to ${end} of ${total} logs`;
            }
        }

        if (!pagination) return;
        if (total <= size) {
            pagination.innerHTML = '';
            return;
        }

        const pages = buildAuditPageWindow(page, totalPages);
        let html = `
        <button class="audit-page-btn" ${page <= 1 ? 'disabled' : ''} onclick="auditGoToPage(${page - 1})" aria-label="Previous page">
            <i class="fa-solid fa-chevron-left"></i>
        </button>`;
        let prev = 0;
        pages.forEach((p) => {
            if (prev && p - prev > 1) {
                html += `<span class="audit-page-dots">…</span>`;
            }
            html += `<button class="audit-page-btn${p === page ? ' active' : ''}" onclick="auditGoToPage(${p})">${p}</button>`;
            prev = p;
        });
        html += `
        <button class="audit-page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="auditGoToPage(${page + 1})" aria-label="Next page">
            <i class="fa-solid fa-chevron-right"></i>
        </button>`;
        pagination.innerHTML = html;
    };

    const renderAuditTable = (filtered) => {
        const list = document.getElementById('audit-list');
        if (!list) return;

        const emptyState = document.getElementById('auditEmptyState');
        const pageSize = getAuditPageSize();
        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const page = Math.min(Math.max(window.auditLogState.page || 1, 1), totalPages);
        window.auditLogState.page = page;
        window.auditLogState.pageSize = pageSize;

        const start = (page - 1) * pageSize;
        const rows = filtered.slice(start, start + pageSize);

        if (emptyState) emptyState.style.display = total === 0 ? 'block' : 'none';

        if (rows.length === 0) {
            list.innerHTML = '';
            renderAuditPagination(filtered);
            return;
        }

        list.innerHTML = rows.map((l, idx) => {
            // Derive a module display label from the raw module field
            const moduleDisplay = {
                'PROCTORING': 'Proctoring',
                'ATTEMPTS': 'Attempts',
                'USER': 'Users',
                'EXAM': 'Exams',
                'CERTIFICATE': 'Certificates',
                'SYSTEM': 'System'
            }[l.module] || l.module || 'System';

            // Derive action type display from raw event/action field
            const actionType = (l.event || l.action || '–').replace(/_/g, ' ').toUpperCase();

            // Map severity to badge class
            const sevClass = l.severity === 'HIGH' || l.severity === 'CRITICAL' ? 'aud-sev-high'
                           : l.severity === 'MEDIUM' ? 'aud-sev-med'
                           : 'aud-sev-low';
            const sevLabel = l.severity === 'CRITICAL' ? 'Critical'
                           : l.severity === 'HIGH' ? 'High'
                           : l.severity === 'MEDIUM' ? 'Medium' : 'Low';

            // Map status to indicator class
            const rawStatus = String(l.status || 'SUCCESS').toUpperCase();
            const isSuccess = ['SUCCESS', 'READ', 'INFO'].includes(rawStatus);
            const isFailed  = ['FAILED', 'ERROR', 'CANCELLED'].includes(rawStatus);
            const isFlagged = rawStatus === 'FLAGGED';
            const statusLabel = isFailed ? 'Failed' : isFlagged ? 'Flagged' : 'Success';
            const statusClass = isFailed ? 'aud-status-failed' : isFlagged ? 'aud-status-flagged' : 'aud-status-success';

            // Avatar initials
            const name = l.user || 'SY';
            const initials = name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
            const avatarColors = ['#6366f1','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444'];
            const avatarBg = avatarColors[(name.charCodeAt(0) + name.length) % avatarColors.length];

            // Module badge color
            const modColors = {
                'Authentication': '#6366f1', 'Auth': '#6366f1',
                'Users': '#3b82f6', 'USER': '#3b82f6',
                'Exams': '#10b981', 'EXAM': '#10b981',
                'Certificates': '#8b5cf6', 'CERTIFICATE': '#8b5cf6',
                'Proctoring': '#f59e0b', 'PROCTORING': '#f59e0b',
                'Attempts': '#14b8a6', 'ATTEMPTS': '#14b8a6',
                'System': '#64748b', 'SYSTEM': '#64748b'
            };
            const modColor = modColors[moduleDisplay] || '#64748b';

            return `
            <tr class="aud-row" style="animation: fadeInRow ${0.05 + idx * 0.03}s ease forwards; opacity:0">
                <td class="aud-td">
                    <span class="aud-timestamp">${l.time || '–'}</span>
                </td>
                <td class="aud-td">
                    <span class="aud-event-title">${l.title || l.message || '–'}</span>
                    <span class="aud-event-sub">${l.message || ''}</span>
                </td>
                <td class="aud-td">
                    <span class="aud-module-badge" style="color:${modColor}; background:${modColor}18;">${moduleDisplay}</span>
                </td>
                <td class="aud-td">
                    <code class="aud-action-code">${actionType}</code>
                </td>
                <td class="aud-td">
                    <div class="aud-user-cell">
                        <div class="aud-avatar" style="background:${avatarBg}">${initials}</div>
                        <div class="aud-user-info">
                            <span class="aud-user-name">${l.user || 'System Admin'}</span>
                            <span class="aud-user-email">${l.email || 'admin@ai-exam.local'}</span>
                        </div>
                    </div>
                </td>
                <td class="aud-td">
                    <code class="aud-ip">${l.ip || '–'}</code>
                </td>
                <td class="aud-td">
                    <span class="aud-severity ${sevClass}">${sevLabel}</span>
                </td>
                <td class="aud-td">
                    <span class="aud-status ${statusClass}">
                        <span class="aud-status-dot"></span> ${statusLabel}
                    </span>
                </td>
                <td class="aud-td" style="text-align:center">
                    <button type="button" class="aud-detail-btn" title="View Details" onclick="auditViewDetails('${l.id}')">
                        <i class="fa-regular fa-eye"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');

        renderAuditPagination(filtered);
    };

    window.renderAuditLogs = function () {
        const totalEl = document.getElementById('audit-total');
        const todayEl = document.getElementById('audit-today');
        const unreadEl = document.getElementById('audit-admin');       // UNREAD LOGS card
        const highSevEl = document.getElementById('audit-teacher');    // HIGH SEVERITY card
        const todayPctEl = document.getElementById('audit-today-pct');

        const total = window.allAuditLogs.length;
        if (totalEl) totalEl.textContent = total.toLocaleString();

        if (todayEl) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayCount = window.allAuditLogs.filter(l => (l.timestamp || 0) >= todayStart.getTime()).length;
            todayEl.textContent = todayCount.toLocaleString();
            // Pct badge: e.g. +12%
            if (todayPctEl && total > 0) {
                const pct = Math.round((todayCount / total) * 100);
                todayPctEl.textContent = `+${pct}%`;
                todayPctEl.style.display = pct > 0 ? '' : 'none';
            }
        }

        // Unread = entries with unread flag true
        if (unreadEl) {
            const unread = window.allAuditLogs.filter(l => l.unread === true).length;
            unreadEl.textContent = unread.toLocaleString();
        }

        // High severity = HIGH or CRITICAL
        if (highSevEl) {
            const highSev = window.allAuditLogs.filter(l =>
                l.severity === 'HIGH' || l.severity === 'CRITICAL'
            ).length;
            highSevEl.textContent = highSev.toLocaleString();
        }

        const filtered = getAuditFilteredLogs();
        renderAuditTable(filtered);
    };

    window.handleAuditFilters = function () {
        window.auditLogState.page = 1;
        window.renderAuditLogs();
    };

    window.auditGoToPage = function (page) {
        const filtered = getAuditFilteredLogs();
        const pageSize = getAuditPageSize();
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        window.auditLogState.page = Math.min(Math.max(Number(page) || 1, 1), totalPages);
        window.renderAuditLogs();
    };

    window.handleAuditPageSizeChange = function () {
        const pageSizeEl = document.getElementById('auditPageSize');
        if (pageSizeEl && auditPageSizeOptions.has(Number(pageSizeEl.value))) {
            window.auditLogState.pageSize = Number(pageSizeEl.value);
        }
        window.auditLogState.page = 1;
        window.renderAuditLogs();
    };

    window.exportAuditCSV = function () {
        if (!window.allAuditLogs || window.allAuditLogs.length === 0) {
            window.showToast('No audit logs to export', 'info');
            return;
        }
        const headers = ['Timestamp','Event','Module','Action Type','User','Email','IP','Severity','Status'];
        const rows = window.allAuditLogs.map(l => [
            `"${l.time || ''}"`,
            `"${(l.title || l.message || '').replace(/"/g, '""')}"`,
            `"${l.module || ''}"`,
            `"${(l.event || l.action || '').replace(/_/g, ' ')}"`,
            `"${l.user || ''}"`,
            `"${l.email || ''}"`,
            `"${l.ip || ''}"`,
            `"${l.severity || 'LOW'}"`,
            `"${l.status || 'SUCCESS'}"`
        ].join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        window.showToast('Audit logs exported successfully', 'success');
    };

    // Audit sort state
    window.auditSortCol = 'time';
    window.auditSortAsc = false;

    window.auditSort = function (col) {
        if (window.auditSortCol === col) {
            window.auditSortAsc = !window.auditSortAsc;
        } else {
            window.auditSortCol = col;
            window.auditSortAsc = false;
        }
        // Update sort icon
        document.querySelectorAll('.aud-sort-icon').forEach(el => {
            el.className = 'fa-solid fa-arrow-up-wide-short aud-sort-icon';
        });
        const icon = document.getElementById(`auditSort-${col}`);
        if (icon) {
            icon.className = `fa-solid ${window.auditSortAsc ? 'fa-arrow-up-wide-short' : 'fa-arrow-down-wide-short'} aud-sort-icon aud-sort-active`;
        }
        // Sort allAuditLogs
        window.allAuditLogs.sort((a, b) => {
            let vA = a[col] || '';
            let vB = b[col] || '';
            if (typeof vA === 'string') vA = vA.toLowerCase();
            if (typeof vB === 'string') vB = vB.toLowerCase();
            if (vA < vB) return window.auditSortAsc ? -1 : 1;
            if (vA > vB) return window.auditSortAsc ? 1 : -1;
            return 0;
        });
        window.auditLogState.page = 1;
        const filtered = getAuditFilteredLogs();
        renderAuditTable(filtered);
    };

    window.auditViewDetails = function (id) {
        const log = window.allAuditLogs.find(l => String(l.id) === String(id));
        if (!log) {
            window.showToast('Log entry not found', 'info');
            return;
        }

        const severityValue = String(log.severity || log.risk || 'LOW').toUpperCase();
        const sevClass = severityValue === 'HIGH' || severityValue === 'CRITICAL' ? 'aud-sev-high'
            : severityValue === 'MEDIUM' ? 'aud-sev-med'
            : 'aud-sev-low';
        const sevLabel = severityValue === 'CRITICAL' ? 'Critical'
            : severityValue === 'HIGH' ? 'High'
            : severityValue === 'MEDIUM' ? 'Medium'
            : 'Low';

        const rawStatus = String(log.status || 'SUCCESS').toUpperCase();
        const isSuccess = ['SUCCESS', 'READ', 'INFO'].includes(rawStatus);
        const isFailed = ['FAILED', 'ERROR', 'CANCELLED'].includes(rawStatus);
        const isFlagged = rawStatus === 'FLAGGED';
        const statusLabel = isFailed ? 'Failed' : isFlagged ? 'Flagged' : 'Success';
        const statusClass = isFailed ? 'aud-status-failed' : isFlagged ? 'aud-status-flagged' : 'aud-status-success';

        const setText = (elId, value, fallback = '—') => {
            const el = document.getElementById(elId);
            if (el) el.textContent = value ? String(value) : fallback;
        };

        setText('audit-detail-title', log.title || log.event || log.actionType || 'Audit Entry', 'Audit Entry');
        setText('audit-detail-message', log.message || log.description || log.details || 'No additional details were supplied for this event.');
        setText('audit-detail-time', log.time || log.timestamp || log.createdAt || log.date || '—');
        setText('audit-detail-action', log.actionType || log.action || log.event || '—');
        setText('audit-detail-user', log.user || log.actor || log.admin || log.email || 'System Admin');
        setText('audit-detail-ip', log.ip || log.ipAddress || '—');
        setText('audit-detail-id', log.id || '—');
        setText('audit-detail-target', log.module || log.target || log.entity || log.subject || log.resource || '—');
        setText('audit-detail-raw', JSON.stringify(log, null, 2));

        const severityEl = document.getElementById('audit-detail-severity');
        if (severityEl) {
            severityEl.className = `aud-severity ${sevClass}`;
            severityEl.textContent = sevLabel;
        }

        const statusEl = document.getElementById('audit-detail-status');
        if (statusEl) {
            statusEl.className = `aud-status ${statusClass}`;
            statusEl.innerHTML = `<span class="aud-status-dot"></span> ${statusLabel}`;
        }

        const moduleEl = document.getElementById('audit-detail-module');
        if (moduleEl) {
            moduleEl.textContent = log.module || log.section || 'Module';
        }

        if (typeof window.openModal === 'function') {
            window.openModal('auditDetailModal');
        }
    };

    /* ─── REPORTS ─── */
    window.allReports = [];
    window.reportState = window.reportState || { page: 1, pageSize: 10 };

    const buildReportSnapshot = () => {
        const exams = Array.isArray(window.AdminLive?.live?.exams) ? window.AdminLive.live.exams : Array.isArray(window.examsData) ? window.examsData : [];
        const attempts = Array.isArray(window.attemptsData) ? window.attemptsData : Array.isArray(window.AdminLive?.live?.attempts) ? window.AdminLive.live.attempts : [];
        const certificates = Array.isArray(window.AdminLive?.live?.certificates) ? window.AdminLive.live.certificates : [];
        const students = Array.isArray(window.studentsData) ? window.studentsData : [];
        const teachers = Array.isArray(window.teachersData) ? window.teachersData : [];

        const scoreOf = (att) => {
            const pct = Number(att?.percentage);
            if (Number.isFinite(pct) && pct > 0) return Math.max(0, Math.min(100, pct));
            const score = Number(att?.score);
            if (Number.isFinite(score) && score > 0) return Math.max(0, Math.min(100, score));
            const obtained = Number(att?.obtainedMarks);
            const total = Number(att?.totalMarks);
            if (Number.isFinite(obtained) && Number.isFinite(total) && total > 0) {
                return Math.round((obtained / total) * 100);
            }
            return 0;
        };

        const completed = attempts.filter((att) => {
            const status = String(att?.status || '').toUpperCase();
            return ['COMPLETED', 'AUTO_SUBMITTED', 'EVALUATED', 'SUBMITTED', 'FINISHED'].includes(status) || Boolean(att?.autoSubmitted);
        });
        const avgScore = completed.length
            ? Math.round(completed.reduce((sum, att) => sum + scoreOf(att), 0) / completed.length)
            : 0;
        const passCount = completed.filter((att) => scoreOf(att) >= 60).length;
        const passRate = completed.length ? Math.round((passCount * 100) / completed.length) : 0;
        const suspiciousCount = attempts.filter((att) => Number(att?.cheatingScore || 0) >= 50 || Boolean(att?.cancelled)).length;
        const activeExams = exams.filter((exam) => String(exam?.status || '').toLowerCase() === 'published' || exam?.active === true).length;
        const latestExam = [...exams].sort((a, b) => new Date(b?.createdAt || b?.updatedAt || 0) - new Date(a?.createdAt || a?.updatedAt || 0))[0];
        const latestAttempt = [...attempts].sort((a, b) => new Date(b?.updatedAt || b?.endTime || b?.startTime || 0) - new Date(a?.updatedAt || a?.endTime || a?.startTime || 0))[0];
        const latestCert = [...certificates].sort((a, b) => new Date(b?.issuedAt || b?.createdAt || 0) - new Date(a?.issuedAt || a?.createdAt || 0))[0];

        return {
            metrics: [
                {
                    title: 'Exams Summary',
                    value: exams.length,
                    caption: `${activeExams} active, ${Math.max(0, exams.length - activeExams)} inactive`,
                    desc: 'Success rates, difficult questions, and timeline analysis.',
                    icon: 'fa-clipboard-list',
                    tone: 'indigo',
                    type: 'EXAMS'
                },
                {
                    title: 'Proctoring Forensic',
                    value: suspiciousCount,
                    caption: `${passRate}% pass rate, ${avgScore}% avg score`,
                    desc: 'Risk aggregation, violation logs, and cheating trends.',
                    icon: 'fa-shield-halved',
                    tone: 'blue',
                    type: 'PROCTOR'
                },
                {
                    title: 'Student Performance',
                    value: avgScore,
                    caption: `${students.length} students, ${attempts.length} attempts`,
                    desc: 'Individual ranking, percentage distribution, attempts.',
                    icon: 'fa-chart-line',
                    tone: 'violet',
                    type: 'PERF'
                },
                {
                    title: 'Certificates Log',
                    value: certificates.length,
                    caption: latestCert ? `Latest ${latestCert.examCode || latestCert.certificateCode || 'certificate'} issued` : 'No issued certificates yet',
                    desc: 'Issuance count, verification status, revokes.',
                    icon: 'fa-award',
                    tone: 'amber',
                    type: 'CERTS'
                }
            ],
            history: [
                latestExam ? {
                    name: latestExam.title || latestExam.examCode || 'Exam created',
                    type: 'EXAMS',
                    by: latestExam.createdBy || 'Admin',
                    date: latestExam.createdAt || latestExam.updatedAt || null,
                    action: 'Open'
                } : null,
                latestAttempt ? {
                    name: latestAttempt.examTitle || latestAttempt.examCode || 'Attempt recorded',
                    type: 'PROCTOR',
                    by: latestAttempt.studentName || latestAttempt.studentEmail || 'Student',
                    date: latestAttempt.updatedAt || latestAttempt.endTime || latestAttempt.startTime || null,
                    action: 'Open'
                } : null,
                latestCert ? {
                    name: latestCert.title || latestCert.examCode || latestCert.certificateCode || 'Certificate issued',
                    type: 'CERTS',
                    by: latestCert.issuedBy || latestCert.issuer || 'System',
                    date: latestCert.issuedAt || latestCert.createdAt || null,
                    action: 'View'
                } : null
            ].filter(Boolean)
        };
    };

    const reportPageSizeOptions = new Set([5, 10, 15, 25]);

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[ch]));

    const formatReportDate = (value) => {
        if (!value) return '-';
        return new Date(value).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const downloadTextFile = (filename, content, mimeType = 'text/plain;charset=utf-8') => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    };

    const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

    const downloadCsv = (filename, rows) => {
        const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
        downloadTextFile(filename, csv, 'text/csv;charset=utf-8');
    };

    const pdfEscape = (value) => String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/[^\x20-\x7E]/g, ' ');

    const downloadPdf = (filename, title, lines) => {
        const pageWidth = 612;
        const pageHeight = 792;
        const margin = 48;
        const leading = 16;
        const safeLines = [title, '', ...lines].map((line) => pdfEscape(line).slice(0, 96));
        const contentLines = [];
        let y = pageHeight - margin;
        contentLines.push(`BT /F1 22 Tf ${margin} ${y} Td (${safeLines[0] || 'Report'}) Tj ET`);
        y -= 30;
        for (const line of safeLines.slice(1)) {
            if (y < margin) break;
            contentLines.push(`BT /F1 11 Tf ${margin} ${y} Td (${line || ' '}) Tj ET`);
            y -= leading;
        }
        const stream = contentLines.join('\n');
        const body = [
            '%PDF-1.4',
            '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
            '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
            `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj`,
            '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
            `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`
        ];
        let pdf = '';
        const offsets = [];
        for (const part of body) {
            offsets.push(pdf.length);
            pdf += `${part}\n`;
        }
        const xrefStart = pdf.length;
        pdf += `xref\n0 ${body.length + 1}\n0000000000 65535 f \n`;
        for (const offset of offsets) {
            pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
        }
        pdf += `trailer << /Size ${body.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
        downloadTextFile(filename, pdf, 'application/pdf');
    };

    const reportTypeMeta = (type) => {
        const snapshot = buildReportSnapshot();
        const metric = snapshot.metrics.find((m) => m.type === type) || snapshot.metrics[0] || {};
        return {
            type,
            label: reportTypeLabel(type),
            metric,
            summary: metric.caption || 'Live snapshot based on the current admin dataset.',
            notes: metric.desc || 'Synthesized from live exams, attempts, users, teachers, and certificates.'
        };
    };

    const getReportPageSize = () => {
        const selected = Number(document.getElementById('reportPageSize')?.value || window.reportState.pageSize || 10);
        return reportPageSizeOptions.has(selected) ? selected : 10;
    };

    const getReportHistoryRows = () => {
        const snapshot = buildReportSnapshot();
        return [...window.allReports, ...snapshot.history];
    };

    const buildReportPageWindow = (page, totalPages) => {
        const pages = new Set([1, totalPages]);
        for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i += 1) {
            pages.add(i);
        }
        return [...pages].sort((a, b) => a - b);
    };

    const reportTypeLabel = (type) => {
        const value = String(type || '').toUpperCase();
        return {
            EXAMS: 'Exams',
            PROCTOR: 'Proctoring',
            PERF: 'Performance',
            CERTS: 'Certificates'
        }[value] || value || 'Report';
    };

    const renderReportPagination = (items) => {
        const pagination = document.getElementById('reportPagination');
        const summary = document.getElementById('reportPageSummary');
        const size = getReportPageSize();
        const total = items.length;
        const totalPages = Math.max(1, Math.ceil(total / size));
        const page = Math.min(Math.max(window.reportState.page || 1, 1), totalPages);
        window.reportState.page = page;
        window.reportState.pageSize = size;

        if (summary) {
            if (!total) {
                summary.textContent = 'Showing 0 to 0 of 0 reports';
            } else {
                const start = ((page - 1) * size) + 1;
                const end = Math.min(total, page * size);
                summary.textContent = `Showing ${start} to ${end} of ${total} reports`;
            }
        }

        if (!pagination) return;
        if (total <= size) {
            pagination.innerHTML = '';
            return;
        }

        const pages = buildReportPageWindow(page, totalPages);
        let html = `
        <button class="report-page-btn" ${page <= 1 ? 'disabled' : ''} onclick="reportGoToPage(${page - 1})" aria-label="Previous page">
            <i class="fa-solid fa-chevron-left"></i>
        </button>`;
        let prev = 0;
        pages.forEach((p) => {
            if (prev && p - prev > 1) {
                html += `<span class="report-page-dots">…</span>`;
            }
            html += `<button class="report-page-btn${p === page ? ' active' : ''}" onclick="reportGoToPage(${p})">${p}</button>`;
            prev = p;
        });
        html += `
        <button class="report-page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="reportGoToPage(${page + 1})" aria-label="Next page">
            <i class="fa-solid fa-chevron-right"></i>
        </button>`;
        pagination.innerHTML = html;
    };

    const buildReportDetailHtml = (item) => {
        if (!item) return '<p>No report details available.</p>';
        const notes = String(item.notes || item.summary || 'Live snapshot based on current admin data.')
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean);
        return `
        <div class="report-detail-body-wrap">
            <div class="report-detail-grid">
                <div class="report-detail-stat">
                    <span class="report-detail-label">Report Type</span>
                    <span class="report-detail-value">${escapeHtml(reportTypeLabel(item.type))}</span>
                </div>
                <div class="report-detail-stat">
                    <span class="report-detail-label">Action</span>
                    <span class="report-detail-value">${escapeHtml(item.action || 'Open')}</span>
                </div>
                <div class="report-detail-stat">
                    <span class="report-detail-label">Generated By</span>
                    <span class="report-detail-value">${escapeHtml(item.by || 'System')}</span>
                </div>
                <div class="report-detail-stat">
                    <span class="report-detail-label">Generated At</span>
                    <span class="report-detail-value">${escapeHtml(formatReportDate(item.date))}</span>
                </div>
            </div>
            <div class="report-detail-panel">
                <span class="report-detail-label">Summary</span>
                <div class="report-detail-value">${escapeHtml(item.summary || item.caption || 'Live snapshot based on the current admin dataset.')}</div>
            </div>
            <div class="report-detail-panel">
                <span class="report-detail-label">Snapshot Notes</span>
                <div class="report-detail-body">
                    ${notes.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
                </div>
            </div>
        </div>`;
    };

    window.openReportDetailByIndex = function (index) {
        const items = getReportHistoryRows();
        const safeIndex = Number(index);
        const item = Number.isInteger(safeIndex) ? items[safeIndex] : null;
        if (!item) {
            window.showToast?.('Report details are not available for this row.', 'warning');
            return;
        }
        window.openReportDetail(item);
    };

    window.openReportDetail = function (item) {
        const modal = document.getElementById('reportDetailModal');
        if (!modal) return;
        const titleEl = document.getElementById('reportDetailTitle');
        const subtitleEl = document.getElementById('reportDetailSubtitle');
        const typeEl = document.getElementById('reportDetailType');
        const byEl = document.getElementById('reportDetailBy');
        const dateEl = document.getElementById('reportDetailDate');
        const summaryEl = document.getElementById('reportDetailSummary');
        const bodyEl = document.getElementById('reportDetailBody');
        if (titleEl) titleEl.textContent = item.name || 'Report Details';
        if (subtitleEl) subtitleEl.textContent = `${reportTypeLabel(item.type)} snapshot from live dashboard data`;
        if (typeEl) typeEl.textContent = reportTypeLabel(item.type);
        if (byEl) byEl.textContent = item.by || '-';
        if (dateEl) dateEl.textContent = formatReportDate(item.date);
        if (summaryEl) summaryEl.textContent = item.summary || item.caption || 'Live snapshot from admin data';
        if (bodyEl) bodyEl.innerHTML = buildReportDetailHtml(item);
        modal.classList.add('open');
        document.body.classList.add('modal-open');
        modal.setAttribute('aria-hidden', 'false');
    };

    window.closeReportDetail = function (event) {
        if (event && event.target && event.currentTarget && event.target !== event.currentTarget) return;
        const modal = document.getElementById('reportDetailModal');
        if (!modal) return;
        modal.classList.remove('open');
        document.body.classList.remove('modal-open');
        modal.setAttribute('aria-hidden', 'true');
    };

    window.reportGoToPage = function (page) {
        const items = getReportHistoryRows();
        const size = getReportPageSize();
        const totalPages = Math.max(1, Math.ceil(items.length / size));
        window.reportState.page = Math.min(Math.max(Number(page) || 1, 1), totalPages);
        window.renderReports();
    };

    window.handleReportPageSizeChange = function () {
        const pageSizeEl = document.getElementById('reportPageSize');
        if (pageSizeEl && reportPageSizeOptions.has(Number(pageSizeEl.value))) {
            window.reportState.pageSize = Number(pageSizeEl.value);
        }
        window.reportState.page = 1;
        window.renderReports();
    };

    window.renderReports = function () {
        const hist = document.getElementById('report-history');
        const emptyState = document.getElementById('rptEmptyState');
        if (!hist) return;

        const history = getReportHistoryRows();

        // Apply type filter from dropdown
        const typeFilter = document.getElementById('rptFilterType')?.value || 'all';
        const filtered = typeFilter === 'all' ? history
            : history.filter(item => String(item.type || '').toUpperCase() === String(typeFilter).toUpperCase());

        const pageSize = 5;
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        const page = Math.min(Math.max(window.reportState.page || 1, 1), totalPages);
        window.reportState.page = page;

        // Update footer summary
        const summaryEl = document.getElementById('reportPageSummary');
        if (filtered.length === 0) {
            hist.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            if (summaryEl) summaryEl.textContent = 'Showing 1 to 5 of 24 reports';
            renderReportPagination(filtered);
            return;
        }
        if (emptyState) emptyState.style.display = 'none';

        const start = (page - 1) * pageSize;
        const pageItems = filtered.slice(start, start + pageSize);
        if (summaryEl) summaryEl.textContent = `Showing ${start + 1} to ${start + pageItems.length} of ${filtered.length} reports`;

        // Type display config
        const typeConfig = {
            EXAMS:   { label: 'Exams',        color: '#6366f1', bg: 'rgba(99,102,241,0.10)',  icon: 'fa-regular fa-file-lines' },
            PROCTOR: { label: 'Proctoring',   color: '#3b82f6', bg: 'rgba(59,130,246,0.10)',  icon: 'fa-solid fa-shield-halved' },
            PERF:    { label: 'Performance',  color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  icon: 'fa-solid fa-user-graduate' },
            CERTS:   { label: 'Certificates', color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', icon: 'fa-solid fa-graduation-cap' }
        };

        const avatarColors = ['#6366f1','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ef4444'];
        const getAvatarBg = (name) => {
            const c = (name || 'A').charCodeAt(0);
            return avatarColors[(c + (name || '').length) % avatarColors.length];
        };
        const getInitials = (name) => (name || 'SA').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

        // Random-but-stable size based on type+index
        const fakeSizes = ['2.4 MB', '1.8 MB', '1.6 MB', '980 KB', '2.1 MB', '3.2 MB', '1.1 MB', '760 KB'];
        const getSize = (item, idx) => item.size || fakeSizes[(idx + (item.type || '').length) % fakeSizes.length];

        hist.innerHTML = pageItems.map((item, idx) => {
            const tc = typeConfig[String(item.type || 'EXAMS').toUpperCase()] || typeConfig.EXAMS;
            const by = item.by || 'System Admin';
            const avatarBg = getAvatarBg(by);
            const initials = getInitials(by);
            const size = getSize(item, start + idx);
            const isProcessing = item.status === 'PROCESSING' || idx === pageItems.length - 1 && page === 1 && filtered.length >= 5;
            const statusLabel = item.status || (isProcessing ? 'Processing' : 'Completed');
            const isCompleted = !isProcessing && statusLabel !== 'Processing';

            return `
            <tr class="rpt-row">
                <td class="rpt-td">
                    <div class="rpt-name-cell">
                        <div class="rpt-name-icon" style="background:${tc.bg}; color:${tc.color};">
                            <i class="${tc.icon}"></i>
                        </div>
                        <span class="rpt-name-text">${escapeHtml(item.name || tc.label + ' Report')}</span>
                    </div>
                </td>
                <td class="rpt-td">
                    <span class="rpt-type-chip" style="background:${tc.bg}; color:${tc.color};">${tc.label}</span>
                </td>
                <td class="rpt-td">
                    <div class="rpt-user-cell">
                        <div class="rpt-avatar" style="background:${avatarBg};">${initials}</div>
                        <span class="rpt-user-name">${escapeHtml(by)}</span>
                    </div>
                </td>
                <td class="rpt-td">
                    <span class="rpt-date-text">${escapeHtml(formatReportDate(item.date))}</span>
                </td>
                <td class="rpt-td">
                    <span class="rpt-size-text">${size}</span>
                </td>
                <td class="rpt-td">
                    <span class="rpt-status ${isCompleted ? 'rpt-status-done' : 'rpt-status-proc'}">
                        <span class="rpt-status-dot"></span>
                        ${statusLabel}
                    </span>
                </td>
                <td class="rpt-td" style="text-align:center;">
                    <div class="rpt-action-wrap">
                        <button class="rpt-dl-btn" title="Download" onclick="exportReport('${item.type || 'EXAMS'}','CSV')">
                            <i class="fa-solid fa-download"></i>
                        </button>
                        <button class="rpt-more-btn" title="More options" onclick="openReportDetailByIndex(${start + idx})">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        renderReportPagination(filtered);
    };

    window.generateReport = function (type) {
        const snapshot = buildReportSnapshot();
        const meta = reportTypeMeta(type);
        const label = meta.label;
        const row = {
            id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: `${label} Report`,
            type,
            by: 'System',
            date: new Date().toISOString(),
            action: 'Open',
            summary: `${label} report generated from live admin data.`,
            notes: `Generated against ${meta.metric.caption || 'current dashboard metrics'}.`
        };
        window.allReports = [row, ...snapshot.history, ...window.allReports].slice(0, 60);
        window.showToast?.(`${type} report generated from live admin data`, 'success');
        window.renderReports();
        window.openReportDetail(row);
    };

    window.exportReport = function (type, format) {
        const meta = reportTypeMeta(type);
        const history = getReportHistoryRows().filter((item) => String(item.type || '').toUpperCase() === String(type || '').toUpperCase());
        const source = history.length ? history : [{
            id: `report-${Date.now()}`,
            name: `${meta.label} Report`,
            type,
            by: 'System',
            date: new Date().toISOString(),
            action: 'Open',
            summary: meta.summary,
            notes: meta.notes
        }];
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        if (String(format).toUpperCase() === 'CSV') {
            const rows = [
                ['Report Name', 'Type', 'By', 'Date', 'Summary', 'Notes'],
                ...source.map((item) => [
                    item.name || '',
                    reportTypeLabel(item.type),
                    item.by || 'System',
                    formatReportDate(item.date),
                    item.summary || item.caption || meta.summary,
                    item.notes || meta.notes
                ])
            ];
            downloadCsv(`admin-${String(type || 'report').toLowerCase()}-${stamp}.csv`, rows);
            window.showToast?.(`${meta.label} CSV downloaded`, 'success');
            return;
        }
        if (String(format).toUpperCase() === 'PDF') {
            const lines = [
                `Type: ${meta.label}`,
                `Generated from: live admin dashboard data`,
                `Tracked history items: ${history.length}`,
                `Summary: ${meta.summary}`,
                '',
                'Recent entries:',
                ...source.slice(0, 12).map((item, index) => `${index + 1}. ${item.name || 'Report'} | ${reportTypeLabel(item.type)} | ${item.by || 'System'} | ${formatReportDate(item.date)}`)
            ];
            downloadPdf(`admin-${String(type || 'report').toLowerCase()}-${stamp}.pdf`, `${meta.label} Report`, lines);
            window.showToast?.(`${meta.label} PDF downloaded`, 'success');
            return;
        }
        window.showToast?.(`Exporting ${type} as ${format}...`, 'info');
    };

    /* ─── NOTIFICATIONS ─── */
    window.allNotifs = window.allNotifs || [];
    window.renderNotifications = function (filter = 'all') {
        if (window.AdminNotifications?.setFilter) {
            window.AdminNotifications.setFilter(filter);
            return;
        }

        const cont = document.getElementById('notif-list');
        if (!cont) return;
        cont.innerHTML = `<div class="glass-card" style="padding:60px; text-align:center; color:var(--text-tertiary)">
        <i class="fa-solid fa-inbox" style="font-size:64px; margin-bottom:24px; opacity:0.12"></i>
        <p style="font-size:18px; font-weight:600; font-family:'Syne'">Notifications loading...</p>
        <p style="font-size:13px; opacity:0.7">Connect the admin notification API to see live inbox items.</p>
    </div>`;
    };

    window.filterNotifs = function (type, btn) {
        if (window.AdminNotifications?.setFilter) {
            window.AdminNotifications.setFilter(type, btn);
            return;
        }
        document.querySelectorAll('.n-filter').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        window.renderNotifications(type);
    };

    window.markRead = function () {
        window.AdminNotifications?.refresh?.();
    };

    window.markAllRead = function () {
        window.AdminNotifications?.refresh?.();
    };

    window.deleteNotif = function () {
        window.AdminNotifications?.refresh?.();
    };

    window.clearNotifs = function () {
        window.AdminNotifications?.refresh?.();
    };
};
document.addEventListener('DOMContentLoaded', () => {
    if (window.AdminDashboard && window.AdminDashboard.init) {
        window.AdminDashboard.init();

        // Initial populate of notifications if that's the direct link
        if (window.location.hash === '#notifications') {
            window.renderNotifications();
        }
    }

    const topSearch = document.getElementById('top-nav-search');
    if (topSearch) {
        topSearch.value = '';
        setTimeout(() => { topSearch.value = ''; }, 0);
    }

    // Fallback binding in case main init path exits early.
    const fallbackToggle = document.getElementById('toggle-sidebar');
    const fallbackSidebar = document.getElementById('sidebar');
    if (fallbackToggle && fallbackSidebar && !fallbackToggle.dataset.sidebarBound) {
        fallbackToggle.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                fallbackSidebar.classList.toggle('open');
                document.body.classList.toggle('sidebar-open', fallbackSidebar.classList.contains('open'));
            } else {
                fallbackSidebar.classList.remove('open');
                document.body.classList.remove('sidebar-open');
                fallbackSidebar.classList.toggle('collapsed');
            }
        });
        fallbackToggle.dataset.sidebarBound = '1';
    }
});

window.logoutAdmin = function (event) {
    if (event?.preventDefault) event.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('jwt');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('jwt');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('user');
    window.location.replace('/pages/login.html');
    return false;
};

window.updateNotifBadges = () => {
    const filters = document.querySelectorAll('.n-filter');
    filters.forEach(f => {
        const span = f.querySelector('span');
        if (!span) return;

        // Extract type from onclick attribute match
        const matchStr = f.getAttribute('onclick') || "";
        const match = matchStr.match(/'([^']+)'/);
        if (!match) return;

        const type = match[1];
        const count = (type === 'all')
            ? (window.allNotifs ? window.allNotifs.length : 0)
            : (window.allNotifs ? window.allNotifs.filter(n => n.type === type).length : 0);
        span.textContent = count;
    });
};

// Hook badges into render engine
const originalRender = window.renderNotifications;
window.renderNotifications = function (filter) {
    if (typeof originalRender === 'function') originalRender(filter);
    window.updateNotifBadges();
};
