package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.entity.Certificate;
import com.yashwanth.ai_exam_system.repository.CertificateRepository;
import com.yashwanth.ai_exam_system.service.CertificateService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

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

    // AUTO-FILL FROM PROFILE
    @GetMapping("/generate")
    public ResponseEntity<byte[]> generateCertificate(
            @RequestParam Long studentId,
            @RequestParam String examCode,
            @RequestParam String examTitle,
            @RequestParam double score
    ) {

        byte[] pdf = certificateService.generateCertificate(
                studentId, examCode, examTitle, score
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=certificate-" + studentId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // VERIFY CERTIFICATE (QR)
    @GetMapping("/verify/{certificateId}")
    public ResponseEntity<?> verify(@PathVariable String certificateId) {

        Certificate cert = certificateRepository
                .findByCertificateId(certificateId)
                .orElseThrow(() -> new RuntimeException("Invalid Certificate"));

        return ResponseEntity.ok(cert);
    }

    // GET ALL CERTIFICATES FOR STUDENT
    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<Certificate>> getStudentCertificates(
            @PathVariable Long studentId) {

        List<Certificate> certificates =
                certificateRepository.findByStudentId(studentId);

        return ResponseEntity.ok(certificates);
    }

    // DOWNLOAD BY CERTIFICATE ID (PRODUCTION API)
    @GetMapping("/download/{certificateId}")
    public ResponseEntity<byte[]> downloadCertificate(
            @PathVariable String certificateId) {

        Certificate cert = certificateRepository
                .findByCertificateId(certificateId)
                .orElseThrow(() -> new RuntimeException("Certificate not found"));

        byte[] pdf = certificateService.generateCertificate(
                cert.getStudentId(),
                cert.getExamCode(),
                cert.getExamTitle(),
                cert.getScore()
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=" + certificateId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}