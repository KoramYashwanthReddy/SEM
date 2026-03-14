package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.StudentAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StudentAnswerRepository extends JpaRepository<StudentAnswer, Long> {

    List<StudentAnswer> findByAttemptId(Long attemptId);

    StudentAnswer findByAttemptIdAndQuestionId(Long attemptId, Long questionId);

}