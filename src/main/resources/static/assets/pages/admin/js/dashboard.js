/* ============================================================
   ADMIN DASHBOARD CORE LOGIC
   ============================================================ */

   const AdminDashboard = {
    init() {
        this.setupNavigation();
        this.setupSidebarToggle();
        this.initCharts();
        this.populateMockData();
        this.setupUserTabs();

        // Listen for global theme changes to refresh charts
        window.addEventListener('themechange', () => {
            this.initCharts();
        });
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

                // Handle mobile sidebar auto-close
                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('open');
                }
            });
        });

        // Global function for JS navigation
        window.switchSection = (id) => {
            const targetNav = document.querySelector(`.nav-item[data-target="${id}"]`);
            if (targetNav) targetNav.click();
        };
    },


    // ─── SIDEBAR TOGGLE ───
    setupSidebarToggle() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('toggle-sidebar');

        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('open');
            } else {
                sidebar.classList.toggle('collapsed');
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

    // ─── MOCK DATA ───
    populateMockData() {
        this.renderExams();
        this.renderStudents();
        this.renderTeachers();
        this.renderViolations();
        this.renderCertificates();
        this.renderLeaderboard();
    },

    renderExams() {
        const list = document.getElementById('exams-list');
        if (!list) return;
        const exams = [
            { title: 'Advanced JavaScript (ES2024)', creator: 'Dr. John Smith', duration: '90 Min', status: 'Published' },
            { title: 'Cloud Infrastructure with AWS', creator: 'Eng. Sarah Connor', duration: '120 Min', status: 'Published' },
            { title: 'Machine Learning Basics', creator: 'Prof. Xavier', duration: '60 Min', status: 'Draft' },
            { title: 'Cybersecurity Fundamentals', creator: 'Internal Admin', duration: '45 Min', status: 'Published' }
        ];

        list.innerHTML = exams.map(e => `
            <tr>
                <td><div style="font-weight:600;color:var(--text-primary)">${e.title}</div></td>
                <td>${e.creator}</td>
                <td>${e.duration}</td>
                <td><span class="status-badge ${e.status.toLowerCase()}">${e.status}</span></td>
                <td><button class="btn btn-ghost btn-sm">Edit</button></td>
            </tr>
        `).join('');
    },

    renderStudents() {
        const list = document.getElementById('students-list');
        if (!list) return;
        const students = Array(8).fill(0).map((_, i) => ({
            name: ['Alice Vane', 'Bob Marley', 'Charlie Day', 'Diana Ross'][i % 4],
            email: `stu_${i+100}@example.com`,
            institution: 'Stanford University',
            status: 'Active'
        }));

        list.innerHTML = students.map(s => `
            <tr>
                <td style="font-weight:600;color:var(--text-primary)">${s.name}</td>
                <td>${s.email}</td>
                <td>${s.institution}</td>
                <td><span class="dot g">Active</span></td>
                <td><button class="btn btn-ghost btn-outline btn-sm">Manage</button></td>
            </tr>
        `).join('');
    },

    renderTeachers() {
        const list = document.getElementById('teachers-list');
        if (!list) return;
        const teachers = [
            { name: 'Dr. Sarah Smith', dept: 'Engineering', count: 12 },
            { name: 'Prof. Alan Turing', dept: 'Math', count: 42 }
        ];
        list.innerHTML = teachers.map(t => `
            <tr>
                <td style="font-weight:600;color:var(--text-primary)">${t.name}</td>
                <td>${t.dept}</td>
                <td><span class="s-delta">${t.count} Exams</span></td>
                <td><button class="btn btn-ghost btn-sm">Manage</button></td>
            </tr>
        `).join('');
    },

    renderViolations() {
        const list = document.getElementById('violations-list');
        if (!list) return;
        const events = [
            { time: '14:23:01', user: 'STU_4812', type: 'Face Mismatch', risk: 85 },
            { time: '14:21:44', user: 'STU_9021', type: 'Gaze Anomaly', risk: 42 },
            { time: '13:58:12', user: 'STU_1120', type: 'Object Detection', risk: 92 }
        ];

        list.innerHTML = events.map(ev => `
            <tr>
                <td>${ev.time}</td>
                <td style="font-family:'JetBrains Mono'">${ev.user}</td>
                <td><span class="status-badge draft">${ev.type}</span></td>
                <td style="color:${ev.risk > 80 ? 'var(--accent-pink)' : 'var(--accent-amber)'}; font-weight:800">${ev.risk}%</td>
                <td><button class="btn btn-primary btn-sm">Review</button></td>
            </tr>
        `).join('');
    },

    renderCertificates() {
        const list = document.getElementById('certs-list');
        if (!list) return;
        const certs = [
            { name: 'Alexandra Rivera', exam: 'Advanced JavaScript', date: '2025-03-15', id: 'NX-8172' },
            { name: 'Mike Ross', exam: 'System Design v2', date: '2025-03-14', id: 'NX-8171' }
        ];
        list.innerHTML = certs.map(c => `
            <tr>
                <td style="font-weight:600;color:var(--text-primary)">${c.name}</td>
                <td>${c.exam}</td>
                <td>${c.date}</td>
                <td style="font-family:'JetBrains Mono'">${c.id}</td>
                <td><button class="btn btn-ghost btn-sm">Download</button></td>
            </tr>
        `).join('');
    },

    renderLeaderboard() {
        const list = document.getElementById('ranks-list');
        if (!list) return;
        const ranks = Array(10).fill(0).map((_, i) => ({
            rank: i + 1,
            name: ['John Doe', 'Sarah Lee', 'Mike Ross', 'Alexandra R.', 'Chris Evans'][i % 5],
            points: [99.5, 98.2, 97.8, 96.4, 95.1][i % 5],
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
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
    AdminDashboard.init();
});
