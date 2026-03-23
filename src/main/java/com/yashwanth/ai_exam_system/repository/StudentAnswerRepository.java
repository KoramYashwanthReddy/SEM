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
            Long questionId
    );

    // ================= NAVIGATION =================

    long countByAttemptId(Long attemptId);

    long countByAttemptIdAndStatus(
            Long attemptId,
            String status
    );

    long countByAttemptIdAndReviewMarkedTrue(Long attemptId);

    long countByAttemptIdAndStatusAndReviewMarkedTrue(
            Long attemptId,
            String status
    );

    long countByAttemptIdAndVisitedTrue(Long attemptId);

    long countByAttemptIdAndAnswerIsNotNull(Long attemptId);

    // ================= AI ANALYSIS =================

    List<StudentAnswer> findByAttempt_StudentId(Long studentId);

    List<StudentAnswer> findByAttempt_StudentIdAndIsCorrect(
            Long studentId,
            Boolean isCorrect
    );

    List<StudentAnswer> findByAttempt_Exam_Id(Long examId);

    List<StudentAnswer> findByAttempt_Exam_IdAndAttempt_StudentId(
            Long examId,
            Long studentId
    );

    long countByAttempt_Exam_IdAndIsCorrect(
            Long examId,
            Boolean isCorrect
    );

    List<StudentAnswer> findByAttempt_Exam_IdAndDifficulty(
            Long examId,
            String difficulty
    );

    List<StudentAnswer> findByAttempt_Exam_IdAndTopic(
            Long examId,
            String topic
    );

    // ================= ADMIN =================

    List<StudentAnswer> findByQuestionId(Long questionId);

    List<StudentAnswer> findByIsCorrectFalse();

    List<StudentAnswer> findByFlaggedForCheatingTrue();

    // ================= PERFORMANCE =================

    long countByAttempt_StudentId(Long studentId);

    long countByAttempt_StudentIdAndIsCorrect(
            Long studentId,
            Boolean isCorrect
    );

    long countByAttempt_StudentIdAndStatus(
            Long studentId,
            String status
    );

    long countByAttempt_StudentIdAndReviewMarkedTrue(Long studentId);

}