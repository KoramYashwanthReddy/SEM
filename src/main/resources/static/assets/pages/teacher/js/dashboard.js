/* ============================================================
   TEACHER CONSOLE LOGIC — Professional SaaS Interactions
   ============================================================ */

   const TeacherDashboard = {
    init() {
        this.setupNavigation();
        this.setupSidebarToggle();
        this.initCharts();
        this.populateMockData();
        
        // Listen for global theme changes to refresh chart colors
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

                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                sections.forEach(s => s.classList.remove('active'));
                const targetSection = document.getElementById(targetId);
                if (targetSection) targetSection.classList.add('active');

                // Refresh charts if switching to metrics
                if (targetId === 'analytics-section' || targetId === 'dashboard-section') {
                    this.initCharts();
                }

                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('open');
                }
            });
        });

        window.switchSection = (id) => {
            const targetNav = document.querySelector(`.nav-item[data-target="${id}"]`);
            if (targetNav) targetNav.click();
        };
    },

    setupSidebarToggle() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('toggle-sidebar');
        if (!toggleBtn) return;

        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('open');
            } else {
                sidebar.classList.toggle('collapsed');
            }
        });
    },

    // ─── CHARTS (Chart.js) ───
    initCharts() {
        if (!window.Chart) return;

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const labelColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

        // 1. Score Distribution (Bar)
        this.renderBarChart('scoreDistributionChart', gridColor, labelColor);

        // 2. Performance Trend (Line)
        this.renderLineChart('performanceTrendChart', gridColor, labelColor);

        // 3. Topic Weakness (Doughnut)
        this.renderPieChart('topicPerChart');
    },

    renderBarChart(id, gridColor, labelColor) {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        if (this.charts[id]) this.charts[id].destroy();

        this.charts[id] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Fail', 'Pass', 'Credit', 'Distinction'],
                datasets: [{
                    label: 'Students',
                    data: [12, 45, 82, 34],
                    backgroundColor: ['#ec4899', '#f59e0b', '#3b82f6', '#10b981'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: labelColor } },
                    y: { grid: { color: gridColor }, ticks: { color: labelColor } }
                }
            }
        });
    },

    renderLineChart(id, gridColor, labelColor) {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        if (this.charts[id]) this.charts[id].destroy();

        this.charts[id] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Avg Score',
                    data: [65, 78, 72, 85],
                    borderColor: '#8b5cf6',
                    backgroundGradient: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(139, 92, 246, 0.1)'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: labelColor } },
                    y: { grid: { color: gridColor }, ticks: { color: labelColor, max: 100 } }
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
                labels: ['Data Structures', 'Algorithms', 'Logic', 'Memory'],
                datasets: [{
                    data: [35, 25, 20, 20],
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '70%',
                plugins: { legend: { position: 'bottom', labels: { padding: 20 } } }
            }
        });
    },

    charts: {},

    // ─── MOCK DATA POPULATION ───
    populateMockData() {
        this.renderExams();
        this.renderQuestions();
        this.renderAttempts();
        this.renderViolations();
        this.renderActivity();
        this.renderLeaderboard();
        this.renderCertificates();
    },

    renderExams() {
        const lists = [document.getElementById('recent-exams-list'), document.getElementById('exams-list')];
        const exams = [
            { title: 'Data Structures Quiz #1', attempts: 184, avg: '82%', status: 'Active', duration: '45m', time: '10 AM - 12 PM' },
            { title: 'Intro to Algorithms - Midterm', attempts: 142, avg: '71%', status: 'Active', duration: '90m', time: '2 PM - 4 PM' },
            { title: 'System Architecture Final', attempts: 0, avg: 'N/A', status: 'Draft', duration: '120m', time: 'Tomorrow' }
        ];

        lists.forEach(list => {
            if (!list) return;
            list.innerHTML = exams.map(e => `
                <tr>
                    <td><div style="font-weight:700; color:var(--text-primary)">${e.title}</div></td>
                    <td>${e.attempts}</td>
                    <td><span style="font-weight:800; color:var(--accent-blue)">${e.avg}</span></td>
                    <td><span class="status-badge ${e.status.toLowerCase()}">${e.status}</span></td>
                    ${list.id === 'exams-list' ? `<td><div style="font-size:12px">${e.time}</div></td><td><button class="btn btn-ghost btn-sm">Edit</button></td>` : ''}
                </tr>
            `).join('');
        });
    },

    renderQuestions() {
        const list = document.getElementById('questions-list');
        if (!list) return;
        const qData = [
            { content: 'What is the time complexity of a Binary Search?', type: 'MCQ', difficulty: 'Medium' },
            { content: 'Implement a linked list in JavaScript...', type: 'Coding', difficulty: 'Hard' },
            { content: 'Describe the differences between stack and heap...', type: 'Descriptive', difficulty: 'Easy' }
        ];
        list.innerHTML = qData.map(q => `
            <tr>
                <td style="font-weight:500; color:var(--text-secondary)">${q.content}</td>
                <td><span class="status-badge draft">${q.type}</span></td>
                <td><span class="s-delta">${q.difficulty}</span></td>
                <td><button class="btn btn-ghost btn-sm">Edit</button></td>
            </tr>
        `).join('');
    },

    renderAttempts() {
        const list = document.getElementById('attempts-list');
        if (!list) return;
        const attempts = [
            { student: 'John Doe', exam: 'Data Structures', score: '92/100', time: '38m', status: 'Passed' },
            { student: 'Sarah Smith', exam: 'Data Structures', score: '88/100', time: '42m', status: 'Passed' },
            { student: 'Bob Marley', exam: 'Algorithm Midterm', score: '42/100', time: '88m', status: 'Failed' }
        ];
        list.innerHTML = attempts.map(a => `
            <tr>
                <td style="font-weight:700; color:var(--text-primary)">${a.student}</td>
                <td>${a.exam}</td>
                <td style="font-family:'JetBrains Mono'; color:var(--accent-green)">${a.score}</td>
                <td>${a.time}</td>
                <td><span class="status-badge ${a.status === 'Passed' ? 'active' : 'draft'}">${a.status}</span></td>
                <td><button class="btn btn-ghost btn-sm">View Result</button></td>
            </tr>
        `).join('');
    },

    renderViolations() {
        const list = document.getElementById('violations-list');
        if (!list) return;
        const logs = [
            { time: '14:24', student: 'STU_881', type: 'Window Blur', weight: 'High' },
            { time: '13:12', student: 'STU_212', type: 'Face Mismatch', weight: 'Med' }
        ];
        list.innerHTML = logs.map(l => `
            <tr>
                <td>${l.time}</td>
                <td style="font-family:'JetBrains Mono'">${l.student}</td>
                <td><span class="status-badge draft">${l.type}</span></td>
                <td style="font-weight:800; color:var(--accent-pink)">${l.weight}</td>
                <td><button class="btn btn-primary btn-sm">Review Feed</button></td>
            </tr>
        `).join('');
    },

    renderActivity() {
        const feed = document.getElementById('dashboard-activity-feed');
        if (!feed) return;
        const events = [
            { text: 'Sarah Smith completed Data Structures Quiz', time: '12 mins ago', color: 'green' },
            { text: 'System detected violation for Student_981', time: '45 mins ago', color: 'orange' },
            { text: 'Master Exam Paper #4 Published', time: '2 hours ago', color: 'blue' }
        ];
        feed.innerHTML = events.map(e => `
            <div class="activity-item">
                <span class="act-dot ${e.color}"></span>
                <div class="act-info">
                    <span class="act-text">${e.text}</span>
                    <span class="act-time">${e.time}</span>
                </div>
            </div>
        `).join('');
    },

    renderLeaderboard() {
        const list = document.getElementById('ranks-list');
        const mini = document.getElementById('mini-leaderboard');
        const ranks = [
            { name: 'John Doe', acc: '98.5%', points: 4891 },
            { name: 'Sarah Lee', acc: '96.2%', points: 4720 },
            { name: 'Mike Ross', acc: '95.8%', points: 4510 }
        ];
        if (list) {
            list.innerHTML = ranks.map((r, i) => `
                <tr>
                    <td style="font-weight:800; color:var(--accent-blue)">#${i+1}</td>
                    <td style="font-weight:600; color:var(--text-primary)">${r.name}</td>
                    <td>${r.acc}</td>
                    <td><span style="font-weight:800">${r.points}</span></td>
                </tr>
            `).join('');
        }
        if (mini) {
            mini.innerHTML = ranks.map((r, i) => `
                <div class="mini-rank-item">
                    <span class="r-num">#${i+1}</span>
                    <span class="r-name">${r.name}</span>
                    <span class="r-score">${r.points}</span>
                </div>
            `).join('');
        }
    },

    renderCertificates() {
        const list = document.getElementById('certs-list');
        if (!list) return;
        const certs = [
            { student: 'John Doe', exam: 'Advanced JS', id: 'CRT-9812-A' },
            { student: 'Sarah Smith', exam: 'Data Structures', id: 'CRT-9811-B' }
        ];
        list.innerHTML = certs.map(c => `
            <tr>
                <td style="font-weight:700; color:var(--text-primary)">${c.student}</td>
                <td>${c.exam}</td>
                <td style="font-family:'JetBrains Mono'">${c.id}</td>
                <td><button class="btn btn-ghost btn-sm">Issue Copy</button></td>
            </tr>
        `).join('');
    }
};

// Start Console
document.addEventListener('DOMContentLoaded', () => {
    TeacherDashboard.init();
});
