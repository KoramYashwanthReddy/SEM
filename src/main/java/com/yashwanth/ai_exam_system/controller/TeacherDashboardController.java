package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.TeacherDashboardResponse;
import com.yashwanth.ai_exam_system.service.TeacherDashboardService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/teacher/dashboard")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherDashboardController {

    private final TeacherDashboardService dashboardService;

    public TeacherDashboardController(
            TeacherDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getDashboard(
            Authentication auth) {

        TeacherDashboardResponse dashboard =
                dashboardService.getDashboard(auth);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("data", dashboard);

        return ResponseEntity.ok(response);
    }
}