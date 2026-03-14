package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.StudentDashboardResponse;
import com.yashwanth.ai_exam_system.service.StudentDashboardService;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/student")
public class StudentDashboardController {

    private final StudentDashboardService dashboardService;

    public StudentDashboardController(StudentDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/dashboard/{studentId}")
    public StudentDashboardResponse getDashboard(@PathVariable Long studentId) {

        return dashboardService.getDashboard(studentId);
    }
}