package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {

    // =========================================================
    // BASIC QUERIES
    // =========================================================

    List<ExamAttempt> findByStatus(String status);

    List<ExamAttempt> findByStatusIn(List<String> statuses);

    List<ExamAttempt> findByStudentId(Long studentId);

    List<ExamAttempt> findByExamCode(String examCode);

    // ✅ FIX — required for teacher dashboard
    List<ExamAttempt> findByExamCodeIn(List<String> examCodes);

    List<ExamAttempt> findByExamId(Long examId);

    Optional<ExamAttempt> findByStudentIdAndExamCode(Long studentId, String examCode);

    Optional<ExamAttempt> findByExamIdAndStudentId(Long examId, Long studentId);

    // =========================================================
    // LIVE / AUTO SUBMIT
    // =========================================================

    List<ExamAttempt> findByStatusAndExpiryTimeBefore(String status, LocalDateTime time);

    List<ExamAttempt> findByExpiryTimeBeforeAndStatus(LocalDateTime time, String status);

    @Query("""
        SELECT e FROM ExamAttempt e
        WHERE e.status = 'STARTED'
        AND e.expiryTime > CURRENT_TIMESTAMP
        AND e.isCancelled = false
    """)
    List<ExamAttempt> findLiveAttempts();

    // =========================================================
    // COUNTS
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
    // GLOBAL ANALYTICS
    // =========================================================

    @Query("SELECT COALESCE(AVG(e.cheatingScore),0) FROM ExamAttempt e")
    Double getAverageCheatingScore();

    @Query("SELECT COALESCE(MAX(e.cheatingScore),0) FROM ExamAttempt e")
    Integer getMaxCheatingScore();

    @Query("SELECT COALESCE(MIN(e.cheatingScore),0) FROM ExamAttempt e")
    Integer getMinCheatingScore();

    @Query("SELECT COALESCE(AVG(e.score),0) FROM ExamAttempt e WHERE e.examId = :examId")
    Double getAverageScoreByExam(@Param("examId") Long examId);

    @Query("SELECT COALESCE(AVG(e.timeTakenSeconds),0) FROM ExamAttempt e WHERE e.examId = :examId")
    Double getAverageTimeByExam(@Param("examId") Long examId);

    List<ExamAttempt> findTop20ByOrderByStartTimeDesc();

    // =========================================================
    // LEADERBOARD
    // =========================================================

    @Query("""
        SELECT e FROM ExamAttempt e
        WHERE e.examId = :examId
        ORDER BY e.score DESC
    """)
    List<ExamAttempt> findLeaderboard(@Param("examId") Long examId);

    // =========================================================
    // PROCTORING / RISK
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
    // EXAM ANALYTICS
    // =========================================================

    List<ExamAttempt> findByExamIdAndStatus(Long examId, String status);

    List<ExamAttempt> findByExamIdOrderByCheatingScoreDesc(Long examId);

    @Query("""
        SELECT e FROM ExamAttempt e
        WHERE e.examId = :examId
        ORDER BY e.score DESC
    """)
    List<ExamAttempt> findTopPerformersByExam(@Param("examId") Long examId);

    @Query("""
        SELECT e FROM ExamAttempt e
        WHERE e.examId = :examId
        ORDER BY e.timeTakenSeconds ASC
    """)
    List<ExamAttempt> findFastestAttemptsByExam(@Param("examId") Long examId);

    // =========================================================
    // LIVE MONITORING
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
    // RESUME SUPPORT
    // =========================================================

    @Query("""
        SELECT e FROM ExamAttempt e
        WHERE e.studentId = :studentId
        AND e.status = 'STARTED'
        AND e.isCancelled = false
    """)
    Optional<ExamAttempt> findActiveAttempt(@Param("studentId") Long studentId);

    // =========================================================
    // ABANDONED ATTEMPTS
    // =========================================================

    @Query("""
        SELECT e FROM ExamAttempt e
        WHERE e.status = 'STARTED'
        AND e.lastHeartbeat < :time
        AND e.isCancelled = false
    """)
    List<ExamAttempt> findAbandonedAttempts(@Param("time") LocalDateTime time);

}