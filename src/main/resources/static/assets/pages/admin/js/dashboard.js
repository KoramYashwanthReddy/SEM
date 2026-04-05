/* ============================================================
   ADMIN DASHBOARD CORE LOGIC
   ============================================================ */

    // ─── GLOBAL UI CONTROLLERS ───
    window.switchSection = (targetId) => {
        const navItem = document.querySelector(`.nav-item[data-target="${targetId}"]`);
        if(navItem) {
            navItem.click();
            // Scroll to top of content
            const content = document.querySelector('.content-body');
            if(content) content.scrollTop = 0;
        }
    };

    window.openModal = (id) => {
        const modal = document.getElementById(id);
        if(modal) modal.classList.add('active', 'open');
    };
    
    window.closeModal = (id) => {
        const modal = document.getElementById(id);
        if(modal) modal.classList.remove('active', 'open');
    };
    
    window.showToast = (msg, type = 'info') => {
        const cont = document.getElementById('toastContainer');
        if(!cont) return;
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
            window.showToast(String(message || "Unexpected admin UI error"), "error");
        }
    };

    if (!window.__adminDashboardUiErrorHandlersInstalled) {
        window.__adminDashboardUiErrorHandlersInstalled = true;
        window.addEventListener("error", (event) => {
            if (isUiNoise(event?.message, event?.filename)) return;
            emitUiError(event?.message || "Unexpected admin UI error");
        });
        window.addEventListener("unhandledrejection", (event) => {
            const reason = event?.reason;
            const message = typeof reason === "string"
                ? reason
                : reason?.message || reason?.cause || "Unexpected admin UI error";
            if (isUiNoise(message)) return;
            emitUiError(message);
        });
    }

    window.openAttemptDrawer = (id) => {
        const dr = document.getElementById('attemptIntelDrawer');
        if(!dr) return;
        
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
        if(dr) dr.classList.remove('active');
    };

    window.AdminDashboard = {
    init() {
        if (this._initialized) return;
        this._initialized = true;
        ThemeController.init();
        this.setupNavigation();
        this.setupSidebarToggle();
        this.initCharts();
        this.populateMockData();
        this.setupUserTabs();
        this.setupSearchFilters();
        
        // Initialize Dashboard Module
        this.initDashboardEngine();

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

        // Mock data initialization
        this.dashLogs = [
            { type: 'exams', icon: 'fa-file-circle-check', msg: '<strong>Prof. Alan Turing</strong> published "Cryptography 101"', time: '1m ago', badge: 'published' },
            { type: 'users', icon: 'fa-users', msg: 'Bulk Registration: <strong>340 Students [Batch 2026]</strong>', time: '4m ago', badge: 'bulk' },
            { type: 'proctoring', icon: 'fa-user-ninja', msg: 'Critical: STU_9021 flagged for <strong>Tab Switching</strong>', time: '7m ago', badge: 'high risk' },
            { type: 'system', icon: 'fa-server', msg: 'API Server Auto-Scaled to <strong>4 Nodes</strong>', time: '15m ago', badge: 'scaled' },
            { type: 'exams', icon: 'fa-stopwatch', msg: 'Auto-Submission triggered for <strong>Physics Final</strong>', time: '22m ago', badge: 'system' },
            { type: 'users', icon: 'fa-user-pen', msg: 'Admin_01 granted privileges to <strong>Dr. Strange</strong>', time: '1h ago', badge: 'auth' },
            { type: 'system', icon: 'fa-shield-halved', msg: 'Firewall: 14 invalid login attempts from 192.168.1.104 blocked.', time: '1h 45m ago', badge: 'blocked' },
            { type: 'proctoring', icon: 'fa-microphone-lines', msg: 'Warning: STU_1002 triggered <strong>Audio Exception</strong>', time: '2h ago', badge: 'warning' },
            { type: 'proctoring', icon: 'fa-camera-retro', msg: 'Alert: STU_4193 <strong>Camera Offline</strong> for >30s', time: '2h 10m ago', badge: 'high risk' },
            { type: 'exams', icon: 'fa-certificate', msg: 'Batch processing complete: <strong>980 Certs Issued</strong>', time: '3h ago', badge: 'complete' }
        ];

        this.dashExams = [
            { name: 'Advanced Machine Learning', type: 'AI Proctored', active: 342, status: 'Live' },
            { name: 'Cloud Infrastructure Concepts', type: 'Subjective', active: 114, status: 'Live' },
            { name: 'Global Database Structures', type: 'MCQ', active: 87, status: 'Live' },
            { name: 'Node.js Performance Tuning', type: 'Coding', active: 18, status: 'Live' },
            { name: 'Cyber Security Foundation', type: 'MCQ', active: 291, status: 'Live' },
            { name: 'UX Design - Final Exam', type: 'MCQ', active: 0, status: 'Draft' },
            { name: 'Quantitative Aptitude Test', type: 'Adaptive', active: 0, status: 'Completed' },
            { name: 'Python for Data Science', type: 'Coding', active: 0, status: 'Draft' },
            { name: 'Corporate Compliance 2024', type: 'MCQ', active: 45, status: 'Live' }
        ];

        this.dashAlerts = [
            { id: 1, risk: 'high', title: 'Window Blur Anomaly', user: 'STU_9021', time: 'Just Now' },
            { id: 2, risk: 'high', title: 'Multiple Faces Detected', user: 'STU_4412', time: '1m ago' },
            { id: 3, risk: 'med', title: 'Gaze Deviation (Off-screen)', user: 'STU_1120', time: '5m ago' },
            { id: 4, risk: 'med', title: 'Audio Threshold Exceeded', user: 'STU_8819', time: '14m ago' },
            { id: 5, risk: 'low', title: 'Network Latency Spike', user: 'STU_0411', time: '2h ago' }
        ];

        // Initial Renders
        this.refreshOverview();
        this.startDashTimer();
        this.autoLogCycle();
        this.updateActivityFooter();
    },

    async refreshOverview() {
        const btn = document.getElementById('dashboard-refresh-btn');
        if(btn) btn.classList.add('loading');

        // Show Skeletons
        const container = document.getElementById('dash-metrics-container');
        if(container) container.querySelectorAll('.stat-card').forEach(c => c.classList.add('loading'));

        const logFeed = document.getElementById('dash-log-feed');
        if(logFeed) {
             const skeletons = Array(4).fill(`<div class="log-item" style="display:flex; gap:12px; padding:16px; border-bottom:1px solid var(--border-subtle); align-items:center;">
                <div style="width:36px; height:36px; border-radius:10px; background:var(--border-subtle); animation:skeletonPulse 1.5s infinite"></div>
                <div style="flex:1;"><div style="width:70%; height:12px; background:var(--border-subtle); border-radius:4px; margin-bottom:8px; animation:skeletonPulse 1.5s infinite"></div>
                <div style="width:40%; height:10px; background:var(--border-subtle); border-radius:4px; animation:skeletonPulse 1.5s infinite"></div></div>
             </div>`).join('');
             logFeed.innerHTML = skeletons;
        }

        const examBody = document.getElementById('dash-exam-body');
        if(examBody) {
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

            if(container) container.querySelectorAll('.stat-card').forEach(c => c.classList.remove('loading'));
            if(btn) btn.classList.remove('loading');
            this.dashboardState.refreshTimer = 30;
        } catch(e) {
            console.error(e);
            if(container) container.querySelectorAll('.stat-card').forEach(c => c.classList.remove('loading'));
            if(btn) btn.classList.remove('loading');
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
                if(count >= target) {
                    count = target;
                    clearInterval(int);
                }
                el.textContent = count.toLocaleString();
            }, 30);
        });
    },

    renderDashLogs() {
        const cont = document.getElementById('dash-log-feed');
        if(!cont) return;
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
        if(!body) return;

        // Sorting
        const sorted = [...this.dashExams].sort((a, b) => {
            const valA = a[this.dashboardState.examSort];
            const valB = b[this.dashboardState.examSort];
            if(typeof valA === 'string') {
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
        if(pageSpan) pageSpan.textContent = this.dashboardState.examPage;
    },

    sortExams(col) {
        if(this.dashboardState.examSort === col) {
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
        if(!cont || !count) return;

        count.textContent = this.dashAlerts.length;
        if(this.dashAlerts.length === 0) {
            cont.innerHTML = `<div style="text-align:center; flex:1; display:flex; align-items:center; justify-content:center; color:var(--text-tertiary); font-size:13px; font-weight:500;">All security protocols clear.</div>`;
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
        
        switch(type) {
            case 'createExam': switchSection('exams-section'); break;
            case 'addTeacher': switchSection('management-section'); break;
            case 'viewAnalytics': switchSection('analytics-section'); break;
            case 'viewAttempts': switchSection('attempts-section'); break;
            case 'generateReport': switchSection('reports-section'); break;
        }
    },

    startDashTimer() {
        const el = document.getElementById('dash-timer');
        if(!el) return;
        
        // Prevent multiple intervals
        if(this.dashTimerInterval) clearInterval(this.dashTimerInterval);

        el.textContent = this.dashboardState.refreshTimer;
        this.dashTimerInterval = setInterval(() => {
            const btn = document.getElementById('dashboard-refresh-btn');
            if(btn && btn.classList.contains('loading')) return;

            this.refreshOverview();
            this.dashboardState.refreshTimer = 30;
            if(el) el.textContent = this.dashboardState.refreshTimer;
        }, 30000);
    },

    autoLogCycle() {
        setInterval(() => {
            const newLog = {
                type: ['exams', 'users', 'proctoring', 'system'][Math.floor(Math.random()*4)],
                icon: 'fa-robot',
                msg: `AI Forensic: Log ID ${Math.floor(Math.random()*9000+1000)} process completed.`,
                time: 'Just now',
                badge: 'auto-gen'
            };
            this.dashLogs.unshift(newLog);
            if(this.dashLogs.length > 20) this.dashLogs.pop();
            this.renderDashLogs();
        }, 15000);
    },

    downloadLogs() {
        window.showToast?.('Pre-processing CSV export for 1,240 events...', 'success');
    },

    clearLogs() {
        if(confirm('Purge recent event log buffer?')) {
            this.dashLogs = [];
            this.renderDashLogs();
            window.showToast?.('Event buffer cleared successfully.', 'warning');
        }
    },

    prevExamPage() {
        if(this.dashboardState.examPage > 1) {
            this.dashboardState.examPage--;
            this.renderDashExams();
        }
    },

    nextExamPage() {
        const query = (document.getElementById('dash-exam-search')?.value || '').toLowerCase();
        const filteredCount = this.dashExams.filter(e => e.name.toLowerCase().includes(query)).length;
        if(this.dashboardState.examPage < Math.ceil(filteredCount / this.dashboardState.examSize)) {
            this.dashboardState.examPage++;
            this.renderDashExams();
        }
    },

    updateActivityFooter() {
        if(this.activityFooterInterval) clearInterval(this.activityFooterInterval);
        const exams = ['Quantum Computing Basics', 'React Performance', 'System Design v4', 'Blockchain Fundamentals'];
        const teachers = ['Prof. Albus D.', 'Dr. Strange', 'Prof. X', 'Sarah Connor'];
        
        this.activityFooterInterval = setInterval(() => {
            const examLabel = document.getElementById('last-exam-label');
            const teacherLabel = document.getElementById('last-teacher-label');
            if(examLabel) examLabel.textContent = exams[Math.floor(Math.random()*exams.length)];
            if(teacherLabel) teacherLabel.textContent = teachers[Math.floor(Math.random()*teachers.length)];
            
            // Randomly flash a "High Risk" alert in footer
            const susp = document.querySelector('.footer-stat.susp');
            if(susp) {
                susp.style.opacity = '0.5';
                setTimeout(() => {
                    document.getElementById('last-susp-label').textContent = `STU_${Math.floor(Math.random()*9000+1000)} (Detected)`;
                    susp.style.opacity = '1';
                }, 300);
            }
        }, 30000);
    },

    // ─── NAVIGATION ───
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item:not(.logout)');
        const sections = document.querySelectorAll('.tab-content');

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

                if (targetId === 'audit-section' && typeof window.renderAuditLogs === 'function') {
                    window.renderAuditLogs();
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
            if (id === 'attempts-section') {
                window.refreshAttempts();
            }
            if (id === 'leaderboard-section') {
                AdminDashboard.renderLeaderboard();
            }
            if (id === 'proctoring-section') {
                window.refreshProctoring();
            }
            if (id === 'audit-section' && typeof window.renderAuditLogs === 'function') {
                window.renderAuditLogs();
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
            if(isNaN(target)) return;
            let count = 0;
            const inc = Math.max(1, Math.ceil(target / 40));
            const int = setInterval(() => {
                count += inc;
                if(count >= target) {
                    count = target;
                    clearInterval(int);
                }
                el.textContent = count.toLocaleString();
            }, 30);
        });
    },

    // ─── MOCK DATA & RENDERERS ───
    populateMockData() {
        this.renderExams();
        this.renderStudents();
        this.renderTeachers();
        this.renderViolations();
        this.renderCertificates();
        this.renderAttempts();
        this.appendAnalyticsProgressBars();
        
        // Initialize independent modules
        if(window.initLeaderboardEngine) window.initLeaderboardEngine();
    },

    renderExams() {
        if(!window.examsData) {
            window.examsData = [
                { id: 'EXAM-JS24XX', title: 'Advanced JavaScript (ES2024)', creator: 'Dr. John Smith', duration: 90, status: 'Published', questionsUploaded: true },
                { id: 'EXAM-AWS123', title: 'Cloud Infrastructure with AWS', creator: 'Eng. Sarah Connor', duration: 120, status: 'Published', questionsUploaded: true },
                { id: 'EXAM-ML0001', title: 'Machine Learning Basics', creator: 'Prof. Xavier', duration: 60, status: 'Draft', questionsUploaded: false }
            ];
        }
        window.renderGlobalExams();
    },

    renderStudents() {
        if(!window.studentsData) {
            window.studentsData = [
                { 
                  id: 'S-101', name: 'Alice Vane', email: 'alice@example.com', institution: 'Stanford University', status: 'Active',
                  examsAttempted: 12, avgScore: 88, passRate: 92, lastLogin: '2024-04-02 10:30 AM', attempts: 15, highestScore: 98, lowestScore: 72
                },
                { 
                  id: 'S-102', name: 'Bob Marley', email: 'bob@example.com', institution: 'Stanford University', status: 'Active',
                  examsAttempted: 8, avgScore: 74, passRate: 75, lastLogin: '2024-04-01 04:15 PM', attempts: 9, highestScore: 88, lowestScore: 60
                },
                { 
                  id: 'S-103', name: 'Charlie Day', email: 'charlie@example.com', institution: 'Stanford University', status: 'Disabled',
                  examsAttempted: 5, avgScore: 62, passRate: 40, lastLogin: '2024-03-25 09:00 AM', attempts: 6, highestScore: 75, lowestScore: 45
                },
                { 
                  id: 'S-104', name: 'Diana Ross', email: 'diana@example.com', institution: 'Stanford University', status: 'Active',
                  examsAttempted: 20, avgScore: 92, passRate: 100, lastLogin: '2024-04-03 11:20 AM', attempts: 22, highestScore: 100, lowestScore: 85
                }
            ];
        }
        window.renderGlobalStudents();
    },

    renderTeachers() {
        if(!window.teachersData) {
            window.teachersData = [
                { 
                  id: 'T-1', fullName: 'Dr. Sarah Smith', email: 'sarah@example.com', phone: '9876543210', department: 'Engineering', 
                  designation: 'Senior Lecturer', experienceYears: 12, qualification: 'Ph.D', employeeId: 'EMP-0001', status: 'Active',
                  examsCreated: [
                    { title: 'Data Structures & Algorithms', code: 'DSA-2024', status: 'Published', date: '2024-03-15' },
                    { title: 'System Design Patterns', code: 'SDP-Q1', status: 'Draft', date: '2024-03-28' }
                  ],
                  questionsUploaded: [
                    { exam: 'Data Structures & Algorithms', count: 85, date: '2024-03-14' },
                    { exam: 'Mathematics III', count: 40, date: '2024-02-10' }
                  ],
                  attemptsHandled: { total: 1240, avgScore: 74, passRate: 82 },
                  cheatingReports: { suspicious: 24, flags: 5 },
                  analytics: { exams: 18, students: 2400, certs: 1850 }
                },
                { 
                  id: 'T-2', fullName: 'Prof. Alan Turing', email: 'alan@example.com', phone: '9988776655', department: 'Mathematics', 
                  designation: 'Lead Researcher', experienceYears: 20, qualification: 'Ph.D', employeeId: 'EMP-0002', status: 'Active',
                  examsCreated: [
                    { title: 'Theory of Computation', code: 'TOC-101', status: 'Published', date: '2024-01-20' }
                  ],
                  questionsUploaded: [
                    { exam: 'Logic Systems', count: 60, date: '2024-01-18' }
                  ],
                  attemptsHandled: { total: 850, avgScore: 88, passRate: 90 },
                  cheatingReports: { suspicious: 8, flags: 1 },
                  analytics: { exams: 12, students: 1500, certs: 1350 }
                }
            ];
        }
        window.renderGlobalTeachers();
    },

    renderAttempts() {
        const list = document.getElementById('attempts-list');
        if(!list) return;
        const attempts = [
            { stu: 'Mike Ross', exam: 'System Design v2', time: '10:05 AM', status: 'In Progress' },
            { stu: 'Harvey Specter', exam: 'Advanced JavaScript', time: '09:12 AM', status: 'Suspended' }
        ];
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
        const events = [
            { time: '14:23:01', user: 'STU_4812', type: 'Face Mismatch', risk: 85 },
            { time: '14:21:44', user: 'STU_9021', type: 'Multiple Faces', risk: 92 },
            { time: '13:58:12', user: 'STU_1120', type: 'Gaze Anomaly', risk: 42 }
        ];

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
        if(window.initCertificatesEngine) {
            window.initCertificatesEngine();
        }
    },

    renderLeaderboard() {
        const list = document.getElementById('ranks-list');
        if (!list) return;
        const ranks = Array(5).fill(0).map((_, i) => ({
            rank: i + 4,
            name: ['Alexandra R.', 'Chris Evans', 'Diana Prince', 'Bruce Wayne', 'Clark Kent'][i],
            points: [96.4, 95.1, 94.0, 92.5, 91.8][i],
            acc: '94.2%'
        }));

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
        if(!grid || document.getElementById('analytics-goals')) return;
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

window.handleActionBtn = async function(btn, normalText, processingText, successText, operationCb) {
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
        if(btn.parentElement && !btn.closest('.success-hide')) {
             btn.classList.remove('success', 'processing');
             btn.innerHTML = normalText;
             btn.disabled = false;
             btn.style.width = '';
        }
    }, 1500);
};

window.openModal = function(id) { 
    const el = document.getElementById(id);
    if(el) el.classList.add('open', 'active'); 
};
window.closeModal = function(id) { 
    const el = document.getElementById(id);
    if(el) el.classList.remove('open', 'active'); 
};
window.closeModalOutside = function(event, id) {
    if(event.target.id === id) {
        if(id === 'deleteConfirmModal' && typeof window.resetDeleteConfirmModalState === 'function') {
            window.resetDeleteConfirmModalState();
        }
        closeModal(id);
    }
};

window.showToast = function(msg) {
    const container = document.getElementById('toastContainer');
    if(!container) return;
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
    if(show) {
        el.classList.add('is-invalid');
        const next = el.nextElementSibling;
        if(next && next.classList.contains('error-msg')) next.classList.add('show');
    } else {
        el.classList.remove('is-invalid');
        const next = el.nextElementSibling;
        if(next && next.classList.contains('error-msg')) next.classList.remove('show');
    }
}

window.submitCreateExam = async function(event, btn) {
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
        if(!isOk) { valid = false; if(!firstInvalid) firstInvalid = id; }
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

    if(!valid) {
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
        if(window.currentExamFilter === 'published') {
            setExamFilter('all', document.querySelector('[data-filter="all"]'));
        } else {
            window.renderGlobalExams();
        }

        const list = document.getElementById('exams-list');
        if(list && list.firstElementChild) {
            list.firstElementChild.classList.add('row-inserted');
        }

        setTimeout(() => {
            showToast('Exam created successfully.');
            document.getElementById('createExamForm').reset();
            closeModal('createExamModal');
        }, 1000);
    });
};

window.submitAddTeacher = async function(event, btn) {
    event.preventDefault();
    
    // Values
    const val = (id) => document.getElementById(id).value.trim();
    
    const name = val('t-name');
    const email = val('t-email');
    const pwd = val('t-pwd');
    const phone = val('t-phone');
    const dept = val('t-dept') || 'General';
    const empid = val('t-empid');
    const expStr = val('t-exp');
    const exp = parseFloat(expStr);

    let valid = true;
    let firstInvalid = null;

    const check = (id, condition) => {
        const isOk = condition;
        setError(id, !isOk);
        if(!isOk) { valid = false; if(!firstInvalid) firstInvalid = id; }
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

    if(!valid) {
        document.getElementById(firstInvalid).focus();
        return;
    }

    const tId = val('t-id');
    const isEdit = tId !== '';

    handleActionBtn(btn, isEdit ? 'Save Changes' : 'Create Teacher', isEdit ? 'Saving...' : 'Creating...', isEdit ? 'Saved' : 'Teacher Created', () => {
        if (isEdit) {
            const t = window.teachersData.find(x => x.id === tId);
            if(t) {
                t.fullName = name; t.email = email; t.phone = phone; t.department = dept;
                t.designation = val('t-designation'); t.experienceYears = exp || 0; 
                t.qualification = val('t-qual'); t.employeeId = empid;
                // password ignored in edit simulate
            }
        } else {
                window.teachersData.unshift({
                    id: 'T-'+Date.now(),
                    fullName: name, email: email, phone: phone, department: dept,
                    designation: val('t-designation'), experienceYears: exp || 0,
                    qualification: val('t-qual'), employeeId: empid, status: 'Active',
                    examsCreated: [], questionsUploaded: [], 
                    attemptsHandled: { total: 0, avgScore: 0, passRate: 0 },
                    cheatingReports: { suspicious: 0, flags: 0 },
                    analytics: { exams: 0, students: 0, certs: 0 }
                });
        }
        
        window.renderGlobalTeachers();
        
        if(!isEdit) {
            const list = document.getElementById('teachers-list');
            if(list && list.firstElementChild) {
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

window.openEvidence = function(user, type, time) {
    document.getElementById('evidence-desc').innerHTML = `Reviewing evidence for <strong>${user}</strong> at ${time}. Warning trigger: <strong>${type}</strong>.`;
    openModal('evidenceModal');
};

window.submitEvidenceAction = function(btn, action) {
    handleActionBtn(btn, action, 'Processing...', action + 'ed', () => {
        setTimeout(() => closeModal('evidenceModal'), 1000);
    });
};

window.filterViolations = function(risk) {
    const list = document.getElementById('violations-list');
    if(!list) return;
    Array.from(list.children).forEach(tr => {
        if(risk === 'all') {
            tr.style.display = '';
        } else {
            const isHigh = tr.classList.contains('row-suspicious');
            if(risk === 'high') tr.style.display = isHigh ? '' : 'none';
            if(risk === 'med') tr.style.display = isHigh ? 'none' : '';
        }
    });
};

window.toggleMaintenance = function(btn) {
    const isMaint = btn.textContent.includes('Enable');
    handleActionBtn(btn, isMaint ? 'Disable Maintenance' : 'Enable Maintenance', isMaint ? 'Enabling...' : 'Disabling...', isMaint ? 'Enabled' : 'Disabled');
};

window.clearCache = function(btn) {
    handleActionBtn(btn, 'Clear Cache', 'Clearing...', 'Cache Cleared');
};

// Global Key Listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(modal => {
            if(modal.id === 'deleteConfirmModal' && typeof window.resetDeleteConfirmModalState === 'function') {
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
window.generateExamCode = function() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    do {
        code = 'EXAM-';
        for(let i=0; i<6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    } while(window.examsData && window.examsData.find(e => e.id === code));
    return code;
};

window.renderGlobalExams = function() {
    const list = document.getElementById('exams-list');
    if (!list) return;
    const filter = window.currentExamFilter || 'all';
    
    // Check search term
    const searchInput = document.getElementById('examSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    list.innerHTML = window.examsData.map((e, index) => {
        if(filter === 'published' && e.status !== 'Published') return '';
        if(filter === 'draft' && e.status !== 'Draft') return '';
        
        const titleText = e.title.toLowerCase();
        const codeText = e.id.toLowerCase();
        if(searchTerm && !titleText.includes(searchTerm) && !codeText.includes(searchTerm)) return '';
        
        const dotColor = e.status === 'Published' ? 'g' : 'o';
        const canPublish = e.status === 'Draft' && !!e.questionsUploaded;
        const publishBtn = e.status === 'Draft'
            ? (canPublish
                ? `<button class="btn btn-ghost btn-sm" style="color:var(--accent-green); border-color:var(--accent-green)" onclick="publishExam(this, '${e.id}')">Publish</button>`
                : `<button class="btn btn-ghost btn-sm" style="color:var(--text-tertiary); border-color:var(--border-subtle)" disabled title="Upload questions to enable publish">Publish</button>`)
            : `<button class="btn btn-ghost btn-sm" style="color:var(--text-tertiary)" disabled>Published</button>`;
        
        return `
            <tr data-exid="${e.id}">
                <td>
                    <div style="font-weight:700;color:var(--text-primary);font-size:13px">${e.title}</div>
                    ${e.questionsUploaded ? '<div style="font-size:11px;color:var(--accent-green);font-weight:700;margin-top:2px">✓ Questions Uploaded</div>' : ''}
                </td>
                <td style="font-family:'JetBrains Mono'; font-size:12px; color:var(--text-secondary)">${e.id}</td>
                <td style="font-size:13px">${e.creator}</td>
                <td style="font-size:13px">${e.duration} Min</td>
                <td><span class="dot ${dotColor}">${e.status}</span></td>
                <td>
                    <div class="action-wrap">
                        <button class="btn btn-ghost btn-sm" onclick="openUploadQuestions('${e.id}')">Upload</button>
                        <button class="btn btn-ghost btn-sm" onclick="openViewQuestions('${e.id}')">View</button>
                        ${publishBtn}
                        <button class="btn btn-ghost btn-sm" onclick="openEditExam('${e.id}')">Edit</button>
                        <button class="btn btn-ghost btn-sm" style="color:var(--accent-pink);border-color:var(--accent-pink)" onclick="confirmDeleteExam('${e.id}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
};

window.setExamFilter = function(filter, btn) {
    document.querySelectorAll('#examFilterGroup button').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    window.currentExamFilter = filter;
    window.renderGlobalExams();
};

if(document.getElementById('examSearchInput')) {
    document.getElementById('examSearchInput').addEventListener('input', () => {
        window.renderGlobalExams();
    });
}

window.openEditExam = function(id) {
    const exam = window.examsData.find(x => x.id === id);
    if(!exam) return;
    document.getElementById('edit-ex-id').value = id;
    document.getElementById('edit-ex-title').value = exam.title;
    document.getElementById('edit-ex-dur').value = exam.duration;
    openModal('editExamModal');
};

window.submitEditExam = async function(event, btn) {
    event.preventDefault();
    const id = document.getElementById('edit-ex-id').value;
    const title = document.getElementById('edit-ex-title').value.trim();
    const dur = document.getElementById('edit-ex-dur').value;
    
    let valid = true;
    if(!title) { setError('edit-ex-title', true); valid = false; } else setError('edit-ex-title', false);
    if(!dur || parseFloat(dur)<=0) { setError('edit-ex-dur', true); valid = false; } else setError('edit-ex-dur', false);
    if(!valid) return;

    handleActionBtn(btn, 'Save Changes', 'Saving...', 'Saved', () => {
        const exam = window.examsData.find(x => x.id === id);
        if(exam) {
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

window.confirmDeleteExam = function(id) {
    window.examToDeleteId = id;
    window.teacherToDeleteId = null;
    window.studentToDeleteId = null;
    window.certToRevokeId = null;
    const exam = (window.examsData || []).find(e => e.id === id);
    if(typeof window.prepareDeleteConfirmModal === 'function') {
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

document.getElementById('confirmDeleteBtn')?.addEventListener('click', async function() {
    const btn = this;
    const id = window.examToDeleteId;
    if(!id) return;
    
    btn.disabled = true;
    const originalW = btn.offsetWidth;
    btn.style.width = originalW + 'px';
    btn.innerHTML = `<span class="btn-spinner"></span> Deleting...`;
    
    await new Promise(r => setTimeout(r, 600));
    
    window.examsData = window.examsData.filter(x => x.id !== id);
    const row = document.querySelector(`tr[data-exid="${id}"]`);
    if(row) {
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

window.publishExam = function(btn, id) {
    const exam = window.examsData.find(x => x.id === id);
    if(!exam) return;
    if(!exam.questionsUploaded) {
        showToast('Upload questions first. Publishing without questions is not allowed.');
        return;
    }

    handleActionBtn(btn, 'Publish', 'Publishing...', 'Published', async () => {
        exam.status = 'Published';
        const tr = btn.closest('tr');
        if(tr) {
            const badge = tr.querySelector('.status-badge');
            if(badge) {
               badge.className = 'status-badge published';
               badge.textContent = 'Published';
            }
        }
        setTimeout(() => window.renderGlobalExams(), 1500); // refresh entire UI to disable button cleanly
        return true;
    });
};

window.openUploadQuestions = function(id) {
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

window.submitUploadQuestions = function(btn) {
    const fileInput = document.getElementById('uq-file');
    const file = fileInput?.files?.[0];
    const code = document.getElementById('uq-code').value;
    const exam = window.examsData.find(x => x.id === code || x.examCode === code);
    if(exam?.questionsUploaded) {
        showToast('Questions are already uploaded for this exam. Upload is blocked.', 'warning');
        btn.disabled = true;
        btn.textContent = 'Uploaded';
        return;
    }
    if(!file) {
        setError('uq-file', true);
        return;
    }
    setError('uq-file', false);
    handleActionBtn(btn, 'Upload File', 'Uploading...', 'Uploaded', () => {
        if(exam) exam.questionsUploaded = true;
        window.renderGlobalExams();
        
        setTimeout(() => {
            closeModal('uploadQuestionsModal');
            showToast('Questions uploaded successfully.');
        }, 1000);
    });
};

window.openViewQuestions = function(id) {
    const exam = window.examsData.find(x => x.id === id);
    if(!exam) return;
    
    document.getElementById('vq-title').textContent = exam.title;
    
    const list = document.getElementById('vq-list');
    if(!exam.questionsUploaded) {
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
window.renderGlobalTeachers = function() {
    const list = document.getElementById('teachers-list');
    if (!list) return;
    
    const searchInput = document.getElementById('teacherSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    list.innerHTML = window.teachersData.map((t, index) => {
        const text = [t.fullName, t.email, t.department, t.employeeId].join(' ').toLowerCase();
        if(searchTerm && !text.includes(searchTerm)) return '';
        
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
};

if(document.getElementById('teacherSearchInput')) {
    document.getElementById('teacherSearchInput').addEventListener('input', () => {
        window.renderGlobalTeachers();
    });
}

window.openEditTeacher = function(id) {
    const t = window.teachersData.find(x => x.id === id);
    if(!t) return;
    document.getElementById('t-id').value = t.id;
    document.getElementById('t-name').value = t.fullName;
    document.getElementById('t-email').value = t.email;
    document.getElementById('t-phone').value = t.phone || '';
    document.getElementById('t-dept').value = t.department || '';
    document.getElementById('t-designation').value = t.designation || '';
    document.getElementById('t-exp').value = t.experienceYears || '';
    document.getElementById('t-qual').value = t.qualification || '';
    document.getElementById('t-empid').value = t.employeeId || '';
    // reset pwd and focus states
    document.getElementById('t-pwd').value = '********';
    
    document.querySelector('#addTeacherModal .modal-title').textContent = 'Edit Teacher';
    document.querySelector('#createTeacherForm button[type=submit]').textContent = 'Save Changes';
    
    openModal('addTeacherModal');
};

window.toggleTeacherStatus = function(btn, id) {
    handleActionBtn(btn, btn.textContent, 'Processing...', 'Done', () => {
        const t = window.teachersData.find(x => x.id === id);
        if(t) t.status = t.status === 'Active' ? 'Disabled' : 'Active';
        setTimeout(() => window.renderGlobalTeachers(), 1000);
        return true;
    });
};

window.confirmDeleteTeacher = function(id) {
    window.examToDeleteId = null;
    window.teacherToDeleteId = id;
    window.studentToDeleteId = null;
    window.certToRevokeId = null;
    const teacher = (window.teachersData || []).find(t => t.id === id);
    if(typeof window.prepareDeleteConfirmModal === 'function') {
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
if(confirmBtn) {
    // Clone and replace to reset events
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    
    newBtn.addEventListener('click', async function() {
        const btn = this;
        let idVal, type;
        if(window.examToDeleteId) { idVal = window.examToDeleteId; type = 'exam'; }
        if(window.teacherToDeleteId) { idVal = window.teacherToDeleteId; type = 'teacher'; }
        if(window.studentToDeleteId) { idVal = window.studentToDeleteId; type = 'student'; }
        if(window.certToRevokeId) { idVal = window.certToRevokeId; type = 'cert-revoke'; }
        if(window.attemptToCancelId) { idVal = window.attemptToCancelId; type = 'attempt-cancel'; }
        if(!idVal) return;

        if((type === 'teacher' || type === 'student' || type === 'exam' || type === 'cert-revoke' || type === 'attempt-cancel') && window.deleteConfirmRequiresText) {
            const input = document.getElementById('deleteConfirmInput');
            const error = document.getElementById('deleteConfirmError');
            const typed = (input?.value || '').trim();
            if(typed !== window.deleteConfirmExpectedText) {
                if(error) error.style.display = 'block';
                if(input) input.classList.add('is-invalid');
                return;
            }
            if(error) error.style.display = 'none';
            if(input) input.classList.remove('is-invalid');
        }
        
        btn.disabled = true;
        const originalW = btn.offsetWidth;
        btn.style.width = originalW + 'px';
        btn.innerHTML = `<span class="btn-spinner"></span> Deleting...`;
        
        await new Promise(r => setTimeout(r, 600));
        
        let row;
        if(type === 'exam') {
            window.examsData = window.examsData.filter(x => x.id !== idVal);
            row = document.querySelector(`tr[data-exid="${idVal}"]`);
        } else if(type === 'teacher') {
            window.teachersData = window.teachersData.filter(x => x.id !== idVal);
            row = document.querySelector(`tr[data-tid="${idVal}"]`);
        } else if(type === 'student') {
            window.studentsData = window.studentsData.filter(x => x.id !== idVal);
            row = document.querySelector(`tr[data-sid="${idVal}"]`);
        } else if(type === 'cert-revoke') {
            const cert = (window.allCertificates || []).find(x => x.id === idVal);
            if(cert) cert.active = false;
        } else if(type === 'attempt-cancel') {
            window.cancelAttempt(idVal);
        }
        
        if(row) {
            row.classList.add('row-removing');
            setTimeout(() => { 
                row.remove();
                if(type === 'exam') window.renderGlobalExams(); 
                if(type === 'teacher') window.renderGlobalTeachers();
                if(type === 'student') window.renderGlobalStudents();
            }, 400);
        } else {
            if(type === 'exam') window.renderGlobalExams(); 
            if(type === 'teacher') window.renderGlobalTeachers();
            if(type === 'student') window.renderGlobalStudents();
            if(type === 'cert-revoke') window.renderCertPage();
            if(type === 'attempt-cancel') window.renderAttemptsTable();
        }
        
        let toastMsg = 'Deleted successfully.';
        if(type === 'exam') toastMsg = 'Exam deleted successfully.';
        if(type === 'teacher') toastMsg = 'Teacher deleted successfully.';
        if(type === 'student') toastMsg = 'Student deleted successfully.';
        if(type === 'cert-revoke') toastMsg = 'Certificate revoked successfully.';
        if(type === 'attempt-cancel') toastMsg = 'Attempt cancelled successfully.';
        
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

// ─── STUDENTS LOGIC ───
window.renderGlobalStudents = function() {
    const list = document.getElementById('students-list');
    if (!list) return;
    
    const searchInput = document.getElementById('studentSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    list.innerHTML = window.studentsData.map((s, index) => {
        const text = [s.name, s.email].join(' ').toLowerCase();
        if(searchTerm && !text.includes(searchTerm)) return '';
        
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
};

if(document.getElementById('studentSearchInput')) {
    document.getElementById('studentSearchInput').addEventListener('input', () => {
        window.renderGlobalStudents();
    });
}

window.openViewStudent = function(btn, id) {
    const s = window.studentsData.find(x => x.id === id);
    if(!s) return;
    
    // UI Loading state (300ms per USER requirement)
    if(btn) {
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

window.toggleStudentStatus = function(btn, id) {
    handleActionBtn(btn, btn.textContent, 'Processing...', 'Done', () => {
        const s = window.studentsData.find(x => x.id === id);
        if(s) s.status = s.status === 'Active' ? 'Disabled' : 'Active';
        setTimeout(() => window.renderGlobalStudents(), 1000);
        return true;
    });
};

window.confirmDeleteStudent = function(id) {
    window.examToDeleteId = null;
    window.teacherToDeleteId = null;
    window.studentToDeleteId = id;
    window.certToRevokeId = null;
    const student = (window.studentsData || []).find(s => s.id === id);
    if(typeof window.prepareDeleteConfirmModal === 'function') {
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

window.resetDeleteConfirmModalState = function() {
    const title = document.getElementById('deleteConfirmTitle');
    const message = document.getElementById('deleteConfirmMessage');
    const instruction = document.getElementById('deleteConfirmInstruction');
    const input = document.getElementById('deleteConfirmInput');
    const error = document.getElementById('deleteConfirmError');
    const btn = document.getElementById('confirmDeleteBtn');
    if(title) title.textContent = 'Confirm Deletion';
    if(message) message.textContent = 'Are you absolutely sure you want to delete this item? This action cannot be undone.';
    if(instruction) { instruction.style.display = 'none'; instruction.textContent = ''; }
    if(input) { input.style.display = 'none'; input.value = ''; input.classList.remove('is-invalid'); }
    if(error) error.style.display = 'none';
    if(btn) {
        btn.disabled = false;
        btn.textContent = 'Yes, Delete';
        btn.style.background = 'var(--accent-pink)';
    }
    window.deleteConfirmExpectedText = '';
    window.deleteConfirmRequiresText = false;
    window.deleteConfirmAction = 'delete';
    window.attemptToCancelId = null;
};

window.prepareDeleteConfirmModal = function(config) {
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

    if(title) title.textContent = `${isRevoke ? 'Revoke' : isCancel ? 'Cancel' : 'Delete'} ${typeLabel}`;
    if(message) {
        message.textContent = isRevoke
            ? `You are about to permanently revoke ${typeLabel.toLowerCase()} "${displayName}". This action immediately invalidates the certificate.`
            : isCancel
                ? `You are about to cancel ${typeLabel.toLowerCase()} "${displayName}". This will invalidate the running attempt and cannot be undone.`
                : `You are about to permanently delete ${typeLabel.toLowerCase()} "${displayName}". This action cannot be undone.`;
    }

    window.deleteConfirmRequiresText = !!config.requireTypedConfirm;
    window.deleteConfirmExpectedText = config.expectedText || '';
    window.deleteConfirmAction = action;

    if(error) error.style.display = 'none';

    if(input) {
        input.value = '';
        input.classList.remove('is-invalid');
        input.style.display = window.deleteConfirmRequiresText ? 'block' : 'none';
    }

    if(instruction) {
        if(window.deleteConfirmRequiresText) {
            instruction.style.display = 'block';
            instruction.innerHTML = `Type <strong style="color:var(--text-primary)">${window.deleteConfirmExpectedText}</strong> to confirm.`;
        } else {
            instruction.style.display = 'none';
            instruction.textContent = '';
        }
    }

    if(btn) {
        btn.disabled = window.deleteConfirmRequiresText;
        btn.textContent = isRevoke ? 'Yes, Revoke' : isCancel ? 'Yes, Cancel' : 'Yes, Delete';
        btn.style.background = isRevoke || isCancel ? 'var(--accent-pink)' : 'var(--accent-pink)';
    }

    if(input && !input.dataset.deleteConfirmBound) {
        input.addEventListener('input', () => {
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            const err = document.getElementById('deleteConfirmError');
            if(!window.deleteConfirmRequiresText) {
                if(confirmBtn) confirmBtn.disabled = false;
                return;
            }
            const ok = input.value.trim() === window.deleteConfirmExpectedText;
            if(confirmBtn) confirmBtn.disabled = !ok;
            if(err) err.style.display = (!ok && input.value.trim().length > 0) ? 'block' : 'none';
        });
        input.dataset.deleteConfirmBound = '1';
    }
};

window.closeDeleteConfirmModal = function() {
    window.resetDeleteConfirmModalState?.();
    window.examToDeleteId = null;
    window.teacherToDeleteId = null;
    window.studentToDeleteId = null;
    window.certToRevokeId = null;
    window.attemptToCancelId = null;
    closeModal('deleteConfirmModal');
};
window.openViewTeacher = function(id) {
    const t = window.teachersData.find(x => x.id === id);
    if(!t) return;
    
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

window.openTeacherActivity = async function(id) {
    const fallback = (window.teachersData || []).find(x => x.id === id);
    const modal = document.getElementById('teacherActivityModal');
    if(!modal) return;

    const setCount = (elId, value) => {
        const el = document.getElementById(elId);
        if(!el) return;
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
        if(nameEl) nameEl.textContent = displayName;

        setCount('ta-exams-conducted', analytics.exams);
        setCount('ta-students-eval', analytics.students);
        setCount('ta-certs', analytics.certs);

        const examsList = document.getElementById('ta-exams-list');
        if(examsList) examsList.innerHTML = examsCreated.length
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
        if(questionsList) questionsList.innerHTML = questionsUploaded.length
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
        if(avgEl) avgEl.textContent = `${Number(attemptsHandled.avgScore || 0)}%`;
        if(passEl) passEl.textContent = `${Number(attemptsHandled.passRate || 0)}%`;

        const alertsList = document.getElementById('ta-alerts-list');
        if(alertsList) alertsList.innerHTML = alerts.length
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
        if(!api) return;
        const payload = await api(`/api/admin/teachers/${encodeURIComponent(id)}/activity`);
        renderTeacherActivity(payload);
    } catch (error) {
        console.error(error);
        window.showToast?.(error.message || 'Failed to load teacher activity', 'error');
    }
};

window.switchActivityTab = function(btn, tabId) {
    const modal = btn.closest('.modal-content');
    modal.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    modal.querySelectorAll('.activity-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(tabId);
    if(target) target.classList.add('active');
};

// ─── ANALYTICS INTELLIGENCE ENGINE ───

function buildAnalyticsSnapshot(examCode = 'global') {
    const exams = window.examsData || [];
    const students = window.studentsData || [];
    const teachers = window.teachersData || [];
    const attemptsAll = window.attemptsData || [];
    const attempts = examCode === 'global'
        ? attemptsAll
        : attemptsAll.filter(a => a.examId === examCode || a.examTitle === examCode || a.examCode === examCode);

    const completed = attempts.filter(a => a.status === 'COMPLETED' || a.status === 'AUTO_SUBMITTED');
    const scores = completed.map(a => Number(a.percentage || 0)).filter(n => Number.isFinite(n));
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
    attempts.forEach((att) => {
        const key = att.examId || att.examCode || att.examTitle || 'Unknown';
        const item = byExam.get(key) || { total: 0, scores: [], cheat: [] };
        item.total += 1;
        item.scores.push(Number(att.percentage || 0));
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
    attempts.forEach((att) => {
        const key = att.studentId || att.studentName || att.studentEmail || att.id;
        const item = studentScores.get(key) || { name: att.studentName || key, scores: [], attempts: 0 };
        item.scores.push(Number(att.percentage || 0));
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

    const chartSource = scores.length ? scores : attempts.map(a => Number(a.cheatingScore || 0));
    const chartData = Array.from({ length: 7 }, (_, i) => {
        if (!chartSource.length) return 0;
        const idx = Math.round((i / Math.max(6, chartSource.length - 1)) * (chartSource.length - 1));
        return Math.round(chartSource[idx] || 0);
    });

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

window.refreshAnalytics = async function() {
    const selectors = ['ana-results', 'ana-avg-score', 'ana-total-students', 'ana-total-teachers', 'ana-active-attempts', 'ana-risk-score', 'ana-total-exams', 'ana-total-attempts', 'ana-global-pass'];
    selectors.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = `<span class="skeleton" style="width:50px;height:24px;display:inline-block"></span>`;
    });

    const ai = document.getElementById('ai-insights-container');
    if(ai) ai.innerHTML = `<div class="skeleton" style="height:50px; margin-bottom:8px"></div>`.repeat(4);

    await new Promise(r => setTimeout(r, 120));
    window.populateAnalyticsUI(buildAnalyticsSnapshot('global'));
};

window.loadExamSpecificAnalytics = async function(examCode) {
    if(examCode === 'global') return window.refreshAnalytics();
    await new Promise(r => setTimeout(r, 120));
    window.populateAnalyticsUI(buildAnalyticsSnapshot(examCode));
};

window.toggleAIInsights = function() {
    const container = document.getElementById('ai-insights-container');
    const btn = document.getElementById('ai-toggle-btn');
    const isCollapsed = container.style.maxHeight === '200px' || !container.style.maxHeight;
    container.style.maxHeight = isCollapsed ? '1000px' : '200px';
    if(btn) btn.textContent = isCollapsed ? 'Collapse' : 'Expand';
};

window.populateAnalyticsUI = function(data) {
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
    document.getElementById('ana-risk-stability').style.color = data.proctorStats.stability === 'STABLE' ? 'var(--accent-green)' : 'var(--accent-pink)';

    // AI Badge
    const badge = document.getElementById('ana-ai-risk-badge');
    if(badge) {
        const risk = data.riskScore < 20 ? 'LOW' : (data.riskScore < 50 ? 'MEDIUM' : 'HIGH');
        badge.textContent = `${risk} RISK`;
        badge.style.color = risk === 'LOW' ? 'var(--accent-green)' : (risk === 'MEDIUM' ? 'var(--accent-amber)' : 'var(--accent-pink)');
        badge.style.background = risk === 'LOW' ? 'rgba(16, 185, 129, 0.1)' : (risk === 'MEDIUM' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(236, 72, 153, 0.1)');
    }

    // AI Insights
    const aiCont = document.getElementById('ai-insights-container');
    aiCont.innerHTML = data.aiInsights.map(i => `
        <div class="ai-topic-item" style="display:flex; align-items:center; gap:12px; padding:12px; background:var(--bg-tertiary); border-radius:10px; border:1px solid var(--border-subtle)">
            <div style="width:32px; height:32px; background:var(--bg-card); display:flex; align-items:center; justify-content:center; border-radius:8px">${i.icon}</div>
            <div style="flex:1">
               <div style="font-size:13px; font-weight:700">${i.topic}</div>
               <div style="font-size:11px; color:${i.accuracy < 50 ? 'var(--accent-pink)' : 'var(--text-tertiary)'}">Topic accuracy: ${i.accuracy}%</div>
            </div>
            <div style="height:4px; width:40px; background:var(--bg-card); border-radius:2px; overflow:hidden">
               <div style="width:${i.accuracy}%; height:100%; background:${i.accuracy < 50 ? 'var(--accent-pink)' : 'var(--accent-blue)'}"></div>
            </div>
        </div>
    `).join('') || '<div style="text-align:center; padding:20px; color:var(--text-tertiary)">No insights available.</div>';
    
    document.getElementById('ai-recommend').textContent = data.riskScore > 20 ? "Caution advised. Review proctoring logs for localized anomalies." : "Excellent system metrics. No immediate intervention required.";

    // Leaderboard
    const lbCont = document.getElementById('leaderboard-mini-list');
    lbCont.innerHTML = data.topPerformers.map((p, i) => `
        <tr style="animation: fadeInRow ${0.3 + i*0.1}s ease forwards; opacity:0">
            <td style="font-weight:800; color:var(--accent-blue)">#${p.rank}</td>
            <td style="font-weight:600">${p.name}</td>
            <td style="font-weight:700">${p.score}</td>
            <td><span class="status-badge published">${p.grade}</span></td>
        </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center; padding:20px">No ranking data.</td></tr>';

    // Chart
    window.renderLineChart('scoreTrendCanvas', data.chartData);
};

window.renderLineChart = function(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth * 2;
    const height = canvas.offsetHeight * 2;
    canvas.width = width;
    canvas.height = height;
    
    const padding = 60;
    const rangeY = 100;
    const stepX = (width - padding*2) / (data.length - 1);
    
    const draw = (progress = 1) => {
        ctx.clearRect(0, 0, width, height);
        
        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for(let i=0; i<=4; i++) {
            const y = padding + i * (height - padding*2) / 4;
            ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(width-padding, y); ctx.stroke();
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
        
        const points = data.map((val, i) => ({
            x: padding + i * stepX,
            y: height - padding - (val / rangeY) * (height - padding*2)
        }));

        points.forEach((p, i) => {
            if(i === 0) ctx.moveTo(p.x, p.y);
            else {
                if(i / data.length <= progress) ctx.lineTo(p.x, p.y);
            }
        });
        ctx.stroke();

        if(progress === 1) {
            // Hot points
            points.forEach(p => {
                ctx.fillStyle = '#3b82f6';
                ctx.shadowBlur = 10; ctx.shadowColor = '#3b82f6';
                ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
            });
            
            // Fill area under curve
            ctx.lineTo(padding + (data.length - 1) * stepX, height - padding);
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
            if(Math.abs(mouseX - x) < 20) {
                const y = height - padding - (val / rangeY) * (height - padding*2);
                tooltip.style.display = 'block';
                tooltip.style.left = (x / 2) + 'px';
                tooltip.style.top = (y / 2 - 40) + 'px';
                tooltip.innerHTML = `Month ${i+1}: ${val}%`;
                found = true;
            }
        });
        if(!found) tooltip.style.display = 'none';
    };
    canvas.onmouseleave = () => document.getElementById('chart-tooltip').style.display = 'none';

    // Animation loop
    let p = 0;
    const animate = () => {
        p += 0.05;
        draw(p);
        if(p < 1) requestAnimationFrame(animate);
    };
    animate();
};

window.animateCounter = function(id, target, suffix = '') {
    const el = document.getElementById(id);
    if(!el) return;
    let current = 0;
    const step = target / 30;
    const timer = setInterval(() => {
        current += step;
        if(current >= target) {
            current = target;
            clearInterval(timer);
        }
        el.textContent = Math.floor(current).toLocaleString() + suffix;
    }, 20);
};

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
   // Synchronize analytics once DOM is ready
});

// Update the section switcher to trigger analytics if needed
const originalSwitchSection = window.switchSection;
window.switchSection = function(id) {
    if(typeof originalSwitchSection === 'function') originalSwitchSection(id);
    if(id === 'analytics-section') {
        window.refreshAnalytics();
        
        // Populate exam filter once
        const filter = document.getElementById('analyticsExamFilter');
        if(filter && filter.options.length <= 1 && window.examsData) {
            window.examsData.forEach(ex => {
                const opt = document.createElement('option');
                opt.value = ex.id;
                opt.textContent = ex.title;
                filter.appendChild(opt);
            });
        }
    }
};
/* ============================================================
   ATTEMPTS MONITORING ENGINE
   ============================================================ */

window.attemptsData = [];
window.filteredAttempts = [];
window.currentAttPage = 1;
const attPageSize = 8;
let attemptsAutoRefreshInterval = null;
let attemptsRefreshInFlight = false;

function ensureAttemptsAutoRefresh() {
    if (attemptsAutoRefreshInterval) return;
    const badge = document.getElementById('autoRefreshBadge');
    if (badge) badge.textContent = 'AUTO-SYNC: 30s';
    attemptsAutoRefreshInterval = setInterval(() => {
        if (attemptsRefreshInFlight) return;
        window.refreshAttempts();
    }, 30000);
}

window.refreshAttempts = async function() {
    if (attemptsRefreshInFlight) return;
    attemptsRefreshInFlight = true;
    const btn = document.querySelector('[onclick="refreshAttempts()"]');
    if(btn) btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Syncing...';

    try {
        // Simulate API Delay
        await new Promise(r => setTimeout(r, 600));
        
        // Generate/Load Mock Data
        const students = ["John Doe", "Sarah Miller", "Michael Chen", "Emma Wilson", "David Brown", "Sophia Rodriguez", "James Wilson", "Isabella Moore"];
        const exams = window.examsData || [{title: "JavaScript Fundamentals", id: "JS101"}];
        const statuses = ["STARTED", "COMPLETED", "INVALIDATED", "AUTO_SUBMITTED", "EXPIRED"];
        const risks = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
        
        const count = 50;
        const newData = [];
        for(let i=0; i<count; i++) {
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const riskScore = Math.floor(Math.random() * 100);
            const stIdx = Math.floor(Math.random() * students.length);
            const exIdx = Math.floor(Math.random() * exams.length);
            
            newData.push({
                id: `AT_${Math.floor(1000 + Math.random()*9000)}_${i}`,
                studentName: students[stIdx],
                studentEmail: students[stIdx].toLowerCase().replace(' ','') + "@edu.com",
                examTitle: exams[exIdx].title,
                examId: exams[exIdx].id,
                attemptNumber: Math.floor(Math.random()*3) + 1,
                status: status,
                score: status === 'COMPLETED' ? Math.floor(Math.random()*50) + 50 : 0,
                percentage: status === 'COMPLETED' ? Math.floor(Math.random()*40) + 60 : 0,
                cheatingScore: riskScore,
                riskLevel: riskScore < 30 ? "LOW" : (riskScore < 60 ? "MEDIUM" : (riskScore < 80 ? "HIGH" : "CRITICAL")),
                startTime: "2024-03-03 14:20",
                endTime: status === 'COMPLETED' ? "2024-03-03 15:40" : "-",
                duration: "1h 20m",
                tabSwitches: Math.floor(Math.random()*12),
                fullscreenViolations: Math.floor(Math.random()*5),
                ip: `192.168.1.${10 + i}`,
                device: "MacBook Pro",
                browser: "Chrome v122",
                date: "2024-03-03"
            });
        }
        
        window.attemptsData = newData;
        
        // Populate Exam Filter if empty
        const examFilter = document.getElementById('attExam');
        if(examFilter && examFilter.options.length <= 1) {
            exams.forEach(ex => {
                const opt = document.createElement('option');
                opt.value = ex.title;
                opt.textContent = ex.title;
                examFilter.appendChild(opt);
            });
        }

        window.handleAttemptFilters();
        window.updateAttemptStats();
        ensureAttemptsAutoRefresh();
    } finally {
        if(btn) btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sync Engine';
        attemptsRefreshInFlight = false;
    }
};

window.stopAttemptsAutoRefresh = function() {
    if (attemptsAutoRefreshInterval) {
        clearInterval(attemptsAutoRefreshInterval);
        attemptsAutoRefreshInterval = null;
    }
};

window.updateAttemptStats = function() {
    const data = window.attemptsData;
    const stats = {
        total: data.length,
        active: data.filter(a => a.status === 'STARTED').length,
        completed: data.filter(a => a.status === 'COMPLETED').length,
        auto: data.filter(a => a.status === 'AUTO_SUBMITTED').length,
        cancelled: data.filter(a => a.status === 'INVALIDATED').length,
        highRisk: data.filter(a => a.cheatingScore > 60).length,
        avgScore: Math.round(data.filter(a => a.status === 'COMPLETED').reduce((acc, curr) => acc + curr.percentage, 0) / (data.filter(a => a.status === 'COMPLETED').length || 1)),
        avgCheat: Math.round(data.reduce((acc, curr) => acc + curr.cheatingScore, 0) / (data.length || 1))
    };

    window.animateCounter('att-total', stats.total);
    window.animateCounter('att-active', stats.active);
    window.animateCounter('att-completed', stats.completed);
    window.animateCounter('att-auto', stats.auto);
    window.animateCounter('att-cancelled', stats.cancelled);
    window.animateCounter('att-high-risk', stats.highRisk);
    window.animateCounter('att-avg-score', stats.avgScore, '%');
    window.animateCounter('att-avg-cheat', stats.avgCheat, '%');
};

window.handleAttemptFilters = function() {
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

window.resetAttemptFilters = function() {
    document.getElementById('attSearch').value = '';
    document.getElementById('attStatus').value = 'all';
    document.getElementById('attRisk').value = 'all';
    document.getElementById('attExam').value = 'all';
    document.getElementById('attDate').value = '';
    window.handleAttemptFilters();
};

window.renderAttemptsTable = function() {
    const tbody = document.getElementById('attemptsTableBody');
    const emptyState = document.getElementById('attemptsEmptyState');
    const pagin = document.getElementById('attemptsPagination');
    
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const start = (window.currentAttPage - 1) * attPageSize;
    const end = start + attPageSize;
    const pageItems = window.filteredAttempts.slice(start, end);
    
    if(pageItems.length === 0) {
        emptyState.style.display = 'block';
        pagin.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    pagin.style.display = 'flex';
    
    pageItems.forEach((att, idx) => {
        const statusClass = att.status.toLowerCase().replace('_','-');
        const riskClass = `risk-${att.riskLevel.toLowerCase()}`;
        
        const tr = document.createElement('tr');
        tr.style.animation = `fadeInRow ${0.2 + (idx * 0.05)}s ease forwards`;
        tr.style.opacity = '0';
        tr.innerHTML = `
            <td style="font-family:'JetBrains Mono'; font-size:11px; color:var(--accent-blue)">${att.id}</td>
            <td style="font-weight:600">${att.studentName}</td>
            <td style="font-size:12px">${att.examTitle}</td>
            <td>${att.attemptNumber}</td>
            <td><span class="status-badge ${statusClass}">${att.status}</span></td>
            <td style="font-weight:700">${att.score || '-'}</td>
            <td style="font-weight:700">${att.percentage ? att.percentage+'%' : '-'}</td>
            <td style="color:${att.cheatingScore > 60 ? 'var(--accent-pink)' : 'inherit'}">${att.cheatingScore}%</td>
            <td><span class="risk-badge ${riskClass}">${att.riskLevel}</span></td>
            <td style="font-size:11px; color:var(--text-tertiary)">${att.startTime}</td>
            <td>
                <div class="action-wrap">
                    <button class="btn btn-ghost btn-sm" onclick="openAttemptDrawer('${att.id}')">View</button>
                    ${att.status === 'STARTED' ? `<button class="btn btn-ghost btn-sm" onclick="forceSubmit('${att.id}')" style="color:var(--accent-amber)">Force</button>` : ''}
                    ${att.status === 'STARTED' ? `<button class="btn btn-ghost btn-sm" onclick="requestCancelAttempt('${att.id}')" style="color:var(--accent-pink)">Cancel</button>` : ''}
                    ${att.status === 'COMPLETED' ? `<button class="btn btn-ghost btn-sm" onclick="viewAttemptResult('${att.id}')">Result</button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Pagination Labels
    document.getElementById('attRowRange').textContent = `${start + 1}-${Math.min(end, window.filteredAttempts.length)}`;
    document.getElementById('attTotalFiltered').textContent = window.filteredAttempts.length;
};

window.openAttemptDrawer = async function(id) {
    const drawer = document.getElementById('attemptIntelDrawer');
    const loading = document.getElementById('drawerLoadingState');
    const body = document.getElementById('drawerBody');
    if(!drawer || !loading || !body) {
        return;
    }

    drawer.classList.add('active');
    loading.style.display = 'block';
    body.style.display = 'none';
    
    // Simulate Fetch
    await new Promise(r => setTimeout(r, 400));
    const att = window.attemptsData.find(a => a.id === id);
    if(!att) {
        loading.style.display = 'none';
        body.style.display = 'block';
        body.innerHTML = '<div style="padding:24px; text-align:center; color:var(--text-tertiary)">Attempt data not found.</div>';
        return;
    }
    
    document.getElementById('drawerAttemptID').textContent = att.id;
    document.getElementById('drawerStudentName').textContent = att.studentName;
    document.getElementById('drawerStudentEmail').textContent = att.studentEmail;
    document.getElementById('drawerStudentAvatar').src = `https://ui-avatars.com/api/?name=${att.studentName.replace(' ','+')}&background=3b82f6&color=fff`;
    
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

window.closeAttemptDrawer = function() {
    document.getElementById('attemptIntelDrawer').classList.remove('active');
};

window.forceSubmit = function(id) {
    if(confirm('Are you sure you want to FORCE SUBMIT this attempt? The student will be disconnected.')) {
        showToast('Attempt submitted successfully', 'success');
        window.refreshAttempts();
    }
};

window.cancelAttempt = function(id) {
    const att = (window.attemptsData || []).find(a => a.id === id);
    if(!att) return false;
    att.status = 'INVALIDATED';
    att.endTime = new Date().toLocaleString('en-IN');
    window.handleAttemptFilters();
    window.updateAttemptStats();
    showToast('Attempt invalidated', 'warning');
    return true;
};

window.requestCancelAttempt = function(id) {
    window.examToDeleteId = null;
    window.teacherToDeleteId = null;
    window.studentToDeleteId = null;
    window.certToRevokeId = null;
    window.attemptToCancelId = id;
    const att = (window.attemptsData || []).find(a => a.id === id);
    if(typeof window.prepareDeleteConfirmModal === 'function') {
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

window.viewAttemptResult = function(id) {
    showToast('Redirecting to full result report...', 'info');
};

// Pagination Controls
document.getElementById('prevAttPage').onclick = () => {
    if(window.currentAttPage > 1) {
        window.currentAttPage--;
        window.renderAttemptsTable();
    }
};
document.getElementById('nextAttPage').onclick = () => {
    const maxPage = Math.ceil(window.filteredAttempts.length / attPageSize);
    if(window.currentAttPage < maxPage) {
        window.currentAttPage++;
        window.renderAttemptsTable();
    }
};
/* ============================================================
   AI PROCTORING MONITOR ENGINE
   ============================================================ */

window.proctoringMonitorData = [];
window.activeProctorFilter = 'all';

window.refreshProctoring = async function() {
    const btn = document.querySelector('[onclick="refreshProctoring()"]');
    if(btn) btn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Refreshing...';
    
    // Simulate AI Sync
    await new Promise(r => setTimeout(r, 800));
    
    const students = ["John Doe", "Sarah Miller", "Michael Chen", "Emma Wilson", "David Brown", "Sophia Rodriguez", "James Wilson", "Isabella Moore"];
    const exams = ["Advanced JavaScript", "Machine Learning Basics", "Cloud Security", "Fullstack Development"];
    const types = ["FACE_MISMATCH", "TAB_SWITCH", "MULTIPLE_FACES", "OBJECT_DETECTED"];
    
    const count = 40;
    const newData = [];
    for(let i=0; i<count; i++) {
        const score = Math.floor(Math.random() * 120);
        const riskLevel = score < 50 ? "LOW" : (score < 80 ? "MEDIUM" : (score < 100 ? "HIGH" : "CRITICAL"));
        const sIdx = Math.floor(Math.random() * students.length);
        const eIdx = Math.floor(Math.random() * exams.length);
        
        newData.push({
            id: `PM_${1000 + i}`,
            studentId: `STU_${9000 + i}`,
            studentName: students[sIdx],
            examTitle: exams[eIdx],
            violationType: types[Math.floor(Math.random()*4)],
            severity: score > 90 ? "HIGH" : (score > 60 ? "MEDIUM" : "LOW"),
            cheatingScore: score,
            riskLevel: riskLevel,
            status: score > 90 ? "CANCELLED" : (score > 70 ? "FLAGGED" : "SUSPICIOUS"),
            timestamp: "14:45:12",
            date: "2024-03-03"
        });
    }
    
    window.proctoringMonitorData = newData;
    if(btn) btn.innerHTML = '<i class="fas fa-sync"></i> Refresh';
    
    window.runProctorFilter(window.activeProctorFilter);
    window.updateProctorMonitorStats();
};

window.updateProctorMonitorStats = function() {
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

window.runProctorFilter = function(val) {
    window.activeProctorFilter = val;
    const tbody = document.getElementById('proctoring-monitor-list');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const filtered = window.proctoringMonitorData.filter(d => {
        if(val === 'all') return true;
        if(val === 'CANCELLED' || val === 'SUSPICIOUS') return d.status === val;
        return d.riskLevel === val;
    });

    if(filtered.length === 0) {
        document.getElementById('proctorEmptyState').style.display = 'block';
        return;
    }

    document.getElementById('proctorEmptyState').style.display = 'none';
    filtered.forEach((item, idx) => {
        const riskClass = `pm-risk-${item.riskLevel.toLowerCase()}`;
        const statusClass = `pm-status-${item.status.toLowerCase()}`;
        const isHigh = item.riskLevel === 'HIGH' || item.riskLevel === 'CRITICAL';
        
        const tr = document.createElement('tr');
        if(isHigh) tr.classList.add('high-risk-highlight');
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

window.openPMEvents = function(id) {
    const modal = document.getElementById('pmEventsModal');
    const tbody = document.getElementById('pmEventsList');
    tbody.innerHTML = '';
    
    // Static Evidence Logs
    const events = [
        { type: "TAB_SWITCH", sev: "MEDIUM", score: 45, detail: "Switched to browser window search", time: "14:45:10" },
        { type: "FACE_MISMATCH", sev: "HIGH", score: 85, detail: "Primary face not detected in frame", time: "14:47:22" }
    ];
    
    events.forEach(ev => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:700">${ev.type}</td>
            <td><span class="pm-severity-${ev.sev.toLowerCase()}">${ev.sev}</span></td>
            <td style="font-weight:800">${ev.score}</td>
            <td class="pm-event-detail">${ev.detail}</td>
            <td class="pm-event-time">${ev.time}</td>
            <td style="text-align:right"><button class="btn btn-ghost btn-sm" onclick="openPMEvidence('${id}')">View</button></td>
        `;
        tbody.appendChild(tr);
    });
    
    modal.classList.add('active');
};

window.openPMSummary = function(id) {
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

window.openPMEvidence = function(id) {
    const modal = document.getElementById('pmEvidenceModal');
    const content = document.getElementById('pmEvidenceContent');
    content.innerHTML = '<span style="color:var(--text-tertiary)">Syncing forensics evidence...</span>';
    
    setTimeout(() => {
        content.innerHTML = `<img src="https://picsum.photos/seed/${id}/600/400" style="max-width:100%; display:block; border-radius:8px">`;
    }, 800);
    
    modal.classList.add('active');
};

window.triggerProcAnalysis = function(id) {
    showToast('AI Auditing task queued for session: ' + id, 'info');
};

window.cancelProcAttempt = function(id) {
    if(confirm('Are you sure you want to CANCEL this proctoring session?')) {
        showToast('Session ' + id + ' has been cancelled.', 'success');
        // Remove from data and re-render
        window.proctoringMonitorData = window.proctoringMonitorData.filter(d => d.id !== id);
        window.runProctorFilter(window.activeProctorFilter);
        window.updateProctorMonitorStats();
    }
};

// Click-based dropdown toggle (replaces unreliable hover)
window.toggleDropdown = function(e, btnEl) {
    if(e) {
        e.stopPropagation();
        e.preventDefault();
    }
    const btn = btnEl || e?.currentTarget || e?.target?.closest('button');
    if(!btn) return;
    const wrapper = btn.closest('.dropdown');
    const content = wrapper ? wrapper.querySelector('.dropdown-content') : null;
    if(!content) return;

    // Close all other open dropdowns first
    document.querySelectorAll('.dropdown-content.show').forEach(d => {
        if(d !== content) d.classList.remove('show');
    });

    content.classList.toggle('show');
};

// Close dropdowns when clicking anywhere outside
document.addEventListener('click', function(e) {
    if(!e.target.closest('.dropdown')) {
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

window.initCertificatesEngine = function() {
    const colleges = ['MIT', 'Stanford University', 'Harvard', 'Oxford', 'Caltech'];
    const depts = ['Computer Science', 'Data Science', 'Electrical Engineering', 'Cybersecurity'];
    const exams = ['Machine Learning Basics', 'Advanced JavaScript', 'Cloud Security', 'Fullstack Development'];
    
    if(window.allCertificates.length > 0) {
        window.certLoading = false;
        window.renderCertPage();
        return;
    }
    
    window.certLoading = true;
    window.renderCertPage();
    
    setTimeout(() => {
        window.allCertificates = Array.from({length: 45}).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - Math.floor(Math.random() * 30));
            const score = Math.floor(Math.random() * 40) + 60;
            let grade = 'C';
            if(score >= 95) grade = 'A+';
            else if(score >= 85) grade = 'A';
            else if(score >= 75) grade = 'B';
            else if(score < 65) grade = 'Fail';
            
            return {
                id: 'CERT-2026-' + (8000 + i),
                name: ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Williams', 'Charlie Brown'][i % 5] + ' ' + (i+1),
                avatar: `https://ui-avatars.com/api/?name=Student+${i}&background=random`,
                college: colleges[i % colleges.length],
                dept: depts[i % depts.length],
                roll: 'ROLL-' + (1000 + i),
                section: String.fromCharCode(65 + (i % 3)),
                exam: exams[i % exams.length],
                score: score,
                grade: grade,
                date: d.toISOString().split('T')[0],
                active: Math.random() > 0.15
            };
        });
        
        // Use onclick directly to avoid duplicate listeners
        const prevBtn = document.getElementById('prevCertPage');
        if(prevBtn) {
            prevBtn.onclick = () => {
                if(window.certPage > 1) {
                    window.certPage--;
                    window.renderCertPage();
                }
            };
        }
    
        const nextBtn = document.getElementById('nextCertPage');
        if(nextBtn) {
            nextBtn.onclick = () => {
                const maxPage = Math.ceil(window.filteredCerts.length / window.certPageSize);
                if(window.certPage < maxPage) {
                    window.certPage++;
                    window.renderCertPage();
                }
            };
        }
        
        const examSelect = document.getElementById('certFilterExam');
        if(examSelect) {
            const examSet = new Set(window.allCertificates.map(c => c.exam));
            examSelect.innerHTML = '<option value="all">Any Exam</option>' + Array.from(examSet).map(e => `<option value="${e}">${e}</option>`).join('');
        }
        
        const deptSelect = document.getElementById('certFilterDept');
        if(deptSelect) {
            const deptSet = new Set(window.allCertificates.map(c => c.dept));
            deptSelect.innerHTML = '<option value="all">Any Dept</option>' + Array.from(deptSet).map(d => `<option value="${d}">${d}</option>`).join('');
        }
        
        window.certLoading = false;
        window.handleCertFilters();
    }, 800);
};

window.handleCertFilters = function() {
    const q = (document.getElementById('certSearch')?.value || '').toLowerCase();
    const statusF = document.getElementById('certFilterStatus')?.value || 'all';
    const gradeF = document.getElementById('certFilterGrade')?.value || 'all';
    const examF = document.getElementById('certFilterExam')?.value || 'all';
    const deptF = document.getElementById('certFilterDept')?.value || 'all';
    
    window.filteredCerts = window.allCertificates.filter(c => {
        if(q && !c.id.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return false;
        if(statusF !== 'all' && c.active.toString() !== statusF) return false;
        if(gradeF !== 'all' && c.grade !== gradeF) return false;
        if(examF !== 'all' && c.exam !== examF) return false;
        if(deptF !== 'all' && c.dept !== deptF) return false;
        return true;
    });
    
    window.filteredCerts.sort((a,b) => {
        let valA = a[window.certSortCol];
        let valB = b[window.certSortCol];
        if(valA < valB) return window.certSortAsc ? -1 : 1;
        if(valA > valB) return window.certSortAsc ? 1 : -1;
        return 0;
    });
    
    window.certPage = 1;
    window.renderCertPage();
};

window.sortCerts = function(col) {
    if(window.certSortCol === col) {
        window.certSortAsc = !window.certSortAsc;
    } else {
        window.certSortCol = col;
        window.certSortAsc = true;
    }
    window.handleCertFilters();
};

window.resetCertFilters = function() {
    if(document.getElementById('certSearch')) document.getElementById('certSearch').value = '';
    if(document.getElementById('certFilterStatus')) document.getElementById('certFilterStatus').value = 'all';
    if(document.getElementById('certFilterGrade')) document.getElementById('certFilterGrade').value = 'all';
    if(document.getElementById('certFilterExam')) document.getElementById('certFilterExam').value = 'all';
    if(document.getElementById('certFilterDept')) document.getElementById('certFilterDept').value = 'all';
    window.handleCertFilters();
};

window.refreshCertificates = function() {
    if(window.showToast) window.showToast('Re-syncing with credential registry...', 'info');
    window.allCertificates = [];
    window.initCertificatesEngine();
};

window.renderCertPage = function() {
    const tbody = document.getElementById('certs-list');
    const emptyState = document.getElementById('certEmptyState');
    if(!tbody || !emptyState) return;

    if(window.certLoading) {
        const createSkeletons = () => Array.from({length:5}).map(() => `
            <tr>
                <td><div class="skeleton" style="width:36px; height:36px; border-radius:50%"></div></td>
                <td><div class="skeleton" style="width:80px; height:14px; border-radius:4px"></div></td>
                <td><div class="skeleton" style="width:120px; height:14px; border-radius:4px"></div></td>
                <td><div class="skeleton" style="width:150px; height:14px; border-radius:4px"></div></td>
                <td><div class="skeleton" style="width:100px; height:14px; border-radius:4px"></div></td>
                <td><div class="skeleton" style="width:70px; height:14px; border-radius:4px"></div></td>
                <td><div class="skeleton" style="width:40px; height:14px; border-radius:4px"></div></td>
                <td><div class="skeleton" style="width:140px; height:14px; border-radius:4px"></div></td>
                <td><div class="skeleton" style="width:30px; height:14px; border-radius:4px"></div></td>
                <td><div class="skeleton" style="width:40px; height:20px; border-radius:8px"></div></td>
                <td><div class="skeleton" style="width:80px; height:14px; border-radius:4px"></div></td>
                <td><div class="skeleton" style="width:60px; height:20px; border-radius:8px"></div></td>
                <td><div class="skeleton" style="width:180px; height:24px; border-radius:6px; float:right"></div></td>
            </tr>
        `).join('');
        tbody.innerHTML = createSkeletons();
        emptyState.style.display = 'none';
        return;
    }

    const total = window.allCertificates.length;
    const active = window.allCertificates.filter(c => c.active).length;
    const revoked = total - active;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = window.allCertificates.filter(c => c.date === todayStr).length;
    
    const animateStat = (id, val) => {
        const el = document.getElementById(id);
        if(el) {
            el.textContent = val;
            el.style.animation = 'none';
            el.offsetHeight; 
            el.style.animation = 'scaleIn 0.4s ease';
        }
    };
    animateStat('cert-stat-total', total);
    animateStat('cert-stat-active', active);
    animateStat('cert-stat-revoked', revoked);
    animateStat('cert-stat-today', todayCount);
    
    if(window.filteredCerts.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        document.getElementById('certPageInfo').textContent = 'Showing 0 items';
        return;
    }
    emptyState.style.display = 'none';
    
    const maxPage = Math.ceil(window.filteredCerts.length / window.certPageSize);
    if(window.certPage > maxPage) window.certPage = maxPage;
    if(window.certPage < 1) window.certPage = 1;

    const startIdx = (window.certPage - 1) * window.certPageSize;
    const items = window.filteredCerts.slice(startIdx, startIdx + window.certPageSize);
    
    document.getElementById('certPageInfo').textContent = `Showing ${startIdx + 1} to ${startIdx + items.length} of ${window.filteredCerts.length}`;
    
    tbody.innerHTML = items.map((c, idx) => `
        <tr onclick="openCertView('${c.id}')" style="animation: fadeInRow ${0.1 + (idx*0.05)}s ease forwards; opacity:0">
            <td>
                <div class="student-cell">
                    <img src="${c.avatar}" class="cert-avatar">
                    <div class="student-info">
                        <span style="font-weight:700; color:var(--text-primary)">${c.name}</span>
                        <span class="student-sub">${c.college}</span>
                    </div>
                </div>
            </td>
            <td class="cert-id-cell">${c.id}</td>
            <td style="font-size:11px; font-weight:500; color:var(--text-secondary)">${c.dept}</td>
            <td style="font-family:'JetBrains Mono'; font-size:11px">${c.roll}</td>
            <td style="font-size:11px; text-align:center">${c.section}</td>
            <td style="font-size:11px; font-weight:600">${c.exam}</td>
            <td style="font-weight:800; color:var(--text-primary); text-align:center">${c.score}</td>
            <td style="text-align:center"><span class="cert-grade-badge cert-grade-${c.grade.replace('+', '\\+')}">${c.grade}</span></td>
            <td style="font-size:11px; white-space:nowrap">${c.date}</td>
            <td style="text-align:center"><span class="status-badge ${c.active ? 'green-badge' : 'red-badge'}" id="badge-${c.id}">${c.active ? 'Active' : 'Revoked'}</span></td>
            <td onclick="event.stopPropagation()" class="action-col">
                <div class="action-wrap">
                    <button class="btn btn-ghost btn-xs cert-icon-btn" onclick="openCertView('${c.id}')" title="View Details"><i class="fas fa-eye"></i> View</button>
                    ${c.active ? `<button class="btn btn-ghost btn-xs cert-icon-btn" onclick="verifyCert('${c.id}')" style="color:var(--accent-amber)" title="Verify Authenticity"><i class="fas fa-certificate"></i> Verify</button>` : ''}
                    ${c.active ? `<button class="btn btn-primary btn-xs cert-icon-btn" onclick="downloadCert('${c.id}')" id="dl-${c.id}" title="Download PDF"><i class="fas fa-download"></i> DL</button>` : ''}
                    ${c.active ? `<button class="btn btn-ghost btn-xs cert-icon-btn" onclick="revokeCert('${c.id}')" style="color:var(--accent-pink)" title="Revoke Certificate"><i class="fas fa-ban"></i> Revoke</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
};

window.openCertView = function(id) {
    const c = window.allCertificates.find(x => x.id === id);
    if(!c) return;
    
    document.getElementById('certModalPhoto').src = c.avatar;
    document.getElementById('certModalName').textContent = c.name;
    document.getElementById('certModalDept').textContent = c.dept;
    document.getElementById('certModalCollege').textContent = c.college;
    document.getElementById('certModalRoll').textContent = c.roll;
    document.getElementById('certModalSec').textContent = c.section;
    document.getElementById('certModalExam').textContent = c.exam;
    
    document.getElementById('certModalScore').textContent = c.score;
    const gradeEl = document.getElementById('certModalGrade');
    gradeEl.className = `cert-grade-badge cert-grade-${c.grade.replace('+','\\+')}`;
    gradeEl.textContent = c.grade;
    
    document.getElementById('certModalID').textContent = c.id;
    document.getElementById('certModalDate').textContent = c.date;
    document.getElementById('certModalQR').src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=verify:${c.id}`;
    
    const dlbtn = document.getElementById('certModalDownloadBtn');
    dlbtn.style.display = c.active ? 'inline-flex' : 'none';
    dlbtn.onclick = () => window.downloadCert(c.id);
    
    if(window.openModal) window.openModal('certificateViewModal');
};

window.downloadCert = function(id) {
    const btn = document.getElementById('dl-' + id);
    const mainBtn = document.getElementById('certModalDownloadBtn');
    
    if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> DL';
    if(mainBtn) mainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
    
    setTimeout(() => {
        if(btn) btn.innerHTML = '<i class="fas fa-download"></i> DL';
        if(mainBtn) mainBtn.innerHTML = '<i class="fas fa-download"></i> Download PDF';
        if(window.showToast) window.showToast('Certificate ' + id + ' downloaded successfully!', 'success');
    }, 1500);
};

window.verifyCert = function(id) {
    const c = window.allCertificates.find(x => x.id === id);
    if(!c) return;
    
    const title = document.getElementById('certVerifyTitle');
    const desc = document.getElementById('certVerifyDesc');
    const status = document.getElementById('certVerifyStatus');
    
    if(!title || !desc || !status) return;

    title.textContent = `Verifying ID: ${id}`;
    desc.textContent = 'Querying encrypted registry nodes...';
    status.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" style="color:var(--accent-blue)"></i>';
    
    if(window.openModal) window.openModal('certVerifyModal');
    
    setTimeout(() => {
        if(c.active) {
            status.innerHTML = '<i class="fa-solid fa-circle-check" style="color:var(--accent-green)"></i>';
            desc.innerHTML = 'Verification Successful!<br><span style="color:var(--text-primary); font-weight:700">Valid Credential</span> mapped to secure registry.';
        } else {
            status.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color:var(--accent-pink)"></i>';
            desc.innerHTML = 'Verification Failed!<br><span style="color:var(--accent-pink); font-weight:700">Certificate Revoked</span> by issuer or platform security.';
        }
    }, 1500);
};

window.renderCertPage = function() {
    const tbody = document.getElementById('certs-list');
    const emptyState = document.getElementById('certEmptyState');
    if(!tbody || !emptyState) return;

    if(window.certLoading) {
        const createSkeletons = () => Array.from({length:5}).map(() => `
            <tr>
                <td colspan="11">
                    <div class="skeleton" style="width:100%; height:40px; border-radius:8px; margin:4px 0"></div>
                </td>
            </tr>
        `).join('');
        tbody.innerHTML = createSkeletons();
        emptyState.style.display = 'none';
        return;
    }

    const total = window.allCertificates.length;
    const active = window.allCertificates.filter(c => c.active).length;
    const revoked = total - active;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = window.allCertificates.filter(c => c.date === todayStr).length;
    
    const animateStat = (id, val) => {
        const el = document.getElementById(id);
        if(el) {
            el.textContent = val;
            el.style.animation = 'scaleIn 0.4s ease';
        }
    };
    animateStat('cert-stat-total', total);
    animateStat('cert-stat-active', active);
    animateStat('cert-stat-revoked', revoked);
    animateStat('cert-stat-today', todayCount);
    
    if(window.filteredCerts.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        document.getElementById('certPageInfo').textContent = 'Showing 0 items';
        return;
    }
    emptyState.style.display = 'none';
    
    const maxPage = Math.ceil(window.filteredCerts.length / window.certPageSize);
    if(window.certPage > maxPage) window.certPage = maxPage;
    if(window.certPage < 1) window.certPage = 1;

    const startIdx = (window.certPage - 1) * window.certPageSize;
    const items = window.filteredCerts.slice(startIdx, startIdx + window.certPageSize);
    
    document.getElementById('certPageInfo').textContent = `Showing ${startIdx + 1} to ${startIdx + items.length} of ${window.filteredCerts.length}`;
    
    tbody.innerHTML = items.map((c, idx) => `
        <tr onclick="openCertView('${c.id}')" style="animation: fadeInRow ${0.1 + (idx*0.05)}s ease forwards; opacity:0">
            <td>
                <div class="student-cell">
                    <img src="${c.avatar}" class="cert-avatar">
                    <div class="student-info">
                        <span style="font-weight:700; color:var(--text-primary)">${c.name}</span>
                        <span class="student-sub">${c.college}</span>
                    </div>
                </div>
            </td>
            <td class="cert-id-cell">${c.id}</td>
            <td style="font-size:11px; font-weight:500; color:var(--text-secondary)">${c.dept}</td>
            <td style="font-family:'JetBrains Mono'; font-size:11px; text-align:center">${c.roll}</td>
            <td style="font-size:11px; text-align:center">${c.section}</td>
            <td style="font-size:11px; font-weight:600">${c.exam}</td>
            <td style="font-weight:800; color:var(--text-primary); text-align:center">${c.score}</td>
            <td style="text-align:center"><span class="cert-grade-badge cert-grade-${c.grade.replace('+', '\\+')}">${c.grade}</span></td>
            <td style="font-size:11px; white-space:nowrap">${c.date}</td>
            <td style="text-align:center"><span class="status-badge ${c.active ? 'green-badge' : 'red-badge'}" id="badge-${c.id}">${c.active ? 'Active' : 'Revoked'}</span></td>
            <td onclick="event.stopPropagation()" class="action-col">
                <div class="action-wrap">
                    <button class="btn btn-ghost btn-xs cert-icon-btn" onclick="openCertView('${c.id}')" title="Details"><i class="fa-solid fa-eye"></i> View</button>
                    ${c.active ? `<button class="btn btn-ghost btn-xs cert-icon-btn" onclick="verifyCert('${c.id}')" style="color:var(--accent-amber)" title="Verify Blockchain"><i class="fa-solid fa-certificate"></i> Verify</button>` : ''}
                    ${c.active ? `<button class="btn btn-primary btn-xs cert-icon-btn" onclick="downloadCert('${c.id}')" id="dl-${c.id}" title="Download PDF"><i class="fa-solid fa-download"></i> PDF</button>` : ''}
                    ${c.active ? `<button class="btn btn-ghost btn-xs cert-icon-btn" onclick="revokeCert('${c.id}')" style="color:var(--accent-pink)" title="Revoke Certificate"><i class="fa-solid fa-ban"></i> Revoke</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
};

window.revokeCert = function(id) {
    window.examToDeleteId = null;
    window.teacherToDeleteId = null;
    window.studentToDeleteId = null;
    window.certToRevokeId = id;
    const cert = (window.allCertificates || []).find(c => c.id === id);
    if(typeof window.prepareDeleteConfirmModal === 'function') {
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

window.initLeaderboardEngine = function() {
    if(window.allLeaderboard.length > 0) {
        window.lbLoading = false;
        window.renderLBSection();
        return;
    }
    
    const depts = ['Computer Science', 'Data Science', 'Electrical Engineering', 'Cybersecurity'];
    const exams = ['Machine Learning Basics', 'Advanced JavaScript', 'Cloud Security', 'Fullstack Development'];
    
    window.allLeaderboard = Array.from({length: 60}).map((_, i) => {
        const score = Math.floor(Math.random() * 50) + 50; // 50-100
        const percentage = score; 
        const passing = 60;
        
        return {
            rank: 0,
            id: 'STUD-' + (202600 + i),
            name: ['Sarah Connor', 'James Bond', 'Ellen Ripley', 'Tony Stark', 'Bruce Wayne', 'Peter Parker', 'Natasha Romanoff'][i % 7] + ' ' + (i+1),
            avatar: `https://ui-avatars.com/api/?name=S+${i}&background=random`,
            dept: depts[i % depts.length],
            exam: exams[i % exams.length],
            score: score,
            percentage: percentage,
            attempts: Math.floor(Math.random() * 3) + 1,
            status: percentage >= passing ? 'PASS' : 'FAIL'
        };
    });

    // Initialize Pagination buttons
    const prevBtn = document.getElementById('prevLBPage');
    if(prevBtn) {
        prevBtn.onclick = () => {
            if(window.lbPage > 1) {
                window.lbPage--;
                window.renderLBSection();
            }
        };
    }
    const nextBtn = document.getElementById('nextLBPage');
    if(nextBtn) {
        nextBtn.onclick = () => {
            const maxPage = Math.ceil(window.filteredLB.length / window.lbPageSize);
            if(window.lbPage < maxPage) {
                window.lbPage++;
                window.renderLBSection();
            }
        };
    }

    // Fill Selects
    const examSelect = document.getElementById('lbFilterExam');
    if(examSelect) {
        const examSet = new Set(window.allLeaderboard.map(c => c.exam));
        examSelect.innerHTML = '<option value="all">Any Exam</option>' + Array.from(examSet).map(e => `<option value="${e}">${e}</option>`).join('');
    }
    const deptSelect = document.getElementById('lbFilterDept');
    if(deptSelect) {
        const deptSet = new Set(window.allLeaderboard.map(c => c.dept));
        deptSelect.innerHTML = '<option value="all">Any Dept</option>' + Array.from(deptSet).map(d => `<option value="${d}">${d}</option>`).join('');
    }

    window.lbLoading = false;
    window.handleLeaderboardFilters();
};

window.handleLeaderboardFilters = function() {
    const q = (document.getElementById('lbSearch')?.value || '').toLowerCase();
    const examF = document.getElementById('lbFilterExam')?.value || 'all';
    const deptF = document.getElementById('lbFilterDept')?.value || 'all';
    const rankF = document.getElementById('lbFilterRank')?.value || 'all';
    const minPct = parseFloat(document.getElementById('lbFilterPct')?.value || 0);

    // Initial Sort by Score Desc to assign ranks
    window.allLeaderboard.sort((a,b) => b.score - a.score);
    window.allLeaderboard.forEach((item, idx) => item.rank = idx + 1);

    window.filteredLB = window.allLeaderboard.filter(c => {
        if(q && !c.id.toLowerCase().includes(q) && !c.name.toLowerCase().includes(q)) return false;
        if(examF !== 'all' && c.exam !== examF) return false;
        if(deptF !== 'all' && c.dept !== deptF) return false;
        if(minPct > 0 && c.percentage < minPct) return false;
        if(rankF !== 'all') {
            const [min, max] = rankF.split('-').map(Number);
            if(c.rank < min || c.rank > max) return false;
        }
        return true;
    });

    // Custom Column Sort
    window.filteredLB.sort((a,b) => {
        let valA = a[window.lbSortCol];
        let valB = b[window.lbSortCol];
        if(typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }
        if(valA < valB) return window.lbSortAsc ? -1 : 1;
        if(valA > valB) return window.lbSortAsc ? 1 : -1;
        return 0;
    });

    window.lbPage = 1;
    window.renderLBSection();
    window.updateLBCharts();
};

window.sortLeaderboard = function(col) {
    if(window.lbSortCol === col) window.lbSortAsc = !window.lbSortAsc;
    else { window.lbSortCol = col; window.lbSortAsc = true; }
    window.handleLeaderboardFilters();
};

window.resetLeaderboardFilters = function() {
     if(document.getElementById('lbSearch')) document.getElementById('lbSearch').value = '';
     if(document.getElementById('lbFilterExam')) document.getElementById('lbFilterExam').value = 'all';
     if(document.getElementById('lbFilterDept')) document.getElementById('lbFilterDept').value = 'all';
     if(document.getElementById('lbFilterRank')) document.getElementById('lbFilterRank').value = 'all';
     if(document.getElementById('lbFilterPct')) document.getElementById('lbFilterPct').value = '';
     window.handleLeaderboardFilters();
};

window.AdminDashboard.renderLeaderboard = function() {
    window.renderLBSection();
    window.updateLBCharts();
};

window.renderLBSection = function() {
    const list = document.getElementById('lb-list');
    const podiumCont = document.getElementById('podium-view');
    if(!list || !podiumCont) return;

    if(window.lbLoading) {
        list.innerHTML = Array.from({length:8}).map(() => `<tr><td colspan="9"><div class="skeleton" style="height:45px; width:100%; border-radius:8px; margin:4px 0; background:var(--border-subtle); animation:skeletonPulse 1.5s infinite"></div></td></tr>`).join('');
        podiumCont.innerHTML = '<div class="skeleton" style="width:100%; height:300px; border-radius:20px; background:var(--border-subtle); animation:skeletonPulse 1.5s infinite"></div>';
        return;
    }

    // Stats
    const scores = window.filteredLB.map(c => c.score);
    const total = window.filteredLB.length;
    const highest = total ? Math.max(...scores) : 0;
    const lowest = total ? Math.min(...scores) : 0;
    const avg = total ? (scores.reduce((a,b) => a+b, 0) / total).toFixed(1) : 0;
    const passCount = window.filteredLB.filter(c => c.status === 'PASS').length;
    const passPct = total ? ((passCount/total)*100).toFixed(1) : 0;
    const topScore = window.allLeaderboard[0]?.score || 0;

    const animStat = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
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
        if(!c) return;
        
        const rank = idx + 1;
        let rankClass = 'first';
        let medal = '🥇';
        if(rank === 2) { rankClass = 'second'; medal = '🥈'; }
        if(rank === 3) { rankClass = 'third'; medal = '🥉'; }
        
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
    if(total === 0) {
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
    if(prevBtn) prevBtn.disabled = window.lbPage <= 1;
    if(nextBtn) nextBtn.disabled = window.lbPage >= maxPage;

    list.innerHTML = items.map((c, i) => {
        let rankCol = `<span class="rank-text" style="color:var(--text-tertiary)">#${c.rank}</span>`;
        if(c.rank === 1) rankCol = `<span class="rank-text first-rank">#1</span>`;
        else if(c.rank === 2) rankCol = `<span class="rank-text second-rank">#2</span>`;
        else if(c.rank === 3) rankCol = `<span class="rank-text third-rank">#3</span>`;

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

window.updateLBCharts = function() {
    const ctxScore = document.getElementById('lbScoreChart')?.getContext('2d');
    const ctxPct = document.getElementById('lbPctChart')?.getContext('2d');
    if(!ctxScore || !ctxPct) return;

    // Destroy existing
    if(window.lbCharts.score) window.lbCharts.score.destroy();
    if(window.lbCharts.pct) window.lbCharts.pct.destroy();

    // Data Dist
    const dist = { '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, '<60': 0 };
    window.filteredLB.forEach(c => {
        if(c.percentage >= 90) dist['90-100']++;
        else if(c.percentage >= 80) dist['80-89']++;
        else if(c.percentage >= 70) dist['70-79']++;
        else if(c.percentage >= 60) dist['60-69']++;
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
                    (window.allLeaderboard.reduce((a,b)=>a+b.percentage,0)/window.allLeaderboard.length) || 0,
                    window.allLeaderboard[Math.floor(window.allLeaderboard.length/2)]?.percentage || 0
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
window.refreshLeaderboard = () => { if(window.showToast) window.showToast('Re-calculating global ranks...', 'info'); window.allLeaderboard=[]; window.initLeaderboardEngine(); };
window.exportLeaderboard = () => { if(window.showToast) window.showToast('Generating ranking CSV...', 'success'); };
window.viewLBProfile = (id) => { if(window.showToast) window.showToast('Opening profile for ' + id, 'info'); };
window.viewLBAttempts = (id) => { if(window.showToast) window.showToast('Loading attempts history for ' + id, 'info'); };
window.viewLBAnalytics = (id) => { if(window.showToast) window.showToast('Processing performance analytics...', 'info'); };
window.downloadLBCert = (id) => { if(window.showToast) window.showToast('Preparing certificate for ' + id, 'success'); };

window.lbPrevPage = function() {
    if(window.lbPage > 1) {
        window.lbPage--;
        window.renderLBSection();
    }
};

window.lbNextPage = function() {
    const maxPage = Math.ceil(window.filteredLB.length / window.lbPageSize);
    if(window.lbPage < maxPage) {
        window.lbPage++;
        window.renderLBSection();
    }
};

// Hook into AdminDashboard
const originalInit = window.AdminDashboard.init;
window.AdminDashboard.init = function() {
    originalInit.apply(this);
    // Initial call if hash matches
    if(window.location.hash === '#leaderboard') {
         if(window.initLeaderboardEngine) window.initLeaderboardEngine();
    }
};

/* ─── SETTINGS TERMINAL ─── */
window.AdminDashboard.renderSettings = function() {
    // Initial state setup if needed
    const slider = document.querySelector('.range-slider');
    const valDisp = document.getElementById('threshold-val');
    if(slider && valDisp) {
        slider.oninput = () => valDisp.textContent = `${slider.value}%`;
    }
};

window.saveSettings = function() {
    window.showToast('System configuration updated successfully', 'success');
};

window.resetSettings = function() {
    window.showToast('Default configuration restored', 'info');
};

/* ─── AUDIT LOGS ─── */
window.allAuditLogs = [];
window.renderAuditLogs = function() {
    const list = document.getElementById('audit-list');
    if(!list) return;

    if(window.allAuditLogs.length === 0) {
        const demoLogs = [
            { id: "AUD-10491", user: "System Admin", email: "admin@sem.edu", role: "Admin", action: "LOGIN", module: "SYSTEM", ip: "10.10.1.24", status: "SUCCESS", timestamp: Date.now() - 6 * 60 * 1000 },
            { id: "AUD-10490", user: "Prof. Jonathan Crane", email: "j.crane@sem.edu", role: "Teacher", action: "EXAM_CREATE", module: "EXAMS", ip: "10.10.4.18", status: "SUCCESS", timestamp: Date.now() - 18 * 60 * 1000 },
            { id: "AUD-10489", user: "System Admin", email: "admin@sem.edu", role: "Admin", action: "USER_EDIT", module: "USERS", ip: "10.10.1.24", status: "SUCCESS", timestamp: Date.now() - 28 * 60 * 1000 },
            { id: "AUD-10488", user: "Prof. Sarah Miller", email: "s.miller@sem.edu", role: "Teacher", action: "LOGIN", module: "SYSTEM", ip: "10.10.7.31", status: "SUCCESS", timestamp: Date.now() - 42 * 60 * 1000 },
            { id: "AUD-10487", user: "System Admin", email: "admin@sem.edu", role: "Admin", action: "CERT_REVOKE", module: "CERTS", ip: "10.10.1.24", status: "SUCCESS", timestamp: Date.now() - 57 * 60 * 1000 },
            { id: "AUD-10486", user: "Prof. Mike Ross", email: "m.ross@sem.edu", role: "Teacher", action: "EXAM_CREATE", module: "EXAMS", ip: "10.10.8.44", status: "SUCCESS", timestamp: Date.now() - 74 * 60 * 1000 },
            { id: "AUD-10485", user: "System Admin", email: "admin@sem.edu", role: "Admin", action: "LOGIN", module: "SYSTEM", ip: "10.10.1.24", status: "SUCCESS", timestamp: Date.now() - 2 * 60 * 60 * 1000 },
            { id: "AUD-10484", user: "Prof. Emma Wilson", email: "e.wilson@sem.edu", role: "Teacher", action: "USER_EDIT", module: "USERS", ip: "10.10.9.52", status: "SUCCESS", timestamp: Date.now() - 3 * 60 * 60 * 1000 },
            { id: "AUD-10483", user: "System Admin", email: "admin@sem.edu", role: "Admin", action: "EXAM_CREATE", module: "EXAMS", ip: "10.10.1.24", status: "SUCCESS", timestamp: Date.now() - 4 * 60 * 60 * 1000 },
            { id: "AUD-10482", user: "Prof. Alan Turing", email: "a.turing@sem.edu", role: "Teacher", action: "LOGIN", module: "SYSTEM", ip: "10.10.11.66", status: "SUCCESS", timestamp: Date.now() - 5 * 60 * 60 * 1000 },
            { id: "AUD-10481", user: "System Admin", email: "admin@sem.edu", role: "Admin", action: "USER_EDIT", module: "USERS", ip: "10.10.1.24", status: "SUCCESS", timestamp: Date.now() - 8 * 60 * 60 * 1000 },
            { id: "AUD-10480", user: "Prof. Rachel Zane", email: "r.zane@sem.edu", role: "Teacher", action: "EXAM_CREATE", module: "EXAMS", ip: "10.10.13.19", status: "SUCCESS", timestamp: Date.now() - 11 * 60 * 60 * 1000 },
            { id: "AUD-10479", user: "System Admin", email: "admin@sem.edu", role: "Admin", action: "CERT_REVOKE", module: "CERTS", ip: "10.10.1.24", status: "SUCCESS", timestamp: Date.now() - 13 * 60 * 60 * 1000 },
            { id: "AUD-10478", user: "Prof. Harvey Specter", email: "h.specter@sem.edu", role: "Teacher", action: "LOGIN", module: "SYSTEM", ip: "10.10.14.27", status: "SUCCESS", timestamp: Date.now() - 15 * 60 * 60 * 1000 },
            { id: "AUD-10477", user: "System Admin", email: "admin@sem.edu", role: "Admin", action: "EXAM_CREATE", module: "EXAMS", ip: "10.10.1.24", status: "SUCCESS", timestamp: Date.now() - 18 * 60 * 60 * 1000 },
            { id: "AUD-10476", user: "Prof. Jessica Pearson", email: "j.pearson@sem.edu", role: "Teacher", action: "USER_EDIT", module: "USERS", ip: "10.10.15.39", status: "SUCCESS", timestamp: Date.now() - 22 * 60 * 60 * 1000 },
            { id: "AUD-10475", user: "System Admin", email: "admin@sem.edu", role: "Admin", action: "LOGIN", module: "SYSTEM", ip: "10.10.1.24", status: "SUCCESS", timestamp: Date.now() - 26 * 60 * 60 * 1000 },
            { id: "AUD-10474", user: "Prof. Donna Paulsen", email: "d.paulsen@sem.edu", role: "Teacher", action: "EXAM_CREATE", module: "EXAMS", ip: "10.10.16.41", status: "SUCCESS", timestamp: Date.now() - 30 * 60 * 60 * 1000 }
        ];

        window.allAuditLogs = demoLogs
            .sort((a, b) => b.timestamp - a.timestamp)
            .map(item => ({
                ...item,
                time: new Date(item.timestamp).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                })
            }));
    }

    const totalEl = document.getElementById('audit-total');
    const todayEl = document.getElementById('audit-today');
    const adminEl = document.getElementById('audit-admin');
    const teacherEl = document.getElementById('audit-teacher');

    if(totalEl) totalEl.textContent = window.allAuditLogs.length.toLocaleString();
    if(todayEl) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayCount = window.allAuditLogs.filter(l => (l.timestamp || 0) >= todayStart.getTime()).length;
        todayEl.textContent = todayCount.toLocaleString();
    }
    if(adminEl) adminEl.textContent = window.allAuditLogs.filter(l => l.role === 'Admin').length.toLocaleString();
    if(teacherEl) teacherEl.textContent = window.allAuditLogs.filter(l => l.role === 'Teacher').length.toLocaleString();

    window.handleAuditFilters();
};

window.handleAuditFilters = function() {
    const query = (document.getElementById('auditSearch')?.value || '').toLowerCase().trim();
    const action = document.getElementById('auditActionFilter')?.value || 'all';
    const module = document.getElementById('auditModuleFilter')?.value || 'all';
    const list = document.getElementById('audit-list');
    if(!list) return;
    
    const filtered = window.allAuditLogs.filter(l => {
        const haystack = `${l.user} ${l.email || ''} ${l.id || ''} ${l.action} ${l.module}`.toLowerCase();
        const matchQ = !query || haystack.includes(query);
        const matchA = action === 'all' || l.action === action;
        const matchM = module === 'all' || l.module === module;
        return matchQ && matchA && matchM;
    });

    if(filtered.length === 0) {
        list.innerHTML = '';
        document.getElementById('auditEmptyState').style.display = 'block';
        return;
    }
    document.getElementById('auditEmptyState').style.display = 'none';

    list.innerHTML = filtered.map(l => `
        <tr>
            <td style="font-size:12px; font-family:'JetBrains Mono'; color:var(--text-tertiary)">${l.time}</td>
            <td style="font-weight:700; color:var(--text-primary)">${l.user}<div style="font-size:11px; font-weight:500; color:var(--text-tertiary); margin-top:2px">${l.id} · ${l.email || '-'}</div></td>
            <td><span class="status-badge ${l.role === 'Admin' ? 'green-badge' : 'draft'}" style="font-size:10px">${l.role}</span></td>
            <td style="font-weight:600; font-size:12px">${l.action}</td>
            <td><span style="font-size:11px; font-weight:800; color:var(--text-tertiary)">${l.module}</span></td>
            <td style="font-family:'JetBrains Mono'; font-size:11px">${l.ip}</td>
            <td style="text-align:right"><button class="btn btn-ghost btn-xs" title="View Details"><i class="fa-solid fa-circle-info"></i></button></td>
        </tr>
    `).join('');
};

window.exportAuditCSV = function() {
    window.showToast('Generating audit report CSV...', 'success');
};

/* ─── REPORTS ─── */
window.allReports = [
    { name: 'Monthly Performance Q1', type: 'PERFORMANCE', by: 'System Admin', date: '2024-03-28' },
    { name: 'Security Audit Feb', type: 'SECURITY', by: 'System Admin', date: '2024-02-15' }
];

window.renderReports = function() {
    const hist = document.getElementById('report-history');
    if(!hist) return;

    hist.innerHTML = window.allReports.map(r => `
        <tr>
            <td style="font-weight:700; color:var(--text-primary)">${r.name}</td>
            <td><span class="status-badge" style="font-size:10px">${r.type}</span></td>
            <td style="color:var(--text-secondary)">${r.by}</td>
            <td style="font-size:12px; color:var(--text-tertiary)">${r.date}</td>
            <td style="text-align:right">
                <button class="btn btn-ghost btn-xs" title="Download"><i class="fa-solid fa-download"></i></button>
                <button class="btn btn-ghost btn-xs" title="Delete" style="color:var(--accent-pink)"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
};

window.generateReport = function(type) {
    window.showToast(`AI Report engine: Compiling ${type} analytics...`, 'info');
    setTimeout(() => {
        window.allReports.unshift({ name: `${type} Realtime Insight`, type: type, by: 'System Admin', date: new Date().toISOString().split('T')[0] });
        window.renderReports();
        window.showToast('Report generated successfully', 'success');
    }, 2000);
};

window.exportReport = function(type, format) {
    window.showToast(`Exporting ${type} as ${format}...`, 'success');
};

/* ─── NOTIFICATIONS ─── */
window.allNotifs = [
    { id: 1, type: 'cheating', title: 'Critical Monitoring Alert: STU-4921', desc: 'Candidate #4921 has exceeded the tab switch limit (8/5). Proctoring session flagged for forensic review.', time: '2 mins ago', unread: true },
    { id: 2, type: 'exam', title: 'New Exam Published: ML-FINAL-2024', desc: 'Advanced Machine Learning — Final Assessment is now live for all 1,240 enrolled students.', time: '1 hour ago', unread: true },
    { id: 3, type: 'cert', title: 'Identity Verified: WA-9201', desc: 'Face verification successful for Candidate #9201. Digital certificate generated and securely dispatched.', time: '3 hours ago', unread: false },
    { id: 4, type: 'system', title: 'System-wide Maintenance: Node-B', desc: 'Database node-B maintenance scheduled for Sunday, 02:00 AM UTC. Estimated downtime: 15 minutes of read-only state.', time: '5 hours ago', unread: false },
    { id: 5, type: 'cheating', title: 'Frame Freeze Detected: STU-1120', desc: 'Proctor AI detected a recurring frame-freeze for Candidate #1120. Suspicious activity flagged.', time: '8 hours ago', unread: true },
    { id: 6, type: 'exam', title: 'Exam Registration Deadline', desc: 'Cloud Infrastructure exam registration closes in 2 hours. There are 14 pending applications requiring review.', time: '12 hours ago', unread: true },
    { id: 7, type: 'exam', title: 'Results Processing Complete', desc: 'Batch processing for Cyber Security Foundation (CSF-101) is complete. Average score: 72%.', time: '1 day ago', unread: false },
    { id: 8, type: 'cert', title: 'Bulk Certificates Dispatched', desc: '142 certificates have been successfully generated and dispatched for the "Frontend Architecture" cohort.', time: '2 days ago', unread: false },
    { id: 9, type: 'system', title: 'Security Incident: Unauthorized Login', desc: '3 failed login attempts detected on IP 192.168.1.102 (Unknown Device). IP temporarily throttled.', time: '2 days ago', unread: true },
    { id: 10, type: 'cheating', title: 'Multiple Face Detection: STU-8829', desc: 'Forensic engine detected a secondary face in frame for Candidate #8829. 85% confidence score.', time: '3 days ago', unread: false },
    { id: 11, type: 'system', title: 'API Key Rotation: AWS-PROD', desc: 'Production API keys have been rotated successfully. All services are healthy.', time: '4 days ago', unread: false },
    { id: 12, type: 'exam', title: 'Exam Question Library Update', desc: 'The "Discrete Mathematics" question pool has been refreshed with 40 new higher-order thinking problems.', time: '5 days ago', unread: false }
];

window.renderNotifications = function(filter = 'all') {
    const cont = document.getElementById('notif-list');
    if(!cont) return;

    let filtered = window.allNotifs;
    if(filter !== 'all') filtered = filtered.filter(n => n.type === filter);

    if(filtered.length === 0) {
        cont.innerHTML = `<div class="glass-card" style="padding:60px; text-align:center; color:var(--text-tertiary)">
            <i class="fa-solid fa-inbox" style="font-size:64px; margin-bottom:24px; opacity:0.1"></i>
            <p style="font-size:18px; font-weight:600; font-family:'Syne'">No messages found</p>
            <p style="font-size:13px; opacity:0.7">Your inbox is currently clear for this category.</p>
        </div>`;
        return;
    }

    cont.innerHTML = filtered.map(n => `
        <div class="notif-item ${n.unread ? 'unread' : ''} row-inserted" data-id="${n.id}">
            <div class="notif-icon ni-${n.type}">
                <i class="fa-solid ${getNotifIcon(n.type)}"></i>
            </div>
            <div class="notif-content">
                <h3 class="notif-title">${n.title}</h3>
                <p class="notif-desc">${n.desc}</p>
                <div class="notif-time">${n.time}</div>
            </div>
            <div class="ni-actions">
                ${n.unread ? `<button class="ni-btn" title="Mark Read" onclick="markRead(${n.id})"><i class="fa-solid fa-check"></i></button>` : ''}
                <button class="ni-btn del" title="Delete" onclick="deleteNotif(${n.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
};

const getNotifIcon = (type) => {
    switch(type) {
        case 'cheating': return 'fa-user-slash';
        case 'exam': return 'fa-file-circle-plus';
        case 'cert': return 'fa-award';
        default: return 'fa-circle-info';
    }
};

window.filterNotifs = function(type, btn) {
    document.querySelectorAll('.n-filter').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    window.renderNotifications(type);
};

window.markRead = function(id) {
    const n = window.allNotifs.find(x => x.id === id);
    if(n) n.unread = false;
    window.renderNotifications();
    window.showToast("Message marked as read", "success");
};

window.markAllRead = function() {
    window.allNotifs.forEach(n => n.unread = false);
    window.renderNotifications();
    window.showToast("All messages marked as read", "success");
};

window.deleteNotif = function(id) {
    window.allNotifs = window.allNotifs.filter(n => n.id !== id);
    window.renderNotifications();
    window.showToast("Notification deleted", "info");
};

window.clearNotifs = function() {
    if(confirm("Are you sure you want to clear your entire inbox?")) {
        window.allNotifs = [];
        window.renderNotifications();
        window.showToast("Inbox cleared", "info");
    }
};

};
document.addEventListener('DOMContentLoaded', () => {
    if(window.AdminDashboard && window.AdminDashboard.init) {
        window.AdminDashboard.init();
        
        // Initial populate of notifications if that's the direct link
        if(window.location.hash === '#notifications') {
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

window.logoutAdmin = function() {
    if(confirm("Are you sure you want to exit the Administrative Console?")) {
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('jwt');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        window.location.href = 'admin-login.html';
    }
};

window.updateNotifBadges = () => {
    const filters = document.querySelectorAll('.n-filter');
    filters.forEach(f => {
        const span = f.querySelector('span');
        if(!span) return;
        
        // Extract type from onclick attribute match
        const matchStr = f.getAttribute('onclick') || "";
        const match = matchStr.match(/'([^']+)'/);
        if(!match) return;
        
        const type = match[1];
        const count = (type === 'all') 
            ? (window.allNotifs ? window.allNotifs.length : 0)
            : (window.allNotifs ? window.allNotifs.filter(n => n.type === type).length : 0);
        span.textContent = count;
    });
};

// Hook badges into render engine
const originalRender = window.renderNotifications;
window.renderNotifications = function(filter) {
    if(typeof originalRender === 'function') originalRender(filter);
    window.updateNotifBadges();
};
