package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.*;
import com.yashwanth.ai_exam_system.repository.*;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class AdminService {

    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final ProctoringEventRepository proctoringEventRepository;
    private final CheatingEvidenceRepository evidenceRepository;

    public AdminService(
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository,
            ProctoringEventRepository proctoringEventRepository,
            CheatingEvidenceRepository evidenceRepository) {

        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.proctoringEventRepository = proctoringEventRepository;
        this.evidenceRepository = evidenceRepository;
    }

    // ================= EXAMS =================

    public List<Exam> getAllExams() {
        return examRepository.findAll();
    }

    public void deleteExam(String examCode) {
        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        exam.setActive(false);
        examRepository.save(exam);
    }

    // ================= ATTEMPTS =================

    public List<ExamAttempt> getAllAttempts() {
        return attemptRepository.findAll();
    }

    public List<ExamAttempt> getAttemptsByExam(String examCode) {
        return attemptRepository.findByExamCode(examCode);
    }

    public List<ExamAttempt> getAttemptsByStudent(Long studentId) {
        return attemptRepository.findByStudentId(studentId);
    }

    // 🔥 NEW: Suspicious attempts
    public List<ExamAttempt> getSuspiciousAttempts() {
        return attemptRepository.findByStatusIn(
                Arrays.asList("FLAGGED", "INVALIDATED")
        );
    }

    // ================= CHEATING EVENTS =================

    public List<ProctoringEvent> getAllCheatingLogs() {
        return proctoringEventRepository.findAll();
    }

    public List<ProctoringEvent> getEventsByAttempt(Long attemptId) {
        return proctoringEventRepository.findByAttemptId(attemptId);
    }

    public Integer getCheatingScore(Long attemptId) {

        // Try aggregated score
        Integer score = proctoringEventRepository.getTotalSeverityScore(attemptId);

        if (score != null) return score;

        // Fallback: use ExamAttempt field
        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        return attempt.getCheatingScore();
    }

    // ================= 🔥 EVIDENCE =================

    public List<CheatingEvidence> getAllEvidence() {
        return evidenceRepository.findAll();
    }

    public List<CheatingEvidence> getEvidenceByExam(Long examId) {
        return evidenceRepository.findByExamId(examId);
    }

    public List<CheatingEvidence> getEvidenceByStudent(Long studentId) {
        return evidenceRepository.findByStudentId(studentId);
    }

    // ================= 🔥 ADMIN CONTROL =================

    // 🚨 Force cancel
    public void cancelAttempt(Long attemptId) {

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        if ("INVALIDATED".equals(attempt.getStatus())) return;

        attempt.setStatus("INVALIDATED");
        attempt.setEndTime(LocalDateTime.now());
        attempt.setRemarks("Cancelled manually by admin");

        attemptRepository.save(attempt);
    }

    // 🔄 Restore attempt
    public void restoreAttempt(Long attemptId) {

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        if (!"INVALIDATED".equals(attempt.getStatus())) return;

        attempt.setStatus("SUBMITTED");
        attempt.setRemarks("Restored by admin");

        attemptRepository.save(attempt);
    }

    // ================= 📊 DASHBOARD =================

    public Map<String, Object> getDashboardStats() {

        Map<String, Object> stats = new HashMap<>();

        long totalExams = examRepository.count();
        long totalAttempts = attemptRepository.count();

        long suspicious = attemptRepository.findByStatusIn(
                Arrays.asList("FLAGGED", "INVALIDATED")
        ).size();

        long cancelled = attemptRepository.findByStatus("INVALIDATED").size();

        stats.put("totalExams", totalExams);
        stats.put("totalAttempts", totalAttempts);
        stats.put("suspiciousAttempts", suspicious);
        stats.put("cancelledAttempts", cancelled);
        stats.put("timestamp", LocalDateTime.now());

        return stats;
    }
}