package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.ExamRequest;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.service.ExamService;

import jakarta.validation.Valid;

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

    private final ExamService examService;

    public TeacherExamController(ExamService examService) {
        this.examService = examService;
    }

    // ================= CREATE =================

    @PostMapping
    public ResponseEntity<?> createExam(
            @Valid @RequestBody ExamRequest request,
            Authentication auth) {

        Exam exam = examService.createExam(request, auth);

        return ResponseEntity.ok(buildResponse("Exam created successfully", exam));
    }

    // ================= GET ALL =================

    @GetMapping
    public ResponseEntity<List<Exam>> getMyExams(Authentication auth) {
        return ResponseEntity.ok(examService.getTeacherExams(auth));
    }

    // ================= GET SINGLE =================

    @GetMapping("/{examCode}")
    public ResponseEntity<Exam> getExamByCode(@PathVariable String examCode) {
        return ResponseEntity.ok(examService.getExamByCode(examCode));
    }

    // ================= UPDATE =================

    @PutMapping("/{examCode}")
    public ResponseEntity<?> updateExam(
            @PathVariable String examCode,
            @Valid @RequestBody ExamRequest request) {

        Exam updatedExam = examService.updateExam(examCode, request);

        return ResponseEntity.ok(buildResponse("Exam updated successfully", updatedExam));
    }

    // ================= PUBLISH =================

    @PutMapping("/{examCode}/publish")
    public ResponseEntity<?> publishExam(@PathVariable String examCode) {

        Exam exam = examService.publishExam(examCode);

        return ResponseEntity.ok(buildResponse("Exam published successfully", exam));
    }

    // ================= DELETE (SOFT) =================

    @DeleteMapping("/{examCode}")
    public ResponseEntity<?> deleteExam(@PathVariable String examCode) {

        examService.deleteExamByTeacher(examCode);

        return ResponseEntity.ok(buildMessage("Exam deleted successfully"));
    }

    // ================= ANALYTICS =================

    @GetMapping("/{examCode}/attempts")
    public ResponseEntity<List<ExamAttempt>> getExamAttempts(@PathVariable String examCode) {
        return ResponseEntity.ok(examService.getAttemptsByExamCode(examCode));
    }

    @GetMapping("/{examCode}/analytics")
    public ResponseEntity<Map<String, Object>> getExamAnalytics(@PathVariable String examCode) {
        return ResponseEntity.ok(examService.getExamAnalytics(examCode));
    }

    // ================= HELPERS =================

    private Map<String, Object> buildResponse(String message, Object data) {
        Map<String, Object> res = new HashMap<>();
        res.put("message", message);
        res.put("data", data);
        return res;
    }

    private Map<String, Object> buildMessage(String message) {
        Map<String, Object> res = new HashMap<>();
        res.put("message", message);
        return res;
    }
}