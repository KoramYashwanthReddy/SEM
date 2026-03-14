package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {

    // Find all exam attempts with a specific status (STARTED, EVALUATED, etc.)
    List<ExamAttempt> findByStatus(String status);

    // Optional: find attempts of a specific student
    List<ExamAttempt> findByStudentId(Long studentId);

    // Optional: find attempts for an exam
    List<ExamAttempt> findByExamCode(String examCode);

    // Find attempts of a student for a specific exam
    Optional<ExamAttempt> findByStudentIdAndExamCode(Long studentId, String examCode);

    // Used by auto-submit scheduler
    List<ExamAttempt> findByStatusAndExpiryTimeBefore(String status, LocalDateTime time);

    // Used for analytics / dashboards
    long countByStudentId(Long studentId);

    // Count completed exams
    long countByStudentIdAndStatus(Long studentId, String status);

}