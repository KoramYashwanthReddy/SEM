package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ProctoringLog;
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

    // ✅ GET ALL EXAMS
    @GetMapping("/exams")
    public ResponseEntity<List<Exam>> getAllExams() {
        return ResponseEntity.ok(adminService.getAllExams());
    }

    // ✅ DELETE EXAM (SOFT DELETE)
    @DeleteMapping("/exams/{examCode}")
    public ResponseEntity<String> deleteExam(@PathVariable String examCode) {
        adminService.deleteExam(examCode);
        return ResponseEntity.ok("Exam deleted successfully");
    }

    // ✅ GET ALL ATTEMPTS
    @GetMapping("/attempts")
    public ResponseEntity<List<ExamAttempt>> getAllAttempts() {
        return ResponseEntity.ok(adminService.getAllAttempts());
    }

    // ✅ FILTER ATTEMPTS BY EXAM
    @GetMapping("/attempts/exam/{examCode}")
    public ResponseEntity<List<ExamAttempt>> getAttemptsByExam(@PathVariable String examCode) {
        return ResponseEntity.ok(adminService.getAttemptsByExam(examCode));
    }

    // ✅ FILTER ATTEMPTS BY STUDENT
    @GetMapping("/attempts/student/{studentId}")
    public ResponseEntity<List<ExamAttempt>> getAttemptsByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(adminService.getAttemptsByStudent(studentId));
    }

    // ✅ GET CHEATING REPORTS
    @GetMapping("/cheating-reports")
    public ResponseEntity<List<ProctoringLog>> getCheatingReports() {
        return ResponseEntity.ok(adminService.getAllCheatingLogs());
    }
}