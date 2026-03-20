package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.AIAnalysisResponse;
import com.yashwanth.ai_exam_system.service.AIAnalysisService;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai-analysis")
public class AIAnalysisController {

    private final AIAnalysisService aiAnalysisService;

    public AIAnalysisController(AIAnalysisService aiAnalysisService) {
        this.aiAnalysisService = aiAnalysisService;
    }

    @GetMapping("/student/{studentId}")
    public AIAnalysisResponse analyzeStudent(@PathVariable Long studentId) {
        return aiAnalysisService.analyzeStudent(studentId);
    }
}