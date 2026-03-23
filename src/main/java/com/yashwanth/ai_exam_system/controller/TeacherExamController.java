package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.ExamRequest;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.service.ExamService;

import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teacher/exams")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherExamController {

    private static final Logger logger =
            LoggerFactory.getLogger(TeacherExamController.class);

    private final ExamService examService;

    public TeacherExamController(ExamService examService) {
        this.examService = examService;
    }

    // =========================================================
    // CREATE EXAM
    // =========================================================
    @PostMapping
    public ResponseEntity<Map<String, Object>> createExam(
            @Valid @RequestBody ExamRequest request,
            Authentication auth) {

        logger.info("Teacher creating exam");

        Exam exam = examService.createExam(request, auth);

        return success("Exam created successfully", exam);
    }

    // =========================================================
    // GET MY EXAMS
    // =========================================================
    @GetMapping
    public ResponseEntity<Map<String, Object>> getMyExams(
            Authentication auth) {

        List<Exam> exams = examService.getTeacherExams(auth);

        return success("Exams fetched successfully", exams);
    }

    // =========================================================
    // GET SINGLE EXAM
    // =========================================================
    @GetMapping("/{examCode}")
    public ResponseEntity<Map<String, Object>> getExamByCode(
            @PathVariable String examCode) {

        Exam exam = examService.getExamByCode(examCode);

        return success("Exam fetched successfully", exam);
    }

    // =========================================================
    // UPDATE EXAM
    // =========================================================
    @PutMapping("/{examCode}")
    public ResponseEntity<Map<String, Object>> updateExam(
            @PathVariable String examCode,
            @Valid @RequestBody ExamRequest request) {

        logger.info("Updating exam {}", examCode);

        Exam updatedExam =
                examService.updateExam(examCode, request);

        return success("Exam updated successfully", updatedExam);
    }

    // =========================================================
    // PUBLISH EXAM
    // =========================================================
    @PutMapping("/{examCode}/publish")
    public ResponseEntity<Map<String, Object>> publishExam(
            @PathVariable String examCode) {

        Exam exam = examService.publishExam(examCode);

        return success("Exam published successfully", exam);
    }

    // =========================================================
    // DELETE (SOFT)
    // =========================================================
    @DeleteMapping("/{examCode}")
    public ResponseEntity<Map<String, Object>> deleteExam(
            @PathVariable String examCode) {

        examService.deleteExamByTeacher(examCode);

        return success("Exam deleted successfully", null);
    }

    // =========================================================
    // ATTEMPTS
    // =========================================================
    @GetMapping("/{examCode}/attempts")
    public ResponseEntity<Map<String, Object>> getExamAttempts(
            @PathVariable String examCode) {

        List<ExamAttempt> attempts =
                examService.getAttemptsByExamCode(examCode);

        return success("Exam attempts fetched", attempts);
    }

    // =========================================================
    // ANALYTICS
    // =========================================================
    @GetMapping("/{examCode}/analytics")
    public ResponseEntity<Map<String, Object>> getExamAnalytics(
            @PathVariable String examCode) {

        Map<String, Object> analytics =
                examService.getExamAnalytics(examCode);

        return success("Exam analytics fetched", analytics);
    }

    // =========================================================
    // SUCCESS RESPONSE
    // =========================================================
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