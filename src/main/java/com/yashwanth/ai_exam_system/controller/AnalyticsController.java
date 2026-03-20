package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.AnalyticsResponse;
import com.yashwanth.ai_exam_system.service.AnalyticsService;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/student/{studentId}")
    public AnalyticsResponse getStudentAnalytics(@PathVariable Long studentId) {
        return analyticsService.getStudentAnalytics(studentId);
    }
}