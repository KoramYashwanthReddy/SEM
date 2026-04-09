package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.CreateTeacherRequest;
import com.yashwanth.ai_exam_system.entity.CheatingEvidence;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.entity.Question;
import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.service.AdminService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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

    // =====================================================
    // ================= TEACHERS =================
    // =====================================================

    @PostMapping(value = "/teachers", consumes = "application/json")
    public ResponseEntity<Map<String, Object>> createTeacher(
            @Valid @RequestBody CreateTeacherRequest request) {

        return ResponseEntity.ok(
                adminService.createTeacher(request, null));
    }

    @PostMapping(value = "/teachers", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> createTeacherWithProfileImage(
            @Valid @RequestPart("request") CreateTeacherRequest request,
            @RequestPart(value = "profileImage", required = false) MultipartFile profileImage) {

        return ResponseEntity.ok(
                adminService.createTeacher(request, profileImage));
    }

    @PutMapping(value = "/teachers/{userId}", consumes = "application/json")
    public ResponseEntity<Map<String, Object>> updateTeacher(
            @PathVariable Long userId,
            @RequestBody CreateTeacherRequest request) {

        return ResponseEntity.ok(
                adminService.updateTeacher(userId, request, null));
    }

    @PutMapping(value = "/teachers/{userId}", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> updateTeacherWithProfileImage(
            @PathVariable Long userId,
            @RequestPart("request") CreateTeacherRequest request,
            @RequestPart(value = "profileImage", required = false) MultipartFile profileImage) {

        return ResponseEntity.ok(
                adminService.updateTeacher(userId, request, profileImage));
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @GetMapping("/users/students")
    public ResponseEntity<List<Map<String, Object>>> getStudents() {
        return ResponseEntity.ok(adminService.getUsersByRole(Role.STUDENT));
    }

    @GetMapping("/users/teachers")
    public ResponseEntity<List<Map<String, Object>>> getTeachers() {
        return ResponseEntity.ok(adminService.getUsersByRole(Role.TEACHER));
    }

    @GetMapping("/teachers/{userId}/activity")
    public ResponseEntity<Map<String, Object>> getTeacherActivity(
            @PathVariable Long userId) {
        return ResponseEntity.ok(adminService.getTeacherActivity(userId));
    }

    @GetMapping("/teachers/unique-check")
    public ResponseEntity<Map<String, Object>> checkTeacherUniqueFields(
            @RequestParam(value = "email", required = false) String email,
            @RequestParam(value = "employeeId", required = false) String employeeId,
            @RequestParam(value = "phone", required = false) String phone,
            @RequestParam(value = "excludeUserId", required = false) Long excludeUserId) {

        return ResponseEntity.ok(
                adminService.checkTeacherUniqueness(email, employeeId, phone, excludeUserId));
    }

    @PostMapping("/users/{userId}/toggle-enabled")
    public ResponseEntity<Map<String, Object>> toggleUserEnabled(
            @PathVariable Long userId) {
        return ResponseEntity.ok(adminService.toggleUserEnabled(userId));
    }

    @PostMapping("/users/{userId}/toggle-lock")
    public ResponseEntity<Map<String, Object>> toggleUserLocked(
            @PathVariable Long userId) {
        return ResponseEntity.ok(adminService.toggleUserLocked(userId));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long userId) {
        adminService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    // =====================================================
    // ================= EXAMS =================
    // =====================================================

    @GetMapping("/exams")
    public ResponseEntity<List<Exam>> getAllExams() {
        return ResponseEntity.ok(adminService.getAllExams());
    }

    @DeleteMapping("/exams/{examCode}")
    public ResponseEntity<Void> deleteExam(@PathVariable String examCode) {
        adminService.deleteExam(examCode);
        return ResponseEntity.noContent().build();
    }

    // =====================================================
    // ================= ATTEMPTS =================
    // =====================================================

    @GetMapping("/attempts")
    public ResponseEntity<List<Map<String, Object>>> getAllAttempts() {
        return ResponseEntity.ok(adminService.getAllAttempts());
    }

    @GetMapping("/attempts/exam/{examCode}")
    public ResponseEntity<List<Map<String, Object>>> getAttemptsByExam(
            @PathVariable String examCode) {

        return ResponseEntity.ok(
                adminService.getAttemptsByExam(examCode));
    }

    @GetMapping("/attempts/student/{studentId}")
    public ResponseEntity<List<Map<String, Object>>> getAttemptsByStudent(
            @PathVariable Long studentId) {

        return ResponseEntity.ok(
                adminService.getAttemptsByStudent(studentId));
    }

    @GetMapping("/attempts/suspicious")
    public ResponseEntity<List<Map<String, Object>>> getSuspiciousAttempts() {
        return ResponseEntity.ok(
                adminService.getSuspiciousAttempts());
    }

    @GetMapping("/attempts/live-high-risk")
    public ResponseEntity<List<Map<String, Object>>> getLiveHighRiskAttempts() {
        return ResponseEntity.ok(
                adminService.getLiveHighRiskAttempts());
    }

    @GetMapping("/attempts/top-risk")
    public ResponseEntity<List<Map<String, Object>>> getTopRiskAttempts() {
        return ResponseEntity.ok(
                adminService.getTopRiskAttempts());
    }

    // =====================================================
    // ================= CHEATING EVENTS =================
    // =====================================================

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

    // =====================================================
    // ================= EVIDENCE =================
    // =====================================================

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

    // =====================================================
    // ================= QUESTIONS =================
    // =====================================================

    @GetMapping("/questions")
    public ResponseEntity<List<Question>> getAllQuestions() {
        return ResponseEntity.ok(adminService.getAllQuestions());
    }

    @GetMapping("/questions/exam/{examCode}")
    public ResponseEntity<List<Question>> getQuestionsByExam(
            @PathVariable String examCode) {

        return ResponseEntity.ok(adminService.getQuestionsByExam(examCode));
    }

    @PostMapping("/questions/exam/{examCode}/bulk")
    public ResponseEntity<Map<String, Object>> bulkUploadQuestions(
            @PathVariable String examCode,
            @RequestBody List<Map<String, Object>> questions) {

        return ResponseEntity.ok(adminService.bulkUploadQuestions(examCode, questions));
    }

    // =====================================================
    // ================= ADMIN CONTROL =================
    // =====================================================

    @PostMapping("/attempts/{attemptId}/cancel")
    public ResponseEntity<String> cancelAttempt(
            @PathVariable Long attemptId) {

        adminService.cancelAttempt(attemptId);
        return ResponseEntity.ok("Attempt cancelled successfully");
    }

    @PostMapping("/attempts/{attemptId}/force-submit")
    public ResponseEntity<String> forceSubmitAttempt(
            @PathVariable Long attemptId) {

        adminService.forceSubmitAttempt(attemptId);
        return ResponseEntity.ok("Attempt force submitted successfully");
    }

    @PostMapping("/attempts/{attemptId}/restore")
    public ResponseEntity<String> restoreAttempt(
            @PathVariable Long attemptId) {

        adminService.restoreAttempt(attemptId);
        return ResponseEntity.ok("Attempt restored successfully");
    }

    // =====================================================
    // ================= DASHBOARD =================
    // =====================================================

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        return ResponseEntity.ok(
                adminService.getDashboardStats());
    }
}
