package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.ExamResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExamResultRepository extends JpaRepository<ExamResult, Long> {

    Optional<ExamResult> findByAttemptId(Long attemptId);

}