package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {

    // ✅ Find all attempts by status (STARTED, SUBMITTED, INVALIDATED, etc.)
    List<ExamAttempt> findByStatus(String status);

    // ✅ Find attempts of a student
    List<ExamAttempt> findByStudentId(Long studentId);

    // ✅ Find attempts by examCode (existing)
    List<ExamAttempt> findByExamCode(String examCode);

    // ✅ Find attempts by examId (🔥 IMPORTANT)
    List<ExamAttempt> findByExamId(Long examId);

    // ✅ Find attempt by student + examCode
    Optional<ExamAttempt> findByStudentIdAndExamCode(Long studentId, String examCode);

    // ✅ 🔥 REQUIRED for cancelExam()
    Optional<ExamAttempt> findByExamIdAndStudentId(Long examId, Long studentId);

    // ✅ Auto-submit scheduler
    List<ExamAttempt> findByStatusAndExpiryTimeBefore(String status, LocalDateTime time);

    // ✅ Dashboard / analytics
    long countByStudentId(Long studentId);

    long countByStudentIdAndStatus(Long studentId, String status);

    // ✅ 🔥 Admin: get all suspicious/invalid attempts
    List<ExamAttempt> findByStatusIn(List<String> statuses);

    // ✅ 🔥 Get attempts within time range (analytics)
    List<ExamAttempt> findByStartTimeBetween(LocalDateTime start, LocalDateTime end);
}