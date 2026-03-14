package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {

    // Find all exam attempts with a specific status (STARTED, EVALUATED, etc.)
    List<ExamAttempt> findByStatus(String status);

    // Optional: find attempts of a specific student
    List<ExamAttempt> findByStudentId(Long studentId);

    // Optional: find attempts for an exam
    List<ExamAttempt> findByExamCode(String examCode);

}