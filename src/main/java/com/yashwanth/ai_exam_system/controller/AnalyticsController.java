package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.AnalyticsResponse;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import com.yashwanth.ai_exam_system.service.AnalyticsService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final UserRepository userRepository;

    public AnalyticsController(AnalyticsService analyticsService, UserRepository userRepository) {
        this.analyticsService = analyticsService;
        this.userRepository = userRepository;
    }

    // ================= ADMIN / TEACHER =================

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<AnalyticsResponse> getStudentAnalytics(
            @PathVariable Long studentId) {

        return ResponseEntity.ok(
                analyticsService.getStudentAnalytics(studentId));
    }

    @GetMapping("/exam/{examCode}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<Map<String, Object>> getExamAnalytics(
            @PathVariable String examCode) {

        return ResponseEntity.ok(
                analyticsService.getExamAnalytics(examCode));
    }

    @GetMapping("/class/{examCode}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<Map<String, Object>> getClassAnalytics(
            @PathVariable String examCode) {

        return ResponseEntity.ok(
                analyticsService.getClassAnalytics(examCode));
    }

    // ================= STUDENT SELF =================

    @GetMapping("/me/{studentId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<AnalyticsResponse> getMyAnalytics(
            @PathVariable Long studentId,
            Authentication auth) {

        validateStudentOwnership(studentId, auth);
        return ResponseEntity.ok(
                analyticsService.getStudentAnalytics(studentId));
    }

    @GetMapping("/me/{studentId}/trend")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> getMyTrend(
            @PathVariable Long studentId,
            Authentication auth) {

        validateStudentOwnership(studentId, auth);
        return ResponseEntity.ok(
                analyticsService.getPerformanceTrend(studentId));
    }

    @GetMapping("/me/{studentId}/history")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> getMyHistory(
            @PathVariable Long studentId,
            Authentication auth) {

        validateStudentOwnership(studentId, auth);
        return ResponseEntity.ok(
                analyticsService.getStudentHistory(studentId));
    }

    private void validateStudentOwnership(Long studentId, Authentication auth) {
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            throw new ForbiddenException("Authentication required");
        }
        User user = userRepository.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated student not found"));
        if (!studentId.equals(user.getId())) {
            throw new ForbiddenException("You can only view your own analytics");
        }
    }

    // ================= LEADERBOARD =================

    @GetMapping("/leaderboard/{examCode}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER','STUDENT')")
    public ResponseEntity<Map<String, Object>> getLeaderboard(
            @PathVariable String examCode) {

        return ResponseEntity.ok(
                analyticsService.getLeaderboardAnalytics(examCode));
    }

    // ================= ADMIN DASHBOARD =================

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getAdminDashboard() {

        return ResponseEntity.ok(
                analyticsService.getAdminDashboard());
    }
}