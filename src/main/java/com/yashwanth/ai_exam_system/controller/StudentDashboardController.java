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

    @GetMapping("/certificates")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCertificates(
            Authentication auth) {

        return ResponseEntity.ok(ApiResponse.success(
                "Student certificates fetched",
                dashboardService.getStudentCertificatesPayload(resolveStudentId(auth))));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getQuickStats(
            Authentication auth) {

        return ResponseEntity.ok(ApiResponse.success(
                "Stats fetched",
                dashboardService.getStudentQuickStats(resolveStudentId(auth))));
    }

    @GetMapping("/stats/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getQuickStats(
            @PathVariable Long studentId) {

        return ResponseEntity.ok(ApiResponse.success(
                "Stats fetched",
                dashboardService.getStudentQuickStats(studentId)));
    }

    @GetMapping("/alerts")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAlerts(
            Authentication auth) {

        return ResponseEntity.ok(ApiResponse.success(
                "Alerts fetched",
                dashboardService.getStudentAlerts(resolveStudentId(auth))));
    }

    @GetMapping("/alerts/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAlerts(
            @PathVariable Long studentId) {

        return ResponseEntity.ok(ApiResponse.success(
                "Alerts fetched",
                dashboardService.getStudentAlerts(studentId)));
    }

    @GetMapping("/performance")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPerformance(
            Authentication auth) {

        return ResponseEntity.ok(ApiResponse.success(
                "Performance trend fetched",
                dashboardService.getStudentPerformance(resolveStudentId(auth))));
    }

    @GetMapping("/performance/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPerformance(
            @PathVariable Long studentId) {

        return ResponseEntity.ok(ApiResponse.success(
                "Performance trend fetched",
                dashboardService.getStudentPerformance(studentId)));
    }

    @GetMapping("/weak-topics")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getWeakTopics(
            Authentication auth) {

        return ResponseEntity.ok(ApiResponse.success(
                "Weak topics fetched",
                dashboardService.getStudentWeakTopics(resolveStudentId(auth))));
    }

    @GetMapping("/weak-topics/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getWeakTopics(
            @PathVariable Long studentId) {

        return ResponseEntity.ok(ApiResponse.success(
                "Weak topics fetched",
                dashboardService.getStudentWeakTopics(studentId)));
    }

    private Long resolveStudentId(Authentication auth) {
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            return null;
        }
        return dashboardService.resolveStudentId(auth.getName());
    }
}
