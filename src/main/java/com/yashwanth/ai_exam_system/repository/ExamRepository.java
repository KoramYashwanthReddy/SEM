package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.Exam;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ExamRepository extends JpaRepository<Exam, Long> {

    // ================= CORE =================

    Optional<Exam> findByExamCode(String examCode);

    List<Exam> findByCreatedBy(String createdBy);

    // ================= STATUS =================

    List<Exam> findByStatus(String status);

    List<Exam> findByActiveTrue();

    List<Exam> findByActiveFalse();

    // ================= TIME =================

    List<Exam> findByStartTimeBeforeAndEndTimeAfter(
            LocalDateTime now1,
            LocalDateTime now2);

    List<Exam> findByEndTimeBefore(LocalDateTime now);

    List<Exam> findByStartTimeAfter(LocalDateTime now);

    // ================= SUBJECT =================

    List<Exam> findBySubject(String subject);

    List<Exam> findBySubjectAndActiveTrue(String subject);

    // ================= TEACHER =================

    List<Exam> findByCreatedByAndActiveTrue(String createdBy);
    List<Exam> findByCreatedByAndActiveTrueOrderByCreatedAtDesc(String createdBy);

    List<Exam> findByCreatedByAndStatus(String createdBy, String status);

    // ================= DIFFICULTY DISTRIBUTION =================

    @Query("""
        SELECT e FROM Exam e
        WHERE e.easyQuestionCount > 0
        OR e.mediumQuestionCount > 0
        OR e.difficultQuestionCount > 0
    """)
    List<Exam> findExamsWithDifficultyDistribution();

    // ================= ANALYTICS =================

    long countByCreatedBy(String createdBy);

    long countByStatus(String status);

    long countByActiveTrue();

    // ================= DASHBOARD =================

    List<Exam> findTop10ByOrderByCreatedAtDesc();

    List<Exam> findTop10ByStatusOrderByCreatedAtDesc(String status);

    // ================= ADMIN =================

    @Query("SELECT e FROM Exam e WHERE e.active = true ORDER BY e.createdAt DESC")
    List<Exam> findAllActiveOrderByCreatedAtDesc();

}
