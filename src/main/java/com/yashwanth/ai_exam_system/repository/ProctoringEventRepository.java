package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProctoringEventRepository extends JpaRepository<ProctoringEvent, Long> {

    // ✅ All events for attempt
    List<ProctoringEvent> findByAttemptId(Long attemptId);

    // ✅ Count by type
    long countByAttemptIdAndEventType(Long attemptId, String eventType);

    // 🔥 Total events
    long countByAttemptId(Long attemptId);

    // 🔥 AI Score
    @Query("SELECT COALESCE(SUM(p.severity), 0) FROM ProctoringEvent p WHERE p.attemptId = :attemptId")
    Integer getTotalSeverityScore(Long attemptId);

    // 🔥 High-risk events
    @Query("SELECT p FROM ProctoringEvent p WHERE p.attemptId = :attemptId AND p.severity >= 7")
    List<ProctoringEvent> findHighRiskEvents(Long attemptId);

    // 🔥 Latest events (for pattern detection later)
    @Query("SELECT p FROM ProctoringEvent p WHERE p.attemptId = :attemptId ORDER BY p.timestamp DESC")
    List<ProctoringEvent> findRecentEvents(Long attemptId);
}