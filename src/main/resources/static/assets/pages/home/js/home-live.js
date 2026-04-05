/**
 * home-live.js - Live homepage bridge for system data
 */

(function () {
  const apiBase = /^https?:/i.test(window.location.origin)
    ? window.location.origin
    : "http://localhost:8080";

  const state = {
    summary: null
  };

  function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function fmtNum(value) {
    return num(value).toLocaleString();
  }

  function fmtPct(value) {
    return `${Math.round(num(value) * 10) / 10}%`;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderCertificate(summary) {
    const cert = summary.certificatePreview || {};
    const student = cert.studentName || "No certificates yet";
    const exam = cert.examTitle || "-";
    const score = cert.score ?? 0;
    const certId = cert.certificateId || "-";
    const issuedAt = cert.issuedAt || "-";

    setText("home-cert-student", student);
    const desc = document.getElementById("home-cert-desc");
    if (desc) {
      desc.innerHTML = `has successfully completed the examination in<br><strong>${escapeHtml(exam)}</strong><br>with a score of <strong>${escapeHtml(score)}/100</strong> on ${escapeHtml(issuedAt)}`;
    }
    setText("home-cert-authority", cert.authority || "SEM Platform - Examinations");
    setText("home-cert-id", certId);
    setText("home-cert-issued", `Issued: ${issuedAt}`);
  }

  function renderAdminPreview(summary) {
    const admin = summary.adminPreview || {};
    setText("home-admin-active-exams", fmtNum(admin.activeExams || 0));
    setText("home-admin-total-students", fmtNum(admin.totalStudents || 0));
    setText("home-admin-live-sessions", fmtNum(admin.liveSessions || 0));

    const tbody = document.getElementById("home-admin-exams");
    if (!tbody) return;

    const rows = Array.isArray(admin.exams) ? admin.exams : [];
    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="padding:20px; text-align:center; color:var(--text-tertiary);">
            No live exam data yet.
          </td>
        </tr>`;
      return;
    }

    const statusClass = (status) => {
      const value = String(status || "").toUpperCase();
      if (value === "PUBLISHED") return "sp-active";
      if (value === "DRAFT") return "sp-pending";
      return "sp-done";
    };

    tbody.innerHTML = rows.map((row) => `
      <tr>
        <td style="font-weight:600;color:var(--text-primary);">${escapeHtml(row.title || "-")}</td>
        <td>${escapeHtml(row.subject || "General")}</td>
        <td>${fmtNum(row.studentCount || 0)}</td>
        <td><span class="status-pill ${statusClass(row.status)}">● ${escapeHtml(row.status || "Draft")}</span></td>
        <td>${fmtPct(row.averageScore || 0)}</td>
      </tr>
    `).join("");
  }

  function renderHero(summary) {
    const hero = summary.hero || {};
    setText("home-hero-exams", fmtNum(hero.examsConducted || 0));
    setText("home-hero-pass-rate", fmtPct(hero.passRate || 0));
    setText("home-hero-certificates", fmtNum(hero.certificatesIssued || 0));
  }

  function renderAnalytics(summary) {
    const analytics = summary.analytics || {};
    setText("home-month-exams", fmtNum(analytics.examsThisMonth || 0));
    setText("home-active-students", fmtNum(analytics.activeStudents || 0));
    setText("home-completion-rate", fmtPct(analytics.completionRate || 0));
    setText("home-violation-rate", fmtPct(analytics.violationRate || 0));

    setText("home-month-exams-delta", `Avg score ${fmtPct(analytics.averageScore || 0)}`);
    setText("home-active-students-delta", `${fmtNum(analytics.totalTeachers || 0)} teachers live`);
    setText("home-completion-delta", "Derived from exam results");
    setText("home-violation-delta", "Derived from attempt logs");

    const trend = summary.trend || {};
    const lastLabel = Array.isArray(trend.labels) && trend.labels.length ? trend.labels[trend.labels.length - 1] : "Live";
    setText("home-score-subtitle", `${lastLabel} · real result distribution`);
    setText("home-violation-subtitle", `Violation counts from ${fmtNum(summary.meta?.totalAttempts || 0)} attempts`);
    setText("home-trend-subtitle", `Rolling 12-month trend · ${fmtNum(summary.meta?.totalStudents || 0)} students`);
  }

  async function load() {
    const response = await fetch(`${apiBase}/api/home/summary`, {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Home summary failed (${response.status})`);
    }
    return response.json();
  }

  function apply(summary) {
    state.summary = summary || {};
    window.HomeSummary = state.summary;
    renderHero(state.summary);
    renderAnalytics(state.summary);
    renderCertificate(state.summary);
    renderAdminPreview(state.summary);

    if (window.AnimationsController?.renderHomeCharts) {
      window.AnimationsController.renderHomeCharts(state.summary);
    }
  }

  async function bootstrap() {
    try {
      const summary = await load();
      apply(summary);
    } catch (error) {
      console.error("Home live sync failed:", error);
      const empty = {
        hero: { examsConducted: 0, passRate: 0, certificatesIssued: 0 },
        analytics: { examsThisMonth: 0, activeStudents: 0, completionRate: 0, violationRate: 0, averageScore: 0, totalTeachers: 0 },
        scoreDistribution: { labels: ["0-20", "21-40", "41-60", "61-80", "81-100"], data: [0, 0, 0, 0, 0] },
        violationTypes: { labels: ["Tab Switch", "Fullscreen", "High Risk", "Auto Submitted", "Cancelled"], data: [0, 0, 0, 0, 0] },
        trend: { labels: [], completion: [], passRate: [] },
        certificatePreview: { studentName: "No certificates yet", examTitle: "-", score: 0, certificateId: "-", issuedAt: "-", authority: "SEM Platform - Examinations" },
        adminPreview: { activeExams: 0, totalStudents: 0, liveSessions: 0, exams: [] },
        meta: { totalAttempts: 0, totalStudents: 0 }
      };
      apply(empty);
    }
  }

  window.HomeLive = {
    state,
    load,
    apply,
    bootstrap
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
