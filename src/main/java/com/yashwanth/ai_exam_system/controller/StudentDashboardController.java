package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.ApiResponse;
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
    public ResponseEntity<ApiResponse<StudentDashboardResponse>> getDashboardForCurrentStudent(
            Authentication auth) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboardForIdentifier(auth.getName());

        return ResponseEntity.ok(ApiResponse.success("Dashboard fetched successfully", dashboard));
    }

    @GetMapping("/dashboard/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<ApiResponse<StudentDashboardResponse>> getDashboard(
            @PathVariable Long studentId) {

        logger.info("Fetching dashboard for student {}", studentId);

        StudentDashboardResponse dashboard =
                dashboardService.getDashboard(studentId);

        return ResponseEntity.ok(ApiResponse.success("Dashboard fetched successfully", dashboard));
    }

    @GetMapping("/bootstrap")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBootstrap(
            Authentication auth) {

        Map<String, Object> payload = dashboardService.getStudentUiBootstrap(auth.getName());
        return ResponseEntity.ok(ApiResponse.success("Student bootstrap fetched", payload));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getQuickStats(
            Authentication auth) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboardForIdentifier(auth.getName());

        Map<String, Object> stats = new HashMap<>();
        stats.put("averageScore", dashboard.getAverageScore());
        stats.put("attempted", dashboard.getAttemptedCount());
        stats.put("rank", dashboard.getLeaderboardRank());
        stats.put("certificates", dashboard.getCertificatesEarned());

        return ResponseEntity.ok(ApiResponse.success("Stats fetched", stats));
    }

    @GetMapping("/stats/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getQuickStats(
            @PathVariable Long studentId) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboard(studentId);

        Map<String, Object> stats = new HashMap<>();
        stats.put("averageScore", dashboard.getAverageScore());
        stats.put("attempted", dashboard.getAttemptedCount());
        stats.put("rank", dashboard.getLeaderboardRank());
        stats.put("certificates", dashboard.getCertificatesEarned());

        return ResponseEntity.ok(ApiResponse.success("Stats fetched", stats));
    }

    @GetMapping("/alerts")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAlerts(
            Authentication auth) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboardForIdentifier(auth.getName());

        Map<String, Object> data = new HashMap<>();
        data.put("cheatingAlerts", dashboard.getCheatingAlerts());

        return ResponseEntity.ok(ApiResponse.success("Alerts fetched", data));
    }

    @GetMapping("/alerts/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAlerts(
            @PathVariable Long studentId) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboard(studentId);

        Map<String, Object> data = new HashMap<>();
        data.put("cheatingAlerts", dashboard.getCheatingAlerts());

        return ResponseEntity.ok(ApiResponse.success("Alerts fetched", data));
    }

    @GetMapping("/performance")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPerformance(
            Authentication auth) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboardForIdentifier(auth.getName());

        Map<String, Object> data = new HashMap<>();
        data.put("trend", dashboard.getPerformanceTrend());

        return ResponseEntity.ok(ApiResponse.success("Performance trend fetched", data));
    }

    @GetMapping("/performance/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPerformance(
            @PathVariable Long studentId) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboard(studentId);

        Map<String, Object> data = new HashMap<>();
        data.put("trend", dashboard.getPerformanceTrend());

        return ResponseEntity.ok(ApiResponse.success("Performance trend fetched", data));
    }

    @GetMapping("/weak-topics")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getWeakTopics(
            Authentication auth) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboardForIdentifier(auth.getName());

        Map<String, Object> data = new HashMap<>();
        data.put("weakTopics", dashboard.getWeakTopics());

        return ResponseEntity.ok(ApiResponse.success("Weak topics fetched", data));
    }

    @GetMapping("/weak-topics/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getWeakTopics(
            @PathVariable Long studentId) {

        StudentDashboardResponse dashboard =
                dashboardService.getDashboard(studentId);

        Map<String, Object> data = new HashMap<>();
        data.put("weakTopics", dashboard.getWeakTopics());

        return ResponseEntity.ok(ApiResponse.success("Weak topics fetched", data));
    }
}
