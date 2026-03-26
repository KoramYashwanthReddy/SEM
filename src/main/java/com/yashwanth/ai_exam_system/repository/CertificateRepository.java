package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.Certificate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CertificateRepository extends JpaRepository<Certificate, Long> {

    // ================= CORE =================

    Optional<Certificate> findByStudentIdAndExamCode(Long studentId, String examCode);

    Optional<Certificate> findByCertificateId(String certificateId);

    List<Certificate> findByStudentId(Long studentId);

    // ================= PERFORMANCE =================

    boolean existsByStudentIdAndExamCode(Long studentId, String examCode);

    boolean existsByCertificateId(String certificateId);

    // ================= REVOKE SUPPORT =================

    List<Certificate> findByRevokedFalse();

    List<Certificate> findByStudentIdAndRevokedFalse(Long studentId);

    Optional<Certificate> findByCertificateIdAndRevokedFalse(String certificateId);

    // ================= ADMIN DASHBOARD =================

    long countByRevokedFalse();

    long countByRevokedTrue();

    long countByStudentId(Long studentId);

    // ================= ANALYTICS =================

    List<Certificate> findByExamCode(String examCode);

    List<Certificate> findByExamCodeAndRevokedFalse(String examCode);
}