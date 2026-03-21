package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProctoringEventRepository extends JpaRepository<ProctoringEvent, Long> {

    // =========================================================
    // ✅ BASIC
    // =========================================================

    List<ProctoringEvent> findByAttemptId(Long attemptId);

    long countByAttemptId(Long attemptId);

    long countByAttemptIdAndEventType(Long attemptId, String eventType);

    // =========================================================
    // 🔥 SCORING
    // =========================================================

    @Query("SELECT COALESCE(SUM(p.score), 0) FROM ProctoringEvent p WHERE p.attemptId = :attemptId")
    Integer getTotalScore(Long attemptId);

    @Query("SELECT COALESCE(SUM(p.severity), 0) FROM ProctoringEvent p WHERE p.attemptId = :attemptId")
    Integer getTotalSeverity(Long attemptId);

    // =========================================================
    // 🚨 RISK ANALYSIS
    // =========================================================

    @Query("SELECT p FROM ProctoringEvent p WHERE p.attemptId = :attemptId AND p.score >= 30")
    List<ProctoringEvent> findHighScoreEvents(Long attemptId);

    @Query("SELECT p FROM ProctoringEvent p WHERE p.attemptId = :attemptId AND p.severity >= 7")
    List<ProctoringEvent> findHighSeverityEvents(Long attemptId);

    // =========================================================
    // 📊 RECENT / PATTERN DETECTION
    // =========================================================

    @Query("SELECT p FROM ProctoringEvent p WHERE p.attemptId = :attemptId ORDER BY p.timestamp DESC")
    List<ProctoringEvent> findRecentEvents(Long attemptId);

    @Query("SELECT p FROM ProctoringEvent p ORDER BY p.severity DESC")
    List<ProctoringEvent> findTopRiskEvents();
}