package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.entity.Certificate;
import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.repository.CertificateRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import com.yashwanth.ai_exam_system.service.CertificateService;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/certificate")
public class CertificateController {

    private final CertificateService certificateService;
    private final CertificateRepository certificateRepository;
    private final ExamRepository examRepository;
    private final UserRepository userRepository;

    public CertificateController(CertificateService certificateService,
                                 CertificateRepository certificateRepository,
                                 ExamRepository examRepository,
                                 UserRepository userRepository) {
        this.certificateService = certificateService;
        this.certificateRepository = certificateRepository;
        this.examRepository = examRepository;
        this.userRepository = userRepository;
    }

    // ================= GENERATE =================

    @GetMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<byte[]> generateCertificate(
            @RequestParam Long studentId,
            @RequestParam String examCode,
            @RequestParam String examTitle,
            @RequestParam double score,
            HttpServletRequest request,
            Authentication auth
    ) {
        User currentUser = getCurrentUser(auth);
        if (currentUser.getRole() == Role.TEACHER) {
            Set<String> teacherExamCodes = getTeacherExamCodes(currentUser);
            String normalizedExamCode = examCode == null ? "" : examCode.trim();
            if (normalizedExamCode.isBlank() || !teacherExamCodes.contains(normalizedExamCode)) {
                throw new ForbiddenException("Teachers can only generate certificates for their own exams");
            }
        }

        String baseUrl = ServletUriComponentsBuilder
                .fromRequestUri(request)
                .replacePath(null)
                .build()
                .toUriString();

        byte[] pdf = certificateService.generateCertificate(
                studentId, examCode, examTitle, score, baseUrl
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=certificate-" + examCode + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // ================= VERIFY =================

    @GetMapping("/verify/{certificateId}")
    public ResponseEntity<?> verify(@PathVariable String certificateId) {

        Certificate cert = certificateRepository
                .findByCertificateId(certificateId)
                .orElseThrow(() -> new RuntimeException("Invalid Certificate"));

        if (cert.isRevoked()) {
            return ResponseEntity.status(HttpStatus.GONE)
                    .body("Certificate has been revoked");
        }

        return ResponseEntity.ok(cert);
    }

    // ================= STUDENT CERTIFICATES =================

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER','STUDENT')")
    public ResponseEntity<List<Certificate>> getStudentCertificates(
            @PathVariable Long studentId,
            Authentication auth) {

        User currentUser = getCurrentUser(auth);
        if (currentUser.getRole() == Role.STUDENT && !studentId.equals(currentUser.getId())) {
            throw new ForbiddenException("Students can only view their own certificates");
        }

        List<Certificate> certificates =
                certificateRepository.findByStudentIdAndRevokedFalse(studentId);
        if (currentUser.getRole() == Role.TEACHER) {
            Set<String> teacherExamCodes = getTeacherExamCodes(currentUser);
            certificates = certificates.stream()
                    .filter(cert -> {
                        String code = cert.getExamCode() == null ? "" : cert.getExamCode().trim();
                        return !code.isBlank() && teacherExamCodes.contains(code);
                    })
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(certificates);
    }

    // ================= DOWNLOAD FROM DB =================

    @GetMapping("/download/{certificateId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER','STUDENT')")
    public ResponseEntity<byte[]> downloadCertificate(
            @PathVariable String certificateId,
            Authentication auth) {

        Certificate cert = certificateRepository
                .findByCertificateId(certificateId)
                .orElseThrow(() -> new RuntimeException("Certificate not found"));

        User currentUser = getCurrentUser(auth);
        if (currentUser.getRole() == Role.STUDENT && !cert.getStudentId().equals(currentUser.getId())) {
            throw new ForbiddenException("Students can only download their own certificates");
        }
        if (currentUser.getRole() == Role.TEACHER && !canTeacherAccessCertificate(currentUser, cert)) {
            throw new ForbiddenException("Teachers can only download certificates for their own exams");
        }

        if (cert.isRevoked()) {
            throw new RuntimeException("Certificate revoked");
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=" + certificateId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(cert.getPdfData());
    }

    // ================= ADMIN REVOKE =================

    @PostMapping("/revoke/{certificateId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<String> revokeCertificate(
            @PathVariable String certificateId,
            Authentication auth) {

        Certificate cert = certificateRepository
                .findByCertificateId(certificateId)
                .orElseThrow(() -> new RuntimeException("Certificate not found"));
        User currentUser = getCurrentUser(auth);

        if (currentUser.getRole() == Role.TEACHER && !canTeacherAccessCertificate(currentUser, cert)) {
            throw new ForbiddenException("Teachers can only revoke certificates for their own exams");
        }

        cert.setRevoked(true);
        certificateRepository.save(cert);

        return ResponseEntity.ok("Certificate revoked successfully");
    }

    // ================= ADMIN ALL CERTIFICATES =================

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public ResponseEntity<List<Certificate>> getAllCertificates(Authentication auth) {
        User currentUser = getCurrentUser(auth);
        List<Certificate> all = certificateRepository.findAll().stream()
                .sorted(Comparator.comparing(Certificate::getIssuedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .collect(Collectors.toList());

        if (currentUser.getRole() == Role.ADMIN) {
            return ResponseEntity.ok(all);
        }

        Set<String> teacherExamCodes = getTeacherExamCodes(currentUser);
        List<Certificate> ownExamCertificates = all.stream()
                .filter(c -> {
                    String code = c.getExamCode() == null ? "" : c.getExamCode().trim();
                    return !code.isBlank() && teacherExamCodes.contains(code);
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(ownExamCertificates);
    }

    private User getCurrentUser(Authentication auth) {
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            throw new ForbiddenException("Authentication required");
        }
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }

    private boolean canTeacherAccessCertificate(User teacher, Certificate cert) {
        if (teacher == null || cert == null) return false;
        Set<String> teacherExamCodes = getTeacherExamCodes(teacher);
        String certExamCode = cert.getExamCode() == null ? "" : cert.getExamCode().trim();
        return !certExamCode.isBlank() && teacherExamCodes.contains(certExamCode);
    }

    private Set<String> getTeacherExamCodes(User teacher) {
        List<String> teacherKeys = List.of(
                normalizeForMatch(teacher.getEmail()),
                normalizeForMatch(teacher.getName()),
                normalizeForMatch(teacher.getEmployeeId()),
                normalizeForMatch(teacher.getDepartment()),
                normalizeForMatch(teacher.getDesignation())
        ).stream().filter(s -> !s.isBlank()).distinct().collect(Collectors.toList());

        return examRepository.findAll().stream()
                .filter(exam -> matchesTeacher(exam.getCreatedBy(), teacherKeys))
                .map(exam -> exam.getExamCode() == null ? "" : exam.getExamCode().trim())
                .filter(code -> !code.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private boolean matchesTeacher(String createdBy, List<String> teacherKeys) {
        String normalized = normalizeForMatch(createdBy);
        if (normalized.isBlank()) return false;
        return teacherKeys.stream().anyMatch(key -> normalized.contains(key) || key.contains(normalized));
    }

    private String normalizeForMatch(String value) {
        if (value == null) return "";
        return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
    }
}
