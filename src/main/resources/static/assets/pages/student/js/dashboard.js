/* ============================================================
   STUDENT TERMINAL LOGIC — Professional SaaS Interactions
   ============================================================ */

   const StudentDashboard = {
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

        // 1. Score Trend (Line)
        this.renderLineChart('scoreTrendChart', gridColor, labelColor);

        // 2. Accuracy (Doughnut)
        this.renderAccuracyChart('accuracyChart');

        // 3. Topic Performance (Radar)
        this.renderRadarChart('topicPerChart', labelColor);
    },

    renderLineChart(id, gridColor, labelColor) {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        if (this.charts[id]) this.charts[id].destroy();

        this.charts[id] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
                datasets: [{
                    label: 'Score %',
                    data: [72, 78, 85, 82, 91],
                    borderColor: '#3b82f6',
                    backgroundGradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    pointBackgroundColor: '#3b82f6'
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

    renderAccuracyChart(id) {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        if (this.charts[id]) this.charts[id].destroy();

        this.charts[id] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Correct', 'Incorrect'],
                datasets: [{
                    data: [91, 9],
                    backgroundColor: ['#10b981', '#ec4899'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '80%',
                plugins: { legend: { position: 'bottom', labels: { padding: 20 } } }
            }
        });
    },

    renderRadarChart(id, labelColor) {
        const ctx = document.getElementById(id);
        if (!ctx) return;
        if (this.charts[id]) this.charts[id].destroy();

        this.charts[id] = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['DS', 'Algo', 'CSS', 'JS', 'HTML', 'OS'],
                datasets: [{
                    label: 'Self Mastery',
                    data: [95, 80, 70, 90, 85, 60],
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: '#3b82f6',
                    pointBackgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    r: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        angleLines: { color: 'rgba(255,255,255,0.05)' },
                        pointLabels: { color: labelColor, font: { size: 11, weight: '700' } },
                        ticks: { display: false }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    },

    charts: {},

    // ─── MOCK DATA POPULATION ───
    populateMockData() {
        this.renderRecentAttempts();
        this.renderFullAttempts();
        this.renderAvailableExams();
        this.renderCertificates();
        this.renderLeaderboard();
    },

    renderRecentAttempts() {
        const list = document.getElementById('recent-attempts-list');
        if (!list) return;
        const attempts = [
            { title: 'Intro to Data Structures', score: '92/100', status: 'Passed', date: 'May 12' },
            { title: 'JavaScript Advanced Hub', score: '88/100', status: 'Passed', date: 'May 08' },
            { title: 'Modern UI/UX Final', score: '85/100', status: 'Passed', date: 'May 02' }
        ];
        list.innerHTML = attempts.map(a => `
            <tr>
                <td style="font-weight:700; color:var(--text-primary)">${a.title}</td>
                <td style="font-family:'JetBrains Mono'; color:var(--accent-blue)">${a.score}</td>
                <td><span class="status-badge active">${a.status}</span></td>
                <td style="font-size:12px">${a.date}</td>
            </tr>
        `).join('');
    },

    renderFullAttempts() {
        const list = document.getElementById('full-attempts-list');
        if (!list) return;
        const attempts = [
            { title: 'Intro to Data Structures', score: '92/100', per: '92%', status: 'Passed', date: '2024-05-12' },
            { title: 'JavaScript Advanced Hub', score: '88/100', per: '88%', status: 'Passed', date: '2024-05-08' },
            { title: 'Algorithm Midterm', score: '42/100', per: '42%', status: 'Failed', date: '2024-04-20' }
        ];
        list.innerHTML = attempts.map(a => `
            <tr>
                <td style="font-weight:700; color:var(--text-primary)">${a.title}</td>
                <td>${a.score}</td>
                <td style="font-weight:800; color:var(--accent-green)">${a.per}</td>
                <td>${a.date}</td>
                <td><span class="status-badge ${a.status.toLowerCase() === 'passed' ? 'active' : 'draft'}">${a.status}</span></td>
                <td><button class="btn btn-ghost btn-sm">View Result</button></td>
            </tr>
        `).join('');
    },

    renderAvailableExams() {
        const grid = document.getElementById('available-exams-list');
        if (!grid) return;
        const exams = [
            { title: 'Cloud Computing Essentials', duration: '60 mins', status: 'Live', code: 'CC-E101' },
            { title: 'Full Stack Development', duration: '120 mins', status: 'Live', code: 'FS-WEB' },
            { title: 'Machine Learning Basics', duration: '90 mins', status: 'Scheduled', code: 'AI-MLB' }
        ];
        grid.innerHTML = exams.map(e => `
            <div class="exam-card">
                <div class="exam-info">
                    <span class="status-badge active">${e.status}</span>
                    <h3>${e.title}</h3>
                    <div class="exam-meta">
                        <span>🕒 ${e.duration}</span>
                        <span>🔑 ${e.code}</span>
                    </div>
                </div>
                <button class="btn btn-primary btn-full">Start Assessment</button>
            </div>
        `).join('');
    },

    renderCertificates() {
        const grid = document.getElementById('certificates-list');
        if (!grid) return;
        const certs = [
            { title: 'Mastery in Data Structures', date: 'May 14, 2024', id: 'SEM-DS-8812' },
            { title: 'Advanced JavaScript Certification', date: 'April 02, 2024', id: 'SEM-JS-4410' },
            { title: 'Machine Learning Specialist', date: 'Feb 12, 2024', id: 'SEM-ML-1102' }
        ];
        grid.innerHTML = certs.map(c => `
            <div class="cert-card">
                <div class="cert-header">
                    <h3>${c.title}</h3>
                </div>
                <div class="cert-info">
                    <p>Issue Date: ${c.date}</p>
                    <p>ID: ${c.id}</p>
                </div>
                <button class="btn btn-ghost btn-sm btn-full">Download Digital Copy</button>
            </div>
        `).join('');
    },

    renderLeaderboard() {
        const list = document.getElementById('ranks-list');
        if (!list) return;
        const ranks = [
            { name: 'John Doe', acc: '98.5%', points: 4891 },
            { name: 'Sarah Lee', acc: '96.2%', points: 4720 },
            { name: 'Alex Carter', acc: '91.0%', points: 4102 },
            { name: 'Mike Ross', acc: '95.8%', points: 4510 }
        ];
        list.innerHTML = ranks.map((r, i) => `
            <tr>
                <td style="font-weight:800; color:var(--accent-blue)">#${i+1}</td>
                <td style="font-weight:600; color:var(--text-primary)">${r.name}</td>
                <td>${r.acc}</td>
                <td><span style="font-weight:800">${r.points}</span></td>
            </tr>
        `).join('');
    }
};

// Start Terminal
document.addEventListener('DOMContentLoaded', () => {
    StudentDashboard.init();
});
