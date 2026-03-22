package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.entity.CheatingEvidence;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.service.AdminService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ================= EXAMS =================

    @GetMapping("/exams")
    public ResponseEntity<List<Exam>> getAllExams() {
        return ResponseEntity.ok(adminService.getAllExams());
    }

    @DeleteMapping("/exams/{examCode}")
    public ResponseEntity<Void> deleteExam(@PathVariable String examCode) {
        adminService.deleteExam(examCode);
        return ResponseEntity.noContent().build();
    }

    // ================= ATTEMPTS =================

    @GetMapping("/attempts")
    public ResponseEntity<List<ExamAttempt>> getAllAttempts() {
        return ResponseEntity.ok(adminService.getAllAttempts());
    }

    @GetMapping("/attempts/exam/{examCode}")
    public ResponseEntity<List<ExamAttempt>> getAttemptsByExam(
            @PathVariable String examCode) {

        return ResponseEntity.ok(
                adminService.getAttemptsByExam(examCode));
    }

    @GetMapping("/attempts/student/{studentId}")
    public ResponseEntity<List<ExamAttempt>> getAttemptsByStudent(
            @PathVariable Long studentId) {

        return ResponseEntity.ok(
                adminService.getAttemptsByStudent(studentId));
    }

    // Suspicious attempts
    @GetMapping("/attempts/suspicious")
    public ResponseEntity<List<ExamAttempt>> getSuspiciousAttempts() {
        return ResponseEntity.ok(
                adminService.getSuspiciousAttempts());
    }

    // ================= CHEATING EVENTS =================

    @GetMapping("/cheating")
    public ResponseEntity<List<ProctoringEvent>> getCheatingReports() {
        return ResponseEntity.ok(
                adminService.getAllCheatingLogs());
    }

    @GetMapping("/cheating/{attemptId}")
    public ResponseEntity<List<ProctoringEvent>> getEventsByAttempt(
            @PathVariable Long attemptId) {

        return ResponseEntity.ok(
                adminService.getEventsByAttempt(attemptId));
    }

    @GetMapping("/cheating/{attemptId}/score")
    public ResponseEntity<Integer> getCheatingScore(
            @PathVariable Long attemptId) {

        return ResponseEntity.ok(
                adminService.getCheatingScore(attemptId));
    }

    // ================= EVIDENCE =================

    @GetMapping("/evidence")
    public ResponseEntity<List<CheatingEvidence>> getAllEvidence() {
        return ResponseEntity.ok(
                adminService.getAllEvidence());
    }

    @GetMapping("/evidence/exam/{examId}")
    public ResponseEntity<List<CheatingEvidence>> getEvidenceByExam(
            @PathVariable Long examId) {

        return ResponseEntity.ok(
                adminService.getEvidenceByExam(examId));
    }

    @GetMapping("/evidence/student/{studentId}")
    public ResponseEntity<List<CheatingEvidence>> getEvidenceByStudent(
            @PathVariable Long studentId) {

        return ResponseEntity.ok(
                adminService.getEvidenceByStudent(studentId));
    }

    // ================= ADMIN CONTROL =================

    // cancel attempt
    @PostMapping("/attempts/{attemptId}/cancel")
    public ResponseEntity<String> cancelAttempt(
            @PathVariable Long attemptId) {

        adminService.cancelAttempt(attemptId);
        return ResponseEntity.ok("Attempt cancelled");
    }

    // restore attempt
    @PostMapping("/attempts/{attemptId}/restore")
    public ResponseEntity<String> restoreAttempt(
            @PathVariable Long attemptId) {

        adminService.restoreAttempt(attemptId);
        return ResponseEntity.ok("Attempt restored");
    }

    // ================= DASHBOARD =================

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        return ResponseEntity.ok(
                adminService.getDashboardStats());
    }
}