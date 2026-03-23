package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.StudentDashboardResponse;
import com.yashwanth.ai_exam_system.service.StudentDashboardService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/student")
public class StudentDashboardController {

    private static final Logger logger =
            LoggerFactory.getLogger(StudentDashboardController.class);

    private final StudentDashboardService dashboardService;

    public StudentDashboardController(StudentDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    // =========================================================
    // 🎯 STUDENT DASHBOARD
    // =========================================================
    @GetMapping("/dashboard/{studentId}")
    public ResponseEntity<Map<String, Object>> getDashboard(
            @PathVariable Long studentId) {

        logger.info("Fetching dashboard for student {}", studentId);

        StudentDashboardResponse dashboard =
                dashboardService.getDashboard(studentId);

        return success("Dashboard fetched successfully", dashboard);
    }

    // =========================================================
    // 📊 QUICK STATS
    // =========================================================
    @GetMapping("/stats/{studentId}")
    public ResponseEntity<Map<String, Object>> getQuickStats(
            @PathVariable Long studentId) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboard(studentId);

        Map<String, Object> stats = new HashMap<>();
        stats.put("averageScore", dashboard.getAverageScore());
        stats.put("attempted", dashboard.getAttemptedCount());
        stats.put("rank", dashboard.getLeaderboardRank());
        stats.put("certificates", dashboard.getCertificatesEarned());

        return success("Stats fetched", stats);
    }

    // =========================================================
    // ⚠️ CHEATING ALERTS
    // =========================================================
    @GetMapping("/alerts/{studentId}")
    public ResponseEntity<Map<String, Object>> getAlerts(
            @PathVariable Long studentId) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboard(studentId);

        Map<String, Object> data = new HashMap<>();
        data.put("cheatingAlerts", dashboard.getCheatingAlerts());

        return success("Alerts fetched", data);
    }

    // =========================================================
    // 📈 PERFORMANCE TREND
    // =========================================================
    @GetMapping("/performance/{studentId}")
    public ResponseEntity<Map<String, Object>> getPerformance(
            @PathVariable Long studentId) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboard(studentId);

        Map<String, Object> data = new HashMap<>();
        data.put("trend", dashboard.getPerformanceTrend());

        return success("Performance trend fetched", data);
    }

    // =========================================================
    // 🎯 WEAK TOPICS
    // =========================================================
    @GetMapping("/weak-topics/{studentId}")
    public ResponseEntity<Map<String, Object>> getWeakTopics(
            @PathVariable Long studentId) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboard(studentId);

        Map<String, Object> data = new HashMap<>();
        data.put("weakTopics", dashboard.getWeakTopics());

        return success("Weak topics fetched", data);
    }

    // =========================================================
    // ✅ COMMON RESPONSE
    // =========================================================
    private ResponseEntity<Map<String, Object>> success(
            String message,
            Object data) {

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", message);
        response.put("data", data);

        return ResponseEntity.ok(response);
    }
}