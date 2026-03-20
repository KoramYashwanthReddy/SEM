package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.service.AdminService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ✅ EXAMS
    @GetMapping("/exams")
    public ResponseEntity<List<Exam>> getAllExams() {
        return ResponseEntity.ok(adminService.getAllExams());
    }

    @DeleteMapping("/exams/{examCode}")
    public ResponseEntity<String> deleteExam(@PathVariable String examCode) {
        adminService.deleteExam(examCode);
        return ResponseEntity.ok("Exam deleted successfully");
    }

    // ✅ ATTEMPTS
    @GetMapping("/attempts")
    public ResponseEntity<List<ExamAttempt>> getAllAttempts() {
        return ResponseEntity.ok(adminService.getAllAttempts());
    }

    @GetMapping("/attempts/exam/{examCode}")
    public ResponseEntity<List<ExamAttempt>> getAttemptsByExam(@PathVariable String examCode) {
        return ResponseEntity.ok(adminService.getAttemptsByExam(examCode));
    }

    @GetMapping("/attempts/student/{studentId}")
    public ResponseEntity<List<ExamAttempt>> getAttemptsByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(adminService.getAttemptsByStudent(studentId));
    }

    // ✅ ALL CHEATING EVENTS
    @GetMapping("/cheating-reports")
    public ResponseEntity<List<ProctoringEvent>> getCheatingReports() {
        return ResponseEntity.ok(adminService.getAllCheatingLogs());
    }

    // 🔥 NEW: EVENTS BY ATTEMPT
    @GetMapping("/cheating/{attemptId}")
    public ResponseEntity<List<ProctoringEvent>> getEventsByAttempt(@PathVariable Long attemptId) {
        return ResponseEntity.ok(adminService.getEventsByAttempt(attemptId));
    }

    // 🔥 NEW: CHEATING SCORE
    @GetMapping("/cheating-score/{attemptId}")
    public ResponseEntity<Integer> getCheatingScore(@PathVariable Long attemptId) {
        return ResponseEntity.ok(adminService.getCheatingScore(attemptId));
    }
}