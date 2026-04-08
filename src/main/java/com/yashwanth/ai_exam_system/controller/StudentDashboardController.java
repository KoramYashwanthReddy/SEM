package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.StudentDashboardResponse;
import com.yashwanth.ai_exam_system.service.StudentDashboardService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> getDashboardForCurrentStudent(
            Authentication auth) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboardForIdentifier(auth.getName());

        return success("Dashboard fetched successfully", dashboard);
    }

    @GetMapping("/dashboard/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<Map<String, Object>> getDashboard(
            @PathVariable Long studentId) {

        logger.info("Fetching dashboard for student {}", studentId);

        StudentDashboardResponse dashboard =
                dashboardService.getDashboard(studentId);

        return success("Dashboard fetched successfully", dashboard);
    }

    @GetMapping("/bootstrap")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> getBootstrap(
            Authentication auth) {

        Map<String, Object> payload = dashboardService.getStudentUiBootstrap(auth.getName());
        return success("Student bootstrap fetched", payload);
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> getQuickStats(
            Authentication auth) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboardForIdentifier(auth.getName());

        Map<String, Object> stats = new HashMap<>();
        stats.put("averageScore", dashboard.getAverageScore());
        stats.put("attempted", dashboard.getAttemptedCount());
        stats.put("rank", dashboard.getLeaderboardRank());
        stats.put("certificates", dashboard.getCertificatesEarned());

        return success("Stats fetched", stats);
    }

    @GetMapping("/stats/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
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

    @GetMapping("/alerts")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> getAlerts(
            Authentication auth) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboardForIdentifier(auth.getName());

        Map<String, Object> data = new HashMap<>();
        data.put("cheatingAlerts", dashboard.getCheatingAlerts());

        return success("Alerts fetched", data);
    }

    @GetMapping("/alerts/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<Map<String, Object>> getAlerts(
            @PathVariable Long studentId) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboard(studentId);

        Map<String, Object> data = new HashMap<>();
        data.put("cheatingAlerts", dashboard.getCheatingAlerts());

        return success("Alerts fetched", data);
    }

    @GetMapping("/performance")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> getPerformance(
            Authentication auth) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboardForIdentifier(auth.getName());

        Map<String, Object> data = new HashMap<>();
        data.put("trend", dashboard.getPerformanceTrend());

        return success("Performance trend fetched", data);
    }

    @GetMapping("/performance/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<Map<String, Object>> getPerformance(
            @PathVariable Long studentId) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboard(studentId);

        Map<String, Object> data = new HashMap<>();
        data.put("trend", dashboard.getPerformanceTrend());

        return success("Performance trend fetched", data);
    }

    @GetMapping("/weak-topics")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> getWeakTopics(
            Authentication auth) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboardForIdentifier(auth.getName());

        Map<String, Object> data = new HashMap<>();
        data.put("weakTopics", dashboard.getWeakTopics());

        return success("Weak topics fetched", data);
    }

    @GetMapping("/weak-topics/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<Map<String, Object>> getWeakTopics(
            @PathVariable Long studentId) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboard(studentId);

        Map<String, Object> data = new HashMap<>();
        data.put("weakTopics", dashboard.getWeakTopics());

        return success("Weak topics fetched", data);
    }

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
