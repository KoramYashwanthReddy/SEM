package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.entity.Certificate;
import com.yashwanth.ai_exam_system.repository.CertificateRepository;
import com.yashwanth.ai_exam_system.service.CertificateService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

@RestController
@RequestMapping("/api/certificate")
public class CertificateController {

    private final CertificateService certificateService;
    private final CertificateRepository certificateRepository;

    public CertificateController(CertificateService certificateService,
                                 CertificateRepository certificateRepository) {
        this.certificateService = certificateService;
        this.certificateRepository = certificateRepository;
    }

    // ================= GENERATE =================

    @GetMapping("/generate")
    public ResponseEntity<byte[]> generateCertificate(
            @RequestParam Long studentId,
            @RequestParam String examCode,
            @RequestParam String examTitle,
            @RequestParam double score,
            HttpServletRequest request
    ) {

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
    public ResponseEntity<List<Certificate>> getStudentCertificates(
            @PathVariable Long studentId) {

        List<Certificate> certificates =
                certificateRepository.findByStudentIdAndRevokedFalse(studentId);

        return ResponseEntity.ok(certificates);
    }

    // ================= DOWNLOAD FROM DB =================

    @GetMapping("/download/{certificateId}")
    public ResponseEntity<byte[]> downloadCertificate(
            @PathVariable String certificateId) {

        Certificate cert = certificateRepository
                .findByCertificateId(certificateId)
                .orElseThrow(() -> new RuntimeException("Certificate not found"));

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
    public ResponseEntity<String> revokeCertificate(
            @PathVariable String certificateId) {

        Certificate cert = certificateRepository
                .findByCertificateId(certificateId)
                .orElseThrow(() -> new RuntimeException("Certificate not found"));

        cert.setRevoked(true);
        certificateRepository.save(cert);

        return ResponseEntity.ok("Certificate revoked successfully");
    }

    // ================= ADMIN ALL CERTIFICATES =================

    @GetMapping("/all")
    public ResponseEntity<List<Certificate>> getAllCertificates() {
        return ResponseEntity.ok(certificateRepository.findAll());
    }
}
