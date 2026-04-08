package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.ExamRegistration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExamRegistrationRepository extends JpaRepository<ExamRegistration, Long> {

    Optional<ExamRegistration> findByStudentIdAndExamCode(Long studentId, String examCode);

    List<ExamRegistration> findByStudentIdAndActiveTrue(Long studentId);
}
