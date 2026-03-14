package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.Exam;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExamRepository extends JpaRepository<Exam, Long> {

    Optional<Exam> findByExamCode(String examCode);

    List<Exam> findByCreatedBy(String createdBy);

}