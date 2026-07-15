package com.yashwanth.ai_exam_system.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.*;
import com.yashwanth.ai_exam_system.entity.Certificate;
import com.yashwanth.ai_exam_system.entity.ExamResult;
import com.yashwanth.ai_exam_system.entity.StudentProfile;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.repository.CertificateRepository;
import com.yashwanth.ai_exam_system.repository.ExamResultRepository;
import com.yashwanth.ai_exam_system.repository.StudentProfileRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class CertificateService {

    private static final int CERTIFICATE_TEMPLATE_VERSION = 4;

    private static final java.awt.Color NAVY = new java.awt.Color(10, 28, 58);
    private static final java.awt.Color GOLD = new java.awt.Color(209, 160, 58);
    private static final java.awt.Color GOLD_LIGHT = new java.awt.Color(239, 212, 149);
    private static final java.awt.Color INK = new java.awt.Color(16, 28, 52);
    private static final java.awt.Color PAPER = new java.awt.Color(250, 248, 242);
    private static final java.awt.Color PAPER_ALT = new java.awt.Color(245, 243, 237);
    private static final java.awt.Color SOFT_BLUE = new java.awt.Color(220, 230, 246);

    private final CertificateRepository certificateRepository;
    private final ExamResultRepository examResultRepository;
    private final QrCodeService qrCodeService;
    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final StudentNotificationService studentNotificationService;
    private final String fallbackBaseUrl;

    public CertificateService(
            CertificateRepository certificateRepository,
            ExamResultRepository examResultRepository,
            QrCodeService qrCodeService,
            StudentProfileRepository studentProfileRepository,
            UserRepository userRepository,
            EmailService emailService,
            StudentNotificationService studentNotificationService,
            @Value("${app.frontend.base-url:http://localhost:8080}") String fallbackBaseUrl) {

        this.certificateRepository = certificateRepository;
        this.examResultRepository = examResultRepository;
        this.qrCodeService = qrCodeService;
        this.studentProfileRepository = studentProfileRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.studentNotificationService = studentNotificationService;
        this.fallbackBaseUrl = fallbackBaseUrl;
    }

    @Transactional
    public byte[] generateCertificate(
            Long studentId,
            String examCode,
            String examTitle,
            double score,
            String baseUrl
    ) {
        return generateCertificate(studentId, examCode, examTitle, score, baseUrl, false);
    }

    @Transactional
    public byte[] generateCertificate(
            Long studentId,
            String examCode,
            String examTitle,
            double score,
            String baseUrl,
            boolean forceReissue
    ) {
        return generateCertificateInternal(studentId, examCode, examTitle, score, baseUrl, forceReissue, true);
    }

    private byte[] generateCertificateInternal(
            Long studentId,
            String examCode,
            String examTitle,
            double score,
            String baseUrl,
            boolean forceReissue,
            boolean failOnPdfError
    ) {
        StudentProfile profile = resolveCertificateProfile(studentId);
        double resolvedScore = resolveBestCertificateScore(studentId, examCode, score);

        Certificate existing = certificateRepository
                .findByStudentIdAndExamCode(studentId, examCode)
                .orElse(null);

        if (existing != null) {
            if (existing.isRevoked()) {
                throw new RuntimeException("Certificate is revoked");
            }
            boolean scoreMatches = Math.abs(existing.getScore() - resolvedScore) < 0.0001d;
            boolean templateMatches = Integer.valueOf(CERTIFICATE_TEMPLATE_VERSION).equals(existing.getTemplateVersion());
            if (!forceReissue && existing.getPdfData() != null && templateMatches && scoreMatches) {
                return existing.getPdfData();
            }
        }

        Certificate cert = existing != null ? existing : new Certificate();
        boolean freshIssue = forceReissue
                || existing == null
                || existing.getPdfData() == null
                || !Integer.valueOf(CERTIFICATE_TEMPLATE_VERSION).equals(existing.getTemplateVersion())
                || Math.abs(existing.getScore() - resolvedScore) >= 0.0001d;
        if (freshIssue) {
            cert.setIssuedAt(LocalDateTime.now());
        }
        populateCertificate(cert, profile, examCode, examTitle, resolvedScore, baseUrl);
        cert = certificateRepository.saveAndFlush(cert);

        byte[] pdf = null;
        try {
            pdf = generateAndStoreCertificatePdf(cert, false);
        } catch (RuntimeException pdfError) {
            if (failOnPdfError) {
                throw pdfError;
            }
            System.err.println("Certificate PDF generation deferred for certificateId="
                    + cert.getCertificateId() + ": " + pdfError.getMessage());
        }

        if (freshIssue) {
            if (pdf != null) {
                sendEmailSafe(profile, cert.getCertificateId(), pdf);
            }
            notifyCertificateIssued(profile.getUserId(), examCode, examTitle, cert.getCertificateId(), resolvedScore);
        }
        return pdf;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean ensureCertificateIssued(
            Long studentId,
            String examCode,
            String examTitle,
            double score,
            String baseUrl
    ) {
        if (studentId == null || examCode == null || examCode.isBlank()) {
            return false;
        }

        generateCertificateInternal(studentId, examCode, examTitle, score, baseUrl, false, false);
        return true;
    }

    // ================= VALIDATION =================

    private StudentProfile resolveCertificateProfile(Long studentId) {
        StudentProfile profile = studentProfileRepository.findByUserId(studentId).orElse(null);
        User user = userRepository.findById(studentId).orElse(null);

        if (profile == null && user == null) {
            throw new RuntimeException("Student profile not found");
        }

        StudentProfile snapshot = profile != null ? profile : new StudentProfile();
        snapshot.setUserId(studentId);

        if (!StringUtils.hasText(snapshot.getFullName())) {
            snapshot.setFullName(user != null && StringUtils.hasText(user.getName()) ? user.getName() : "Student");
        }
        if (!StringUtils.hasText(snapshot.getEmail())) {
            snapshot.setEmail(user != null ? user.getEmail() : null);
        }
        if (!StringUtils.hasText(snapshot.getCollegeName())) {
            snapshot.setCollegeName("Unknown College");
        }
        if (!StringUtils.hasText(snapshot.getDepartment())) {
            snapshot.setDepartment(user != null && StringUtils.hasText(user.getDepartment())
                    ? user.getDepartment()
                    : "Unknown Department");
        }
        if (!StringUtils.hasText(snapshot.getRollNumber())) {
            snapshot.setRollNumber("N/A");
        }
        if (!snapshot.isActive()) {
            snapshot.setActive(true);
        }
        snapshot.setProfileCompleted(true);

        return snapshot;
    }

    // ================= BUILDERS =================

    private Certificate populateCertificate(
            Certificate cert,
            StudentProfile profile,
            String examCode,
            String examTitle,
            double score,
            String baseUrl
    ) {

        if (cert.getCertificateId() == null || cert.getCertificateId().isBlank()) {
            cert.setCertificateId(generateCertificateId());
        }

        cert.setStudentId(profile.getUserId());
        cert.setStudentName(profile.getFullName());
        cert.setCollegeName(profile.getCollegeName());
        cert.setDepartment(profile.getDepartment());
        cert.setRollNumber(profile.getRollNumber());
        cert.setSection(profile.getSection());
        cert.setProfilePhoto(normalizeCertificateProfilePhoto(profile.getProfilePhoto()));

        cert.setExamCode(examCode);
        cert.setExamTitle(examTitle);
        cert.setScore(score);
        cert.setGrade(calculateGrade(score));

        cert.setTemplateVersion(CERTIFICATE_TEMPLATE_VERSION);
        cert.setQrCodeData(buildVerifyUrl(cert.getCertificateId(), baseUrl));
        if (cert.getIssuedAt() == null) {
            cert.setIssuedAt(LocalDateTime.now());
        }

        return cert;
    }

    private String normalizeCertificateProfilePhoto(String profilePhoto) {
        if (!StringUtils.hasText(profilePhoto)) {
            return null;
        }
        String value = profilePhoto.trim();
        if (value.length() > 1900) {
            return null;
        }
        return value;
    }

    public byte[] refreshCertificatePdf(Certificate cert, String baseUrl) {
        try {
            if (cert == null) {
                throw new RuntimeException("Certificate not found");
            }
            double bestScore = resolveBestCertificateScore(
                    cert.getStudentId(),
                    cert.getExamCode(),
                    cert.getScore()
            );
            boolean scoreChanged = Math.abs(cert.getScore() - bestScore) >= 0.0001d;

            Certificate synced = syncCertificateScore(cert, baseUrl, bestScore);
            if (!scoreChanged
                    && StringUtils.hasText(baseUrl)
                    && synced.getQrCodeData() != null
                    && synced.getPdfData() != null
                    && Integer.valueOf(CERTIFICATE_TEMPLATE_VERSION).equals(synced.getTemplateVersion())) {
                return synced.getPdfData();
            }

            byte[] pdf = generateAndStoreCertificatePdf(synced, true, baseUrl);
            return pdf;
        } catch (Exception ex) {
            throw new RuntimeException("Certificate PDF refresh failed", ex);
        }
    }

    public Certificate refreshCertificateMetadata(Certificate cert, String baseUrl) {
        if (cert == null) {
            throw new RuntimeException("Certificate not found");
        }
        double bestScore = resolveBestCertificateScore(
                cert.getStudentId(),
                cert.getExamCode(),
                cert.getScore()
        );
        return syncCertificateScore(cert, baseUrl, bestScore);
    }

    // ================= EMAIL =================

    private void sendEmailSafe(StudentProfile profile, String certificateId, byte[] pdf) {
        try {
            emailService.sendCertificateEmail(
                    profile.getEmail(),
                    profile.getFullName(),
                    certificateId,
                    pdf
            );
        } catch (Exception e) {
            System.err.println("Email failed: " + e.getMessage());
        }
    }

    private void notifyCertificateIssued(Long studentId,
                                         String examCode,
                                         String examTitle,
                                         String certificateId,
                                         double score) {
        try {
            studentNotificationService.createNotification(
                    studentId,
                    "CERTIFICATE",
                    "Certificate issued",
                    "Your certificate for " + examTitle + " is ready for download.",
                    "Certificate Service",
                    "success",
                    buildCertificateNotificationUrl(certificateId, examCode, score)
            );
        } catch (Exception ignored) {
            // Certificate notifications should never block issuance.
        }
    }

    private String buildCertificateNotificationUrl(String certificateId, String examCode, double score) {
        return buildAbsoluteUrl(
                "/pages/student-ui.html?section=certificates&certificateId=" + certificateId
                        + "&examCode=" + examCode
                        + "&score=" + Math.round(score)
        );
    }

    // ================= HELPERS =================

    private String generateCertificateId() {
        return "CERT-" + UUID.randomUUID().toString()
                .substring(0, 8)
                .toUpperCase();
    }

    private String buildVerifyUrl(String certificateId, String baseUrl) {
        String resolvedBaseUrl = StringUtils.hasText(baseUrl)
                ? baseUrl.replaceAll("/+$", "")
                : (StringUtils.hasText(fallbackBaseUrl) ? fallbackBaseUrl.replaceAll("/+$", "") : "");

        if (!StringUtils.hasText(resolvedBaseUrl)) {
            return "/api/certificate/verify/" + certificateId;
        }

        return resolvedBaseUrl + "/api/certificate/verify/" + certificateId;
    }

    private String buildAbsoluteUrl(String path) {
        String resolvedBaseUrl = StringUtils.hasText(fallbackBaseUrl)
                ? fallbackBaseUrl.replaceAll("/+$", "")
                : "";
        if (!StringUtils.hasText(resolvedBaseUrl)) {
            return path;
        }
        if (!StringUtils.hasText(path)) {
            return resolvedBaseUrl;
        }
        return path.startsWith("/") ? resolvedBaseUrl + path : resolvedBaseUrl + "/" + path;
    }

    private String calculateGrade(double score) {
        if (score >= 90) return "A+";
        if (score >= 80) return "A";
        if (score >= 70) return "B+";
        if (score >= 60) return "B";
        if (score >= 50) return "C";
        if (score >= 40) return "D";
        return "Fail";
    }

    private double resolveBestCertificateScore(Long studentId, String examCode, double fallbackScore) {
        List<ExamResult> results = examResultRepository.findByStudentIdAndExamCode(studentId, examCode);
        double bestScore = fallbackScore;

        for (ExamResult result : results) {
            if (result == null) {
                continue;
            }
            double candidateScore = resolveAttemptScore(result);
            if (candidateScore > bestScore) {
                bestScore = candidateScore;
            }
        }

        return bestScore;
    }

    private Certificate syncCertificateScore(Certificate cert, String baseUrl) {
        double bestScore = resolveBestCertificateScore(
                cert.getStudentId(),
                cert.getExamCode(),
                cert.getScore()
        );
        return syncCertificateScore(cert, baseUrl, bestScore);
    }

    private Certificate syncCertificateScore(Certificate cert, String baseUrl, double bestScore) {
        if (cert == null) {
            throw new RuntimeException("Certificate not found");
        }
        if (cert.isRevoked()) {
            throw new RuntimeException("Certificate is revoked");
        }
        if (cert.getCertificateId() == null || cert.getCertificateId().isBlank()) {
            throw new RuntimeException("Certificate ID missing");
        }

        boolean scoreChanged = Math.abs(cert.getScore() - bestScore) >= 0.0001d;
        boolean metadataChanged = false;

        if (scoreChanged) {
            cert.setScore(bestScore);
            cert.setGrade(calculateGrade(bestScore));
            metadataChanged = true;
        }

        if (baseUrl != null || !StringUtils.hasText(cert.getQrCodeData())) {
            cert.setQrCodeData(buildVerifyUrl(cert.getCertificateId(), baseUrl));
            metadataChanged = true;
        }

        if (metadataChanged) {
            certificateRepository.save(cert);
        }

        return cert;
    }

    private double resolveAttemptScore(ExamResult result) {
        double percentage = result.getPercentage();
        if (percentage > 0d) {
            return percentage;
        }
        double rawScore = result.getScore();
        return rawScore > 0d ? rawScore : 0d;
    }

    // ================= PDF =================

    private byte[] generateAndStoreCertificatePdf(Certificate cert, boolean persistOnly) {
        return generateAndStoreCertificatePdf(cert, persistOnly, null);
    }

    private byte[] generateAndStoreCertificatePdf(Certificate cert, boolean persistOnly, String baseUrl) {
        try {
            String resolvedBaseUrl = StringUtils.hasText(baseUrl) ? baseUrl : fallbackBaseUrl;
            if (!StringUtils.hasText(cert.getQrCodeData()) || baseUrl != null) {
                cert.setQrCodeData(buildVerifyUrl(cert.getCertificateId(), resolvedBaseUrl));
            }
            byte[] qrImage = qrCodeService.generateQRCode(cert.getQrCodeData());
            byte[] pdf = generatePremiumPdf(cert, qrImage);
            cert.setPdfData(pdf);
            cert.setTemplateVersion(CERTIFICATE_TEMPLATE_VERSION);
            certificateRepository.save(cert);
            return pdf;
        } catch (Exception e) {
            throw new RuntimeException("Certificate PDF generation failed", e);
        }
    }

    private byte[] generatePremiumPdf(Certificate cert, byte[] qrImage) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            // Landscape A4: ~841.89 x 595.28 points
            Document document = new Document(PageSize.A4.rotate(), 0, 0, 0, 0);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            document.open();

            PdfContentByte cb = writer.getDirectContent();
            float W = document.getPageSize().getWidth();
            float H = document.getPageSize().getHeight();

            // â”€â”€ Color Palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            java.awt.Color bgColor     = new java.awt.Color(248, 250, 252);
            java.awt.Color borderColor = new java.awt.Color(226, 232, 240);
            java.awt.Color royalBlue   = new java.awt.Color(59,  48,  219);
            java.awt.Color darkInk     = new java.awt.Color(15,  23,  42);
            java.awt.Color slateGray   = new java.awt.Color(100, 116, 139);
            java.awt.Color navyDeep    = new java.awt.Color(28,  15,  112);
            java.awt.Color navyMid     = new java.awt.Color(92,  44,  213);
            java.awt.Color dotColor    = new java.awt.Color(203, 213, 225);
            java.awt.Color orange      = new java.awt.Color(249, 115, 22);
            java.awt.Color waveColor   = new java.awt.Color(59,  48,  219, 14);

            // â”€â”€ 1. Background fill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            cb.saveState();
            cb.setColorFill(bgColor);
            cb.rectangle(0, 0, W, H);
            cb.fill();
            cb.restoreState();

            // â”€â”€ 2. Outer border â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            cb.saveState();
            cb.setColorStroke(borderColor);
            cb.setLineWidth(1.2f);
            cb.rectangle(18, 18, W - 36, H - 36);
            cb.stroke();
            cb.restoreState();

            // â”€â”€ 3. Corner L-brackets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            float bi = 28f;  // bracket inset from page edge
            float bs = 44f;  // bracket arm length
            float bt = 3.0f; // bracket thickness
            drawCornerBracket(cb, bi,     H - bi, bs, 10f, bt, royalBlue, "TL");
            drawCornerBracket(cb, W - bi, H - bi, bs, 10f, bt, royalBlue, "TR");
            drawCornerBracket(cb, bi,     bi,      bs, 10f, bt, royalBlue, "BL");
            drawCornerBracket(cb, W - bi, bi,      bs, 10f, bt, royalBlue, "BR");

            // â”€â”€ 4. Dot grids (6Ã—4 on each side) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            float dotSpacing = 9f;
            float dotGridY   = H * 0.38f;
            cb.saveState();
            cb.setColorFill(dotColor);
            for (int r = 0; r < 4; r++) {
                for (int c = 0; c < 6; c++) {
                    // Left grid
                    cb.circle(bi + 8 + c * dotSpacing, dotGridY + r * dotSpacing, 1.4f);
                    cb.fill();
                    // Right grid
                    cb.circle(W - bi - 8 - c * dotSpacing, dotGridY + r * dotSpacing, 1.4f);
                    cb.fill();
                }
            }
            cb.restoreState();

            // â”€â”€ 5. Decorative wave lines (right side) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            cb.saveState();
            cb.setColorStroke(waveColor);
            cb.setLineWidth(1.5f);
            for (int i = 0; i < 8; i++) {
                float ox = W * 0.55f + i * 22f;
                cb.moveTo(ox, H - 20);
                cb.curveTo(ox + 45, H * 0.62f, ox - 35, H * 0.38f, ox + 25, 20);
                cb.stroke();
            }
            cb.restoreState();

            // â”€â”€ 6. Brand block (top-left) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            float logoX = 54f;
            float logoY = H - 72f;
            drawBrandLogo(cb, logoX, logoY, royalBlue, orange, darkInk);
            // Vertical divider
            cb.saveState();
            cb.setColorStroke(borderColor);
            cb.setLineWidth(1f);
            cb.moveTo(logoX + 30, H - 50);
            cb.lineTo(logoX + 30, H - 88);
            cb.stroke();
            cb.restoreState();
            float brandTxtX = logoX + 38f;
            addText(cb, "SEM",                     brandTxtX, H - 62,  22f,  Font.HELVETICA, Font.BOLD,   royalBlue, PdfContentByte.ALIGN_LEFT);
            addText(cb, "SMART EXAM MONITOR",       brandTxtX, H - 73,  7.5f, Font.HELVETICA, Font.BOLD,   darkInk,   PdfContentByte.ALIGN_LEFT);
            addText(cb, "Examine. Evaluate. Excel.", brandTxtX, H - 83,  7f,   Font.HELVETICA, Font.ITALIC, royalBlue, PdfContentByte.ALIGN_LEFT);

            // â”€â”€ 7. Badge pill (top-right) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            float bW = 196f, bH = 46f;
            float bX = W - bi - bW - 8;
            float bY = H - bi - bH - 6;
            drawBadgePill(cb, bX, bY, bW, bH, navyDeep, navyMid);
            float iconCX = bX + 26, iconCY = bY + bH / 2;
            cb.saveState();
            cb.setColorFill(new java.awt.Color(255, 255, 255, 45));
            cb.circle(iconCX, iconCY, 13f);
            cb.fill();
            cb.restoreState();
            addText(cb, "\u2605", iconCX, iconCY - 5, 12, Font.HELVETICA, Font.BOLD, Color.WHITE, PdfContentByte.ALIGN_CENTER);
            addText(cb, "EXAM COMPLETED",    bX + 48, bY + bH / 2 + 4,  9.5f, Font.HELVETICA, Font.BOLD,   Color.WHITE,                       PdfContentByte.ALIGN_LEFT);
            addText(cb, "Successfully Certified", bX + 48, bY + bH / 2 - 9, 7.5f, Font.HELVETICA, Font.NORMAL, new java.awt.Color(210, 205, 255), PdfContentByte.ALIGN_LEFT);

            // â”€â”€ 8. Main content block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            float cx = W / 2f;
            float y  = H - 118f;

            // "THIS IS TO CERTIFY THAT"
            addText(cb, "THIS IS TO CERTIFY THAT", cx, y, 8.5f, Font.HELVETICA, Font.BOLD, slateGray, PdfContentByte.ALIGN_CENTER);
            y -= 30;

            // Student name  (28pt)
            String studentName = cert.getStudentName() == null ? "Student" : cert.getStudentName();
            addText(cb, studentName, cx, y, 28f, Font.HELVETICA, Font.BOLD, royalBlue, PdfContentByte.ALIGN_CENTER);
            y -= 20;

            // Diamond rule below name
            drawDiamondRule(cb, cx, y, 100f, royalBlue, borderColor);
            y -= 20;

            // "Certificate of"  (20pt dark)
            addText(cb, "Certificate of", cx, y, 20f, Font.HELVETICA, Font.BOLD, darkInk, PdfContentByte.ALIGN_CENTER);
            y -= 48;

            // "Excellence"  (52pt royal blue â€“ hero word)
            addText(cb, "Excellence", cx, y, 52f, Font.HELVETICA, Font.BOLD, royalBlue, PdfContentByte.ALIGN_CENTER);
            y -= 30;

            // "has successfully completed the examination in"
            addText(cb, "has successfully completed the examination in", cx, y, 11f, Font.HELVETICA, Font.NORMAL, slateGray, PdfContentByte.ALIGN_CENTER);
            y -= 18;

            // Exam title  (bold dark)
            String examTitle = cert.getExamTitle() == null ? "Online Examination" : cert.getExamTitle();
            addText(cb, examTitle, cx, y, 13f, Font.HELVETICA, Font.BOLD, darkInk, PdfContentByte.ALIGN_CENTER);
            y -= 18;

            // Score line: normal + bold-blue score + normal
            String issueDate = cert.getIssuedAt() != null
                    ? cert.getIssuedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy"))
                    : LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
            String scoreStr    = formatScore(cert.getScore());
            String scorePre    = "with a score of ";
            String scoreSuf    = " on " + issueDate;
            float  preW        = measureTextWidth(scorePre, 11f, Font.HELVETICA, Font.NORMAL);
            float  scoW        = measureTextWidth(scoreStr, 11f, Font.HELVETICA, Font.BOLD);
            float  sufW        = measureTextWidth(scoreSuf, 11f, Font.HELVETICA, Font.NORMAL);
            float  lineW       = preW + scoW + sufW;
            float  lineX       = cx - lineW / 2f;
            addText(cb, scorePre,  lineX,                  y, 11f, Font.HELVETICA, Font.NORMAL, slateGray,  PdfContentByte.ALIGN_LEFT);
            addText(cb, scoreStr,  lineX + preW,           y, 11f, Font.HELVETICA, Font.BOLD,   royalBlue,  PdfContentByte.ALIGN_LEFT);
            addText(cb, scoreSuf,  lineX + preW + scoW,    y, 11f, Font.HELVETICA, Font.NORMAL, slateGray,  PdfContentByte.ALIGN_LEFT);
            y -= 26;

            // Dashed diamond rule
            drawDottedDiamondRule(cb, cx, y, W - 140f, royalBlue, borderColor);

            // â”€â”€ 9. Footer (QR | Signature | Certificate ID) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            // Footer baseline: keep all footer content between y=40 and y=145
            float fBase = 48f;   // bottom of QR box

            // â”€â”€ QR code (bottom-left) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            float qrBoxSz = 88f;   // outer box size (includes padding)
            float qrImgSz = 76f;   // actual QR image inside
            float qrPad   = (qrBoxSz - qrImgSz) / 2f;
            float qrBX    = bi + 14f;
            float qrBY    = fBase;

            // White bordered box
            cb.saveState();
            cb.setColorFill(Color.WHITE);
            cb.setColorStroke(borderColor);
            cb.setLineWidth(1.2f);
            cb.roundRectangle(qrBX, qrBY, qrBoxSz, qrBoxSz, 8f);
            cb.fillStroke();
            cb.restoreState();

            // QR image â€“ MUST use cb.addImage for absolute positioning
            if (qrImage != null && qrImage.length > 0) {
                try {
                    Image qr = Image.getInstance(qrImage);
                    qr.scaleAbsolute(qrImgSz, qrImgSz);
                    qr.setAbsolutePosition(qrBX + qrPad, qrBY + qrPad);
                    cb.addImage(qr);   // â† correct method: directly to content stream
                } catch (Exception ex) {
                    System.err.println("QR image render failed: " + ex.getMessage());
                }
            }

            // "SCAN TO VERIFY" label
            addText(cb, "SCAN TO VERIFY", qrBX + qrBoxSz / 2f, qrBY - 13f, 7f, Font.HELVETICA, Font.BOLD, darkInk, PdfContentByte.ALIGN_CENTER);

            // â”€â”€ Signature (center) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            float sigCX = cx;
            float sigY  = fBase + qrBoxSz * 0.65f;   // vertically centered in QR area

            addText(cb, "Exam Authority", sigCX, sigY + 14, 18f, Font.TIMES_ROMAN, Font.ITALIC, darkInk, PdfContentByte.ALIGN_CENTER);
            // Royal-blue underline
            cb.saveState();
            cb.setColorStroke(royalBlue);
            cb.setLineWidth(1.2f);
            cb.moveTo(sigCX - 70, sigY + 5);
            cb.lineTo(sigCX + 70, sigY + 5);
            cb.stroke();
            cb.restoreState();
            addText(cb, "EXAM AUTHORITY",            sigCX, sigY - 8,  7.5f, Font.HELVETICA, Font.BOLD,   darkInk,   PdfContentByte.ALIGN_CENTER);
            addText(cb, "SEM Platform - Examinations", sigCX, sigY - 20, 7.5f, Font.HELVETICA, Font.NORMAL, slateGray, PdfContentByte.ALIGN_CENTER);

            // â”€â”€ Certificate ID block (right) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            float idCX = W - bi - 95f;
            float idY  = fBase + qrBoxSz * 0.65f;

            addText(cb, "CERTIFICATE ID",            idCX, idY + 14, 7f,   Font.HELVETICA, Font.NORMAL, slateGray, PdfContentByte.ALIGN_CENTER);
            addText(cb, safeText(cert.getCertificateId()), idCX, idY - 4,  13f,  Font.HELVETICA, Font.BOLD,   darkInk,   PdfContentByte.ALIGN_CENTER);
            addText(cb, "Issued: " + issueDate,      idCX, idY - 19, 8.5f, Font.HELVETICA, Font.NORMAL, darkInk,   PdfContentByte.ALIGN_CENTER);

            document.close();
            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Draw an L-shaped corner bracket with a rounded inner corner.
     * corner = "TL", "TR", "BL", "BR"
     */
    private void drawCornerBracket(PdfContentByte cb, float cx, float cy, float size, float radius, float thick, java.awt.Color color, String corner) {
        cb.saveState();
        cb.setColorStroke(color);
        cb.setLineWidth(thick);
        cb.setLineCap(PdfContentByte.LINE_CAP_ROUND);

        boolean isLeft = corner.endsWith("L");
        boolean isTop  = corner.startsWith("T");

        float sx = isLeft ? cx : cx - size;
        float sy = isTop  ? cy - size : cy;

        float vx   = isLeft  ? sx : sx + size;
        float arcX = isLeft  ? sx + radius : sx + size - radius;
        float arcY = isTop   ? sy + size - radius : sy + radius;
        float hy   = isTop   ? sy + size : sy;
        float hEnd = isLeft  ? sx + size - radius : sx + radius;

        cb.moveTo(vx, isTop ? sy + radius : sy + size - radius);
        cb.lineTo(vx, arcY);
        cb.curveTo(vx, hy, vx, hy, arcX, hy);
        cb.lineTo(hEnd, hy);
        cb.stroke();
        cb.restoreState();
    }

    /**
     * Draw the SEM brand logo: open-book wings + orange dot + blue star.
     */
    private void drawBrandLogo(PdfContentByte cb, float cx, float cy, java.awt.Color blue, java.awt.Color orange, java.awt.Color ink) {
        cb.saveState();
        // Left wing
        cb.setColorFill(blue);
        cb.moveTo(cx - 2, cy + 4);
        cb.lineTo(cx - 20, cy + 20);
        cb.lineTo(cx - 20, cy + 7);
        cb.lineTo(cx - 2, cy - 4);
        cb.closePath();
        cb.fill();
        // Right wing
        cb.moveTo(cx + 2, cy + 4);
        cb.lineTo(cx + 20, cy + 20);
        cb.lineTo(cx + 20, cy + 7);
        cb.lineTo(cx + 2, cy - 4);
        cb.closePath();
        cb.fill();
        // Orange center circle
        cb.setColorFill(orange);
        cb.circle(cx, cy + 18, 5.5f);
        cb.fill();
        // Blue star dot on top
        cb.setColorFill(blue);
        cb.circle(cx, cy + 32, 3f);
        cb.fill();
        cb.restoreState();
    }

    /**
     * Draw a two-tone pill badge (left half darker, right half lighter).
     */
    private void drawBadgePill(PdfContentByte cb, float x, float y, float w, float h, java.awt.Color c1, java.awt.Color c2) {
        cb.saveState();
        cb.setColorFill(c1);
        cb.roundRectangle(x, y, w, h, h / 2f);
        cb.fill();
        // Lighter overlay on right half
        cb.setColorFill(c2);
        cb.roundRectangle(x + w * 0.42f, y, w * 0.58f, h, h / 2f);
        cb.fill();
        cb.restoreState();
    }

    /**
     * Horizontal rule with a solid diamond centre.
     */
    private void drawDiamondRule(PdfContentByte cb, float cx, float cy, float halfW, java.awt.Color diamondColor, java.awt.Color lineColor) {
        cb.saveState();
        cb.setColorStroke(lineColor);
        cb.setLineWidth(0.9f);
        cb.moveTo(cx - halfW, cy); cb.lineTo(cx - 7, cy); cb.stroke();
        cb.moveTo(cx + 7, cy);     cb.lineTo(cx + halfW, cy); cb.stroke();
        cb.setColorFill(diamondColor);
        cb.moveTo(cx, cy + 5); cb.lineTo(cx + 5, cy); cb.lineTo(cx, cy - 5); cb.lineTo(cx - 5, cy);
        cb.closePath(); cb.fill();
        cb.restoreState();
    }

    /**
     * Dashed horizontal rule with a solid diamond centre.
     */
    private void drawDottedDiamondRule(PdfContentByte cb, float cx, float cy, float totalW, java.awt.Color diamondColor, java.awt.Color lineColor) {
        cb.saveState();
        cb.setColorStroke(lineColor);
        cb.setLineWidth(0.9f);
        cb.setLineDash(3f, 3f);
        cb.moveTo(cx - totalW / 2f, cy); cb.lineTo(cx - 7, cy); cb.stroke();
        cb.moveTo(cx + 7, cy); cb.lineTo(cx + totalW / 2f, cy); cb.stroke();
        cb.setLineDash(0);
        cb.setColorFill(diamondColor);
        cb.moveTo(cx, cy + 5); cb.lineTo(cx + 5, cy); cb.lineTo(cx, cy - 5); cb.lineTo(cx - 5, cy);
        cb.closePath(); cb.fill();
        cb.restoreState();
    }

    private void addText(PdfContentByte canvas, String text, float x, float y, float size,
                         int family, int style, java.awt.Color color, int align) {
        try {
            BaseFont bf = BaseFont.createFont(resolveFontName(family, style), BaseFont.WINANSI, BaseFont.EMBEDDED);
            canvas.saveState();
            canvas.beginText();
            canvas.setColorFill(color);
            canvas.setFontAndSize(bf, size);
            canvas.showTextAligned(align, text, x, y, 0);
            canvas.endText();
            canvas.restoreState();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private float measureTextWidth(String text, float size, int family, int style) {
        try {
            BaseFont bf = BaseFont.createFont(resolveFontName(family, style), BaseFont.WINANSI, BaseFont.EMBEDDED);
            return bf.getWidthPoint(text, size);
        } catch (Exception e) {
            return text.length() * size * 0.5f;
        }
    }

    private String resolveFontName(int family, int style) {
        boolean bold   = (style & Font.BOLD)   == Font.BOLD;
        boolean italic = (style & Font.ITALIC)  == Font.ITALIC;
        if (family == Font.TIMES_ROMAN) {
            if (bold && italic) return BaseFont.TIMES_BOLDITALIC;
            if (bold)           return BaseFont.TIMES_BOLD;
            if (italic)         return BaseFont.TIMES_ITALIC;
            return BaseFont.TIMES_ROMAN;
        }
        if (bold && italic) return BaseFont.HELVETICA_BOLDOBLIQUE;
        if (bold)           return BaseFont.HELVETICA_BOLD;
        if (italic)         return BaseFont.HELVETICA_OBLIQUE;
        return BaseFont.HELVETICA;
    }

    private String safeText(String value) {
        return StringUtils.hasText(value) ? value : "-";
    }

    private String formatScore(double score) {
        if (Math.floor(score) == score) {
            return String.format(java.util.Locale.ROOT, "%.0f/100", score);
        }
        return String.format(java.util.Locale.ROOT, "%.1f/100", score);
    }

    private Image loadImage(String path) throws Exception {
        ClassPathResource file = new ClassPathResource(path);
        InputStream stream = file.getInputStream();
        return Image.getInstance(stream.readAllBytes());
    }
}
