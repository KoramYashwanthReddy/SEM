package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.StudentAnswer;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentAnswerRepository
        extends JpaRepository<StudentAnswer, Long> {

    // ================= CORE =================

    List<StudentAnswer> findByAttemptId(Long attemptId);

    Optional<StudentAnswer> findByAttemptIdAndQuestionId(
            Long attemptId,
            Long questionId);

    // ================= NAVIGATION =================

    long countByAttemptId(Long attemptId);

    long countByAttemptIdAndStatus(
            Long attemptId,
            String status);

    long countByAttemptIdAndReviewMarkedTrue(Long attemptId);

    // 🔥 REQUIRED (fix your error)
    long countByAttemptIdAndStatusAndReviewMarkedTrue(
            Long attemptId,
            String status);

    // unanswered
    long countByAttemptIdAndStatus(
            Long attemptId,
            String status,
            boolean dummy); // overload protection (kept safe)

    // visited
    long countByAttemptIdAndVisitedTrue(Long attemptId);

    // answered
    long countByAttemptIdAndAnswerIsNotNull(Long attemptId);

    // ================= AI ANALYSIS =================

    // student analytics
    List<StudentAnswer> findByAttempt_StudentId(Long studentId);

    List<StudentAnswer> findByAttempt_StudentIdAndIsCorrect(
            Long studentId,
            Boolean isCorrect);

    // exam analytics
    List<StudentAnswer> findByAttempt_ExamId(Long examId);

    // student + exam analytics
    List<StudentAnswer> findByAttempt_ExamIdAndAttempt_StudentId(
            Long examId,
            Long studentId);

    // correctness analytics
    long countByAttempt_ExamIdAndIsCorrect(
            Long examId,
            Boolean isCorrect);

    // difficulty analytics
    List<StudentAnswer> findByAttempt_ExamIdAndDifficulty(
            Long examId,
            String difficulty);

    // topic analytics
    List<StudentAnswer> findByAttempt_ExamIdAndTopic(
            Long examId,
            String topic);

    // ================= ADMIN =================

    List<StudentAnswer> findByQuestionId(Long questionId);

    // suspicious patterns
    List<StudentAnswer> findByIsCorrectFalse();

    List<StudentAnswer> findByFlaggedForCheatingTrue();

    // ================= PERFORMANCE =================

    long countByAttempt_StudentId(Long studentId);

    long countByAttempt_StudentIdAndIsCorrect(
            Long studentId,
            Boolean isCorrect);

    long countByAttempt_StudentIdAndStatus(
            Long studentId,
            String status);

    long countByAttempt_StudentIdAndReviewMarkedTrue(Long studentId);

}