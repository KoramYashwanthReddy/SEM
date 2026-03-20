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

    @GetMapping("/generate")
    public ResponseEntity<byte[]> generateCertificate(
            @RequestParam Long studentId,
            @RequestParam String studentName,
            @RequestParam String examCode,
            @RequestParam String examTitle,
            @RequestParam double score
    ) {

        byte[] pdf = certificateService.generateCertificate(
                studentId, studentName, examCode, examTitle, score
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=certificate.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping("/verify/{certificateId}")
    public Certificate verify(@PathVariable String certificateId) {
        return certificateRepository.findByCertificateId(certificateId)
                .orElseThrow(() -> new RuntimeException("Invalid Certificate"));
    }

    @GetMapping("/student/{studentId}")
    public List<Certificate> getStudentCertificates(@PathVariable Long studentId) {
        return certificateRepository.findByStudentId(studentId);
    }
}