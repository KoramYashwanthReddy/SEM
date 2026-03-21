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

    // =========================================================
    // ================= EXAMS =================
    // =========================================================

    public List<Exam> getAllExams() {
        return examRepository.findAll();
    }

    public void deleteExam(String examCode) {
        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        exam.setActive(false);
        examRepository.save(exam);
    }

    // =========================================================
    // ================= ATTEMPTS =================
    // =========================================================

    public List<ExamAttempt> getAllAttempts() {
        return attemptRepository.findAll();
    }

    public List<ExamAttempt> getAttemptsByExam(String examCode) {
        return attemptRepository.findByExamCode(examCode);
    }

    public List<ExamAttempt> getAttemptsByStudent(Long studentId) {
        return attemptRepository.findByStudentId(studentId);
    }

    // 🔥 UPDATED: Suspicious attempts (based on score + status)
    public List<ExamAttempt> getSuspiciousAttempts() {

        List<ExamAttempt> flagged =
                attemptRepository.findByStatusIn(Arrays.asList("FLAGGED", "INVALIDATED"));

        List<ExamAttempt> highScore =
                attemptRepository.findByCheatingScoreGreaterThan(50);

        // merge + remove duplicates
        Set<ExamAttempt> result = new HashSet<>(flagged);
        result.addAll(highScore);

        return new ArrayList<>(result);
    }

    // 🔥 NEW: Top cheating students
    public List<ExamAttempt> getTopRiskAttempts() {
        return attemptRepository.findTop10ByOrderByCheatingScoreDesc();
    }

    // =========================================================
    // ================= CHEATING EVENTS =================
    // =========================================================

    public List<ProctoringEvent> getAllCheatingLogs() {
        return proctoringEventRepository.findAll();
    }

    public List<ProctoringEvent> getEventsByAttempt(Long attemptId) {
        return proctoringEventRepository.findByAttemptId(attemptId);
    }

    // 🔥 UPDATED: Use SCORE (not severity ❗)
    public Integer getCheatingScore(Long attemptId) {

        Integer score = proctoringEventRepository.getTotalScore(attemptId);

        if (score != null && score > 0) return score;

        // fallback
        return attemptRepository.findById(attemptId)
                .map(ExamAttempt::getCheatingScore)
                .orElse(0);
    }

    // =========================================================
    // ================= 🔥 EVIDENCE =================
    // =========================================================

    public List<CheatingEvidence> getAllEvidence() {
        return evidenceRepository.findAll();
    }

    public List<CheatingEvidence> getEvidenceByExam(Long examId) {
        return evidenceRepository.findByExamId(examId);
    }

    public List<CheatingEvidence> getEvidenceByStudent(Long studentId) {
        return evidenceRepository.findByStudentId(studentId);
    }

    // =========================================================
    // ================= 🔥 ADMIN CONTROL =================
    // =========================================================

    // 🚨 Force cancel (UPDATED)
    public void cancelAttempt(Long attemptId) {

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        if (Boolean.TRUE.equals(attempt.getIsCancelled())) return;

        attempt.markCancelled();
        attempt.setRemarks("Cancelled manually by admin");

        attemptRepository.save(attempt);
    }

    // 🔄 Restore attempt (UPDATED)
    public void restoreAttempt(Long attemptId) {

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        if (!Boolean.TRUE.equals(attempt.getIsCancelled())) return;

        attempt.setIsCancelled(false);
        attempt.setStatus("SUBMITTED");
        attempt.setRemarks("Restored by admin");

        attemptRepository.save(attempt);
    }

    // =========================================================
    // ================= 📊 DASHBOARD =================
    // =========================================================

    public Map<String, Object> getDashboardStats() {

        Map<String, Object> stats = new HashMap<>();

        long totalExams = examRepository.count();
        long totalAttempts = attemptRepository.count();

        long suspicious = getSuspiciousAttempts().size();
        long cancelled = attemptRepository.findByIsCancelledTrue().size();

        Double avgScore = attemptRepository.getAverageCheatingScore();

        stats.put("totalExams", totalExams);
        stats.put("totalAttempts", totalAttempts);
        stats.put("suspiciousAttempts", suspicious);
        stats.put("cancelledAttempts", cancelled);
        stats.put("averageCheatingScore", avgScore != null ? avgScore : 0);
        stats.put("timestamp", LocalDateTime.now());

        return stats;
    }

    // =========================================================
    // ================= 🔥 LIVE MONITORING =================
    // =========================================================

    public List<ExamAttempt> getLiveHighRiskAttempts() {

        List<ExamAttempt> liveAttempts = attemptRepository.findLiveAttempts();

        List<ExamAttempt> risky = new ArrayList<>();

        for (ExamAttempt attempt : liveAttempts) {
            if (attempt.getCheatingScore() >= 50) {
                risky.add(attempt);
            }
        }

        // sort by highest risk
        risky.sort((a, b) ->
                b.getCheatingScore().compareTo(a.getCheatingScore())
        );

        return risky;
    }
}