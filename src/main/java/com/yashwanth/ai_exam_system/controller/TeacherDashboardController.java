package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.ApiResponse;
import com.yashwanth.ai_exam_system.dto.TeacherDashboardResponse;
import com.yashwanth.ai_exam_system.service.TeacherDashboardService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/teacher/dashboard")
@PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
public class TeacherDashboardController {

    private final TeacherDashboardService dashboardService;

    public TeacherDashboardController(
            TeacherDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<TeacherDashboardResponse>> getDashboard(
            Authentication auth) {

        TeacherDashboardResponse dashboard =
                dashboardService.getDashboard(auth);

        return ResponseEntity.ok(ApiResponse.success("Teacher dashboard fetched", dashboard));
    }
}
