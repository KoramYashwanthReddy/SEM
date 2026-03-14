package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.StudentAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentAnswerRepository extends JpaRepository<StudentAnswer, Long> {

    List<StudentAnswer> findByAttemptId(Long attemptId);

    Optional<StudentAnswer> findByAttemptIdAndQuestionId(Long attemptId, Long questionId);

    long countByAttemptId(Long attemptId);

    long countByAttemptIdAndStatus(Long attemptId, String status);

    long countByAttemptIdAndReviewMarkedTrue(Long attemptId);

}