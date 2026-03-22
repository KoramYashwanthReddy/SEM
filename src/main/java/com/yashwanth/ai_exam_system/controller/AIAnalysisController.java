package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.AIAnalysisResponse;
import com.yashwanth.ai_exam_system.service.AIAnalysisService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai-analysis")
public class AIAnalysisController {

    private final AIAnalysisService aiAnalysisService;

    public AIAnalysisController(AIAnalysisService aiAnalysisService) {
        this.aiAnalysisService = aiAnalysisService;
    }

    // ================= STUDENT ANALYSIS =================

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<AIAnalysisResponse> analyzeStudent(
            @PathVariable Long studentId) {

        return ResponseEntity.ok(
                aiAnalysisService.analyzeStudent(studentId));
    }

    // ================= EXAM ANALYSIS =================

    @GetMapping("/exam/{examId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<Map<String, Object>> analyzeExam(
            @PathVariable Long examId) {

        return ResponseEntity.ok(
                aiAnalysisService.analyzeExam(examId));
    }

    // ================= CLASS ANALYSIS =================

    @GetMapping("/class/{examId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<Map<String, Object>> analyzeClass(
            @PathVariable Long examId) {

        return ResponseEntity.ok(
                aiAnalysisService.analyzeClassPerformance(examId));
    }

    // ================= WEAKNESS DETECTION =================

    @GetMapping("/weakness/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<Map<String, Object>> detectWeakness(
            @PathVariable Long studentId) {

        return ResponseEntity.ok(
                aiAnalysisService.detectWeakTopics(studentId));
    }

    // ================= AI RISK SCORE =================

    @GetMapping("/risk/{studentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getRiskScore(
            @PathVariable Long studentId) {

        return ResponseEntity.ok(
                aiAnalysisService.getStudentRiskScore(studentId));
    }
}