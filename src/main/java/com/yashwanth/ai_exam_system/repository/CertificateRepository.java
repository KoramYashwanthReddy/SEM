package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.Certificate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CertificateRepository extends JpaRepository<Certificate, Long> {

    Optional<Certificate> findByStudentIdAndExamCode(Long studentId, String examCode);

    Optional<Certificate> findByCertificateId(String certificateId);

    List<Certificate> findByStudentId(Long studentId);
}