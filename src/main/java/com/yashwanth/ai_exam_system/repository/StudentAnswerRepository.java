package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.StudentAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentAnswerRepository extends JpaRepository<StudentAnswer, Long> {

    // ================= CORE =================

    List<StudentAnswer> findByAttemptId(Long attemptId);

    Optional<StudentAnswer> findByAttemptIdAndQuestionId(Long attemptId, Long questionId);

    // ================= NAVIGATION =================

    long countByAttemptId(Long attemptId);

    long countByAttemptIdAndStatus(Long attemptId, String status);

    long countByAttemptIdAndReviewMarkedTrue(Long attemptId);

    // ================= AI ANALYSIS =================

    // 🔥 get answers using studentId from attempt
    List<StudentAnswer> findByAttempt_StudentId(Long studentId);

    List<StudentAnswer> findByAttempt_StudentIdAndIsCorrect(Long studentId, Boolean isCorrect);

    // ================= ADMIN =================

    List<StudentAnswer> findByQuestionId(Long questionId);
}