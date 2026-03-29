package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.enums.AttemptStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {

    // ================= BASIC =================

    List<ExamAttempt> findByStatus(AttemptStatus status);

    List<ExamAttempt> findByStudentId(Long studentId);

    List<ExamAttempt> findByExamCode(String examCode);

    // 🔥 FIX ADDED
    List<ExamAttempt> findByExamCodeIn(List<String> examCodes);

    List<ExamAttempt> findByExamId(Long examId);

    Optional<ExamAttempt> findByStudentIdAndExamCode(Long studentId, String examCode);

    Optional<ExamAttempt> findByExamIdAndStudentId(Long examId, Long studentId);

    // ================= ACTIVE ATTEMPT =================

    @Query("""
        SELECT e FROM ExamAttempt e
        WHERE e.studentId = :studentId
        AND e.examCode = :examCode
        AND e.status = :status
        AND e.cancelled = false
        AND e.active = true
    """)
    Optional<ExamAttempt> findActiveAttempt(
            @Param("studentId") Long studentId,
            @Param("examCode") String examCode,
            @Param("status") AttemptStatus status
    );

    // ================= RESUME =================

    @Query("""
        SELECT e FROM ExamAttempt e
        WHERE e.studentId = :studentId
        AND e.status = :status
        AND e.cancelled = false
        AND e.active = true
    """)
    Optional<ExamAttempt> findResumeAttempt(
            @Param("studentId") Long studentId,
            @Param("status") AttemptStatus status
    );

    // ================= LIVE =================

    @Query("""
        SELECT e FROM ExamAttempt e
        WHERE e.status = :status
        AND e.expiryTime > CURRENT_TIMESTAMP
        AND e.cancelled = false
        AND e.active = true
    """)
    List<ExamAttempt> findLiveAttempts(@Param("status") AttemptStatus status);

    // ================= EXPIRED =================

    @Query("""
        SELECT e FROM ExamAttempt e
        WHERE e.status = :status
        AND e.expiryTime <= :time
        AND e.cancelled = false
        AND e.active = true
    """)
    List<ExamAttempt> findExpiredAttempts(
            @Param("status") AttemptStatus status,
            @Param("time") LocalDateTime time
    );

    // ================= COUNTS =================

    long countByStudentId(Long studentId);

    long countByStatus(AttemptStatus status);

    long countByCancelledTrue();

    long countByExamId(Long examId);

    long countByCheatingScoreGreaterThan(int score);

    // ================= ANALYTICS =================

    @Query("SELECT COALESCE(AVG(e.cheatingScore),0) FROM ExamAttempt e")
    Double getAverageCheatingScore();

    @Query("SELECT COALESCE(AVG(e.score),0) FROM ExamAttempt e WHERE e.score IS NOT NULL")
    Double getAverageScore();

    @Query("""
        SELECT COALESCE(AVG(e.timeTakenSeconds),0)
        FROM ExamAttempt e
        WHERE e.examId = :examId
        AND e.timeTakenSeconds IS NOT NULL
    """)
    Double getAverageTimeByExam(@Param("examId") Long examId);

    // ================= LEADERBOARD =================

    @Query("""
        SELECT e FROM ExamAttempt e
        WHERE e.examId = :examId
        AND e.status = :status
        AND e.cancelled = false
        ORDER BY e.score DESC
    """)
    List<ExamAttempt> findLeaderboard(
            @Param("examId") Long examId,
            @Param("status") AttemptStatus status
    );

    // ================= RISK =================

    List<ExamAttempt> findByCheatingScoreGreaterThan(int score);

    List<ExamAttempt> findTop10ByOrderByCheatingScoreDesc();

    @Query("""
        SELECT e FROM ExamAttempt e
        WHERE e.cheatingScore >= 80
        AND e.cancelled = false
    """)
    List<ExamAttempt> findHighRiskAttempts();

    // ================= LIVE MONITOR =================

    @Query("""
        SELECT e FROM ExamAttempt e
        WHERE e.status = :status
        AND e.cancelled = false
        AND e.active = true
        ORDER BY e.startTime DESC
    """)
    List<ExamAttempt> findRecentLiveAttempts(
            @Param("status") AttemptStatus status
    );

    // ================= ABANDONED =================

    @Query("""
        SELECT e FROM ExamAttempt e
        WHERE e.status = :status
        AND e.cancelled = false
        AND e.active = true
        AND e.lastAiCheckTime < :time
    """)
    List<ExamAttempt> findAbandonedAttempts(
            @Param("status") AttemptStatus status,
            @Param("time") LocalDateTime time
    );

}