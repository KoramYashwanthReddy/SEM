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

    List<ExamAttempt> findByStatusIn(List<String> statuses);

    List<ExamAttempt> findByStudentId(Long studentId);

    List<ExamAttempt> findByExamCode(String examCode);

    List<ExamAttempt> findByExamId(Long examId);

    Optional<ExamAttempt> findByStudentIdAndExamCode(Long studentId, String examCode);

    Optional<ExamAttempt> findByExamIdAndStudentId(Long examId, Long studentId);

    // =========================================================
    // ⏱ AUTO-SUBMIT / LIVE
    // =========================================================

    List<ExamAttempt> findByStatusAndExpiryTimeBefore(String status, LocalDateTime time);

    @Query("""
        SELECT e FROM ExamAttempt e 
        WHERE e.status = 'STARTED' 
        AND e.expiryTime > CURRENT_TIMESTAMP 
        AND e.isCancelled = false
    """)
    List<ExamAttempt> findLiveAttempts();

    // 🔥 expired attempts
    List<ExamAttempt> findByExpiryTimeBeforeAndStatus(LocalDateTime time, String status);

    // =========================================================
    // 📊 COUNTS (OPTIMIZED)
    // =========================================================

    long countByStudentId(Long studentId);

    long countByStudentIdAndStatus(Long studentId, String status);

    long countByStatus(String status);

    long countByStatusIn(List<String> statuses);

    long countByIsCancelledTrue();

    long countByIsCancelledFalse();

    long countByCheatingScoreGreaterThan(int score);

    long countByExamId(Long examId);

    // =========================================================
    // 📊 ANALYTICS
    // =========================================================

    @Query("SELECT AVG(e.cheatingScore) FROM ExamAttempt e")
    Double getAverageCheatingScore();

    @Query("SELECT MAX(e.cheatingScore) FROM ExamAttempt e")
    Integer getMaxCheatingScore();

    @Query("SELECT MIN(e.cheatingScore) FROM ExamAttempt e")
    Integer getMinCheatingScore();

    @Query("SELECT AVG(e.score) FROM ExamAttempt e WHERE e.examId = :examId")
    Double getAverageScoreByExam(Long examId);

    @Query("SELECT AVG(e.timeTakenSeconds) FROM ExamAttempt e WHERE e.examId = :examId")
    Double getAverageTimeByExam(Long examId);

    List<ExamAttempt> findTop20ByOrderByStartTimeDesc();

    // =========================================================
    // 🚨 PROCTORING / RISK
    // =========================================================

    List<ExamAttempt> findByCheatingScoreGreaterThan(int score);

    List<ExamAttempt> findTop10ByOrderByCheatingScoreDesc();

    List<ExamAttempt> findByCheatingFlagTrue();

    List<ExamAttempt> findByIsCancelledTrue();

    List<ExamAttempt> findByIsCancelledFalse();

    @Query("SELECT e FROM ExamAttempt e WHERE e.cheatingScore >= 80")
    List<ExamAttempt> findHighRiskAttempts();

    @Query("SELECT e FROM ExamAttempt e WHERE e.cheatingScore BETWEEN 50 AND 79")
    List<ExamAttempt> findWarningAttempts();

    @Query("SELECT e FROM ExamAttempt e WHERE e.cheatingScore < 50")
    List<ExamAttempt> findSafeAttempts();

    // =========================================================
    // 🏆 EXAM ANALYTICS
    // =========================================================

    List<ExamAttempt> findByExamIdAndStatus(Long examId, String status);

    List<ExamAttempt> findByExamIdOrderByCheatingScoreDesc(Long examId);

    @Query("""
        SELECT e FROM ExamAttempt e 
        WHERE e.examId = :examId 
        ORDER BY e.score DESC
    """)
    List<ExamAttempt> findTopPerformersByExam(Long examId);

    @Query("""
        SELECT e FROM ExamAttempt e 
        WHERE e.examId = :examId 
        ORDER BY e.timeTakenSeconds ASC
    """)
    List<ExamAttempt> findFastestAttemptsByExam(Long examId);

    // =========================================================
    // 🔥 LIVE MONITORING
    // =========================================================

    @Query("""
        SELECT e FROM ExamAttempt e 
        WHERE e.status = 'STARTED' 
        AND e.isCancelled = false 
        AND e.cheatingScore >= 50
        ORDER BY e.cheatingScore DESC
    """)
    List<ExamAttempt> findLiveHighRiskAttempts();

    @Query("""
        SELECT e FROM ExamAttempt e 
        WHERE e.status = 'STARTED' 
        AND e.isCancelled = false 
        ORDER BY e.startTime DESC
    """)
    List<ExamAttempt> findRecentLiveAttempts();

    // =========================================================
    // 🔄 RESUME SUPPORT
    // =========================================================

    @Query("""
        SELECT e FROM ExamAttempt e 
        WHERE e.studentId = :studentId
        AND e.status = 'STARTED'
        AND e.isCancelled = false
    """)
    Optional<ExamAttempt> findActiveAttempt(Long studentId);

    // =========================================================
    // ⌛ ABANDONED ATTEMPTS
    // =========================================================

    @Query("""
        SELECT e FROM ExamAttempt e 
        WHERE e.status = 'STARTED'
        AND e.lastHeartbeat < :time
        AND e.isCancelled = false
    """)
    List<ExamAttempt> findAbandonedAttempts(LocalDateTime time);

}