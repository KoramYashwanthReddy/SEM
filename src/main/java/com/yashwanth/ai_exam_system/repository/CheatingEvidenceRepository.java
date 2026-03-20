package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.CheatingEvidence;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface CheatingEvidenceRepository extends JpaRepository<CheatingEvidence, Long> {

    // ✅ Get evidence by exam
    List<CheatingEvidence> findByExamId(Long examId);

    // ✅ Get evidence by student
    List<CheatingEvidence> findByStudentId(Long studentId);

    // ✅ Get evidence by student + exam
    List<CheatingEvidence> findByStudentIdAndExamId(Long studentId, Long examId);

    // ✅ Get only cancelled cases
    List<CheatingEvidence> findByExamCancelledTrue();

    // ✅ Get evidence by AI reason (MULTIPLE_FACES, HIGH_NOISE, etc.)
    List<CheatingEvidence> findByAiReason(String aiReason);

    // ✅ Get recent evidence (for dashboard / live view)
    List<CheatingEvidence> findByTimestampAfter(LocalDateTime time);

    // ✅ Get evidence between time range (analytics)
    List<CheatingEvidence> findByTimestampBetween(LocalDateTime start, LocalDateTime end);

    // ✅ Count by exam (analytics)
    long countByExamId(Long examId);

    // ✅ Count cancelled cases
    long countByExamCancelledTrue();
}