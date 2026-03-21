package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {

    // =========================================================
    // ✅ BASIC QUERIES
    // =========================================================

    List<ExamAttempt> findByStatus(String status);

    List<ExamAttempt> findByStudentId(Long studentId);

    List<ExamAttempt> findByExamCode(String examCode);

    List<ExamAttempt> findByExamId(Long examId);

    Optional<ExamAttempt> findByStudentIdAndExamCode(Long studentId, String examCode);

    Optional<ExamAttempt> findByExamIdAndStudentId(Long examId, Long studentId);

    // =========================================================
    // ⏱ AUTO-SUBMIT / TIME BASED
    // =========================================================

    List<ExamAttempt> findByStatusAndExpiryTimeBefore(String status, LocalDateTime time);

    List<ExamAttempt> findByStartTimeBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT e FROM ExamAttempt e WHERE e.status = 'STARTED' AND e.expiryTime > CURRENT_TIMESTAMP")
    List<ExamAttempt> findLiveAttempts();

    // =========================================================
    // 📊 DASHBOARD / ANALYTICS
    // =========================================================

    long countByStudentId(Long studentId);

    long countByStudentIdAndStatus(Long studentId, String status);

    long countByStatus(String status);

    long countByStatusIn(List<String> statuses);

    @Query("SELECT AVG(e.cheatingScore) FROM ExamAttempt e")
    Double getAverageCheatingScore();

    List<ExamAttempt> findTop20ByOrderByStartTimeDesc();

    // =========================================================
    // 🚨 CHEATING / PROCTORING
    // =========================================================

    List<ExamAttempt> findByStatusIn(List<String> statuses); // FLAGGED, INVALIDATED

    List<ExamAttempt> findByCheatingScoreGreaterThan(int score);

    List<ExamAttempt> findTop10ByOrderByCheatingScoreDesc();

    List<ExamAttempt> findByCheatingFlagTrue();

    // =========================================================
    // 🏆 EXAM-SPECIFIC ANALYTICS
    // =========================================================

    List<ExamAttempt> findByExamIdAndStatus(Long examId, String status);

    List<ExamAttempt> findByExamIdOrderByCheatingScoreDesc(Long examId);
}