package com.yashwanth.ai_exam_system.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.*;
import com.yashwanth.ai_exam_system.entity.Certificate;
import com.yashwanth.ai_exam_system.entity.StudentProfile;
import com.yashwanth.ai_exam_system.repository.CertificateRepository;
import com.yashwanth.ai_exam_system.repository.StudentProfileRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
public class CertificateService {

    private static final int CERTIFICATE_TEMPLATE_VERSION = 3;

    private static final java.awt.Color NAVY = new java.awt.Color(10, 28, 58);
    private static final java.awt.Color GOLD = new java.awt.Color(209, 160, 58);
    private static final java.awt.Color GOLD_LIGHT = new java.awt.Color(239, 212, 149);
    private static final java.awt.Color INK = new java.awt.Color(16, 28, 52);
    private static final java.awt.Color PAPER = new java.awt.Color(250, 248, 242);
    private static final java.awt.Color PAPER_ALT = new java.awt.Color(245, 243, 237);
    private static final java.awt.Color SOFT_BLUE = new java.awt.Color(220, 230, 246);

    private final CertificateRepository certificateRepository;
    private final QrCodeService qrCodeService;
    private final StudentProfileRepository studentProfileRepository;
    private final EmailService emailService;
    private final String fallbackBaseUrl;

    public CertificateService(
            CertificateRepository certificateRepository,
            QrCodeService qrCodeService,
            StudentProfileRepository studentProfileRepository,
            EmailService emailService,
            @Value("${app.frontend.base-url:http://localhost:8080}") String fallbackBaseUrl) {

        this.certificateRepository = certificateRepository;
        this.qrCodeService = qrCodeService;
        this.studentProfileRepository = studentProfileRepository;
        this.emailService = emailService;
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

        StudentProfile profile = getValidatedProfile(studentId);

        Certificate existing = certificateRepository
                .findByStudentIdAndExamCode(studentId, examCode)
                .orElse(null);

        if (existing != null) {
            if (existing.isRevoked()) {
                throw new RuntimeException("Certificate is revoked");
            }
            if (existing.getPdfData() != null
                    && Integer.valueOf(CERTIFICATE_TEMPLATE_VERSION).equals(existing.getTemplateVersion())) {
                return existing.getPdfData();
            }
        }

        Certificate cert = existing != null ? existing : new Certificate();
        populateCertificate(cert, profile, examCode, examTitle, score, baseUrl);

        byte[] pdf = generateAndStoreCertificatePdf(cert, false);
        sendEmailSafe(profile, cert.getCertificateId(), pdf);
        return pdf;
    }

    // ================= VALIDATION =================

    private StudentProfile getValidatedProfile(Long studentId) {

        StudentProfile profile = studentProfileRepository
                .findByUserId(studentId)
                .orElseThrow(() -> new RuntimeException("Student profile not found"));

        if (!profile.isActive()) {
            throw new RuntimeException("User inactive");
        }

        if (!profile.isProfileCompleted()) {
            throw new RuntimeException("Complete profile first");
        }

        if (profile.getEmail() == null || profile.getEmail().isBlank()) {
            throw new RuntimeException("Email required");
        }

        return profile;
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
        cert.setProfilePhoto(profile.getProfilePhoto());

        cert.setExamCode(examCode);
        cert.setExamTitle(examTitle);
        cert.setScore(score);
        cert.setGrade(calculateGrade(score));

        cert.setTemplateVersion(CERTIFICATE_TEMPLATE_VERSION);
        cert.setQrCodeData(buildVerifyUrl(cert.getCertificateId(), baseUrl));
        cert.setIssuedAt(LocalDateTime.now());

        return cert;
    }

    public byte[] refreshCertificatePdf(Certificate cert, String baseUrl) {
        if (cert == null) {
            throw new RuntimeException("Certificate not found");
        }
        if (cert.isRevoked()) {
            throw new RuntimeException("Certificate is revoked");
        }
        if (cert.getCertificateId() == null || cert.getCertificateId().isBlank()) {
            throw new RuntimeException("Certificate ID missing");
        }

        if (StringUtils.hasText(baseUrl) && cert.getQrCodeData() != null && cert.getPdfData() != null
                && Integer.valueOf(CERTIFICATE_TEMPLATE_VERSION).equals(cert.getTemplateVersion())) {
            return cert.getPdfData();
        }

        try {
            byte[] pdf = generateAndStoreCertificatePdf(cert, true, baseUrl);
            certificateRepository.save(cert);
            return pdf;
        } catch (Exception ex) {
            throw new RuntimeException("Certificate PDF refresh failed", ex);
        }
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

    private String calculateGrade(double score) {
        if (score >= 90) return "A+";
        if (score >= 80) return "A";
        if (score >= 70) return "B+";
        if (score >= 60) return "B";
        if (score >= 50) return "C";
        if (score >= 40) return "D";
        return "Fail";
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

            Document document = new Document(PageSize.A4.rotate(), 28, 28, 28, 28);
            PdfWriter writer = PdfWriter.getInstance(document, out);

            document.open();

            PdfContentByte canvas = writer.getDirectContent();

            float width = document.getPageSize().getWidth();
            float height = document.getPageSize().getHeight();

            drawBackground(canvas, width, height);
            drawFrame(canvas, width, height);
            drawCornerBands(canvas, width, height);
            drawBrandBlock(canvas, width, height);
            drawRightRibbon(canvas, width, height);
            drawFooterBar(canvas, width, height);

            drawHeading(canvas, width, height, cert);
            drawStudentName(canvas, width, height, cert);
            drawNarrative(canvas, width, height, cert);
            drawInfoStrip(canvas, width, height, cert);
            drawQrBlock(canvas, document, cert, qrImage, width, height);
            drawSeal(canvas, width, height);
            drawSignature(canvas, width, height);
            drawCertificateId(canvas, width, height, cert);

            document.close();
            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed", e);
        }
    }

    private void addCenteredText(Document doc, String text, Font font)
            throws DocumentException {
        Paragraph p = new Paragraph(text, font);
        p.setAlignment(Element.ALIGN_CENTER);
        doc.add(p);
    }

    private void drawBackground(PdfContentByte canvas, float width, float height) {
        canvas.saveState();
        canvas.setColorFill(PAPER);
        canvas.rectangle(0, 0, width, height);
        canvas.fill();
        canvas.restoreState();

        canvas.saveState();
        canvas.setColorStroke(PAPER_ALT);
        canvas.setLineWidth(0.5f);
        for (int i = -80; i < (int) width + 120; i += 20) {
            canvas.moveTo(i, 0);
            canvas.lineTo(i + 120, height);
            canvas.stroke();
        }
        canvas.restoreState();
    }

    private void drawFrame(PdfContentByte canvas, float width, float height) {
        canvas.saveState();
        canvas.setColorStroke(NAVY);
        canvas.setLineWidth(2.2f);
        canvas.rectangle(14, 14, width - 28, height - 28);
        canvas.stroke();
        canvas.setColorStroke(GOLD);
        canvas.setLineWidth(1.0f);
        canvas.rectangle(20, 20, width - 40, height - 40);
        canvas.stroke();
        canvas.restoreState();
    }

    private void drawCornerBands(PdfContentByte canvas, float width, float height) {
        canvas.saveState();
        canvas.setColorFill(NAVY);
        canvas.moveTo(0, 0);
        canvas.lineTo(0, height);
        canvas.lineTo(165, height);
        canvas.lineTo(220, height - 55);
        canvas.lineTo(220, 65);
        canvas.lineTo(165, 0);
        canvas.closePathFillStroke();

        canvas.setColorFill(GOLD);
        canvas.moveTo(0, 0);
        canvas.lineTo(24, 0);
        canvas.lineTo(200, height - 56);
        canvas.lineTo(176, height - 56);
        canvas.closePathFillStroke();

        canvas.setColorFill(NAVY);
        canvas.moveTo(width, 0);
        canvas.lineTo(width - 120, 0);
        canvas.lineTo(width - 175, 55);
        canvas.lineTo(width - 175, height);
        canvas.lineTo(width, height);
        canvas.closePathFillStroke();

        canvas.setColorFill(GOLD);
        canvas.moveTo(width, 0);
        canvas.lineTo(width - 24, 0);
        canvas.lineTo(width - 199, height - 56);
        canvas.lineTo(width - 175, height - 56);
        canvas.closePathFillStroke();
        canvas.restoreState();
    }

    private void drawBrandBlock(PdfContentByte canvas, float width, float height) {
        canvas.saveState();
        canvas.setColorFill(NAVY);
        canvas.roundRectangle(28, height - 198, 160, 150, 18);
        canvas.fill();
        canvas.setColorStroke(GOLD);
        canvas.setLineWidth(1.5f);
        canvas.roundRectangle(28, height - 198, 160, 150, 18);
        canvas.stroke();

        BaseFont bf;
        try {
            bf = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, BaseFont.EMBEDDED);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        try {
            Image logo = loadImage("static/assets/core/img/logo.png");
            logo.scaleToFit(72, 72);
            logo.setAbsolutePosition(72, height - 110);
            canvas.addImage(logo);
        } catch (Exception ignored) {
            // Fallback to text branding if the logo asset is unavailable.
        }

        canvas.beginText();
        canvas.setColorFill(Color.WHITE);
        canvas.setFontAndSize(bf, 20);
        canvas.showTextAligned(PdfContentByte.ALIGN_CENTER, "AI EXAM", 108, height - 150, 0);
        canvas.setFontAndSize(bf, 18);
        canvas.showTextAligned(PdfContentByte.ALIGN_CENTER, "SYSTEM", 108, height - 172, 0);
        canvas.endText();

        canvas.setColorStroke(GOLD_LIGHT);
        canvas.setLineWidth(1f);
        canvas.moveTo(52, height - 140);
        canvas.lineTo(164, height - 140);
        canvas.stroke();
        canvas.restoreState();
    }

    private void drawRightRibbon(PdfContentByte canvas, float width, float height) {
        float ribbonX = width - 122;
        float ribbonW = 96;
        float ribbonTop = height - 8;
        canvas.saveState();
        canvas.setColorFill(NAVY);
        canvas.rectangle(ribbonX, 72, ribbonW, ribbonTop - 72);
        canvas.fill();
        canvas.setColorStroke(GOLD);
        canvas.setLineWidth(1.3f);
        canvas.rectangle(ribbonX, 72, ribbonW, ribbonTop - 72);
        canvas.stroke();
        canvas.setColorFill(GOLD);
        canvas.moveTo(ribbonX, 72);
        canvas.lineTo(ribbonX + ribbonW / 2, 34);
        canvas.lineTo(ribbonX + ribbonW, 72);
        canvas.closePathFillStroke();
        canvas.restoreState();

        drawMedallion(canvas, ribbonX + ribbonW / 2, height - 150, 62,
                "EXCELLENCE", "IN ONLINE", "ASSESSMENT");
    }

    private void drawMedallion(PdfContentByte canvas, float cx, float cy, float radius,
                               String line1, String line2, String line3) {
        canvas.saveState();
        canvas.setColorFill(NAVY);
        canvas.circle(cx, cy, radius);
        canvas.fillStroke();
        canvas.setColorStroke(GOLD);
        canvas.setLineWidth(2f);
        canvas.circle(cx, cy, radius - 6);
        canvas.stroke();
        canvas.setColorStroke(GOLD_LIGHT);
        canvas.setLineWidth(0.7f);
        canvas.circle(cx, cy, radius - 16);
        canvas.stroke();

        BaseFont titleFont;
        try {
            titleFont = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, BaseFont.EMBEDDED);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        canvas.beginText();
        canvas.setColorFill(Color.WHITE);
        canvas.setFontAndSize(titleFont, 10);
        canvas.showTextAligned(PdfContentByte.ALIGN_CENTER, line1, cx, cy + 10, 0);
        canvas.showTextAligned(PdfContentByte.ALIGN_CENTER, line2, cx, cy - 4, 0);
        canvas.showTextAligned(PdfContentByte.ALIGN_CENTER, line3, cx, cy - 18, 0);
        canvas.endText();
        canvas.restoreState();
    }

    private void drawHeading(PdfContentByte canvas, float width, float height, Certificate cert) {
        addText(canvas, "CERTIFICATE", width / 2, height - 118, 42, Font.TIMES_ROMAN, Font.BOLD, NAVY, PdfContentByte.ALIGN_CENTER);
        addText(canvas, "OF COMPLETION", width / 2, height - 154, 24, Font.TIMES_ROMAN, Font.BOLD, GOLD, PdfContentByte.ALIGN_CENTER);
        drawDividerWithCenterDot(canvas, width / 2, height - 174, 168);
        addText(canvas, "THIS IS TO CERTIFY THAT", width / 2, height - 188, 14, Font.HELVETICA, Font.BOLD, NAVY, PdfContentByte.ALIGN_CENTER);
    }

    private void drawStudentName(PdfContentByte canvas, float width, float height, Certificate cert) {
        String studentName = cert.getStudentName() == null ? "Student" : cert.getStudentName();
        addText(canvas, studentName, width / 2, height - 248, 30, Font.TIMES_ROMAN, Font.BOLDITALIC, INK, PdfContentByte.ALIGN_CENTER);
        canvas.saveState();
        canvas.setColorStroke(GOLD);
        canvas.setLineWidth(1.2f);
        canvas.moveTo(width / 2 - 170, height - 276);
        canvas.lineTo(width / 2 + 170, height - 276);
        canvas.stroke();
        canvas.restoreState();
    }

    private void drawNarrative(PdfContentByte canvas, float width, float height, Certificate cert) {
        String examTitle = cert.getExamTitle() == null ? "the online examination" : cert.getExamTitle();
        String body = "has successfully completed the " + examTitle + "\n"
                + "conducted by AI Exam System.\n"
                + "The candidate has demonstrated satisfactory knowledge,\n"
                + "consistent performance, and successful completion of the assessment.";
        addText(canvas, body, width / 2, height - 332, 16, Font.HELVETICA, Font.NORMAL, INK, PdfContentByte.ALIGN_CENTER);
    }

    private void drawInfoStrip(PdfContentByte canvas, float width, float height, Certificate cert) {
        float startX = 86;
        float startY = height - 480;
        float boxW = 112;
        float boxH = 78;
        float gap = 12;
        String issueDate = cert.getIssuedAt() != null
                ? cert.getIssuedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy"))
                : "-";

        drawInfoBox(canvas, startX, startY, boxW, boxH, "EXAMINATION", safeText(cert.getExamTitle()), false);
        drawInfoBox(canvas, startX + (boxW + gap), startY, boxW, boxH, "DATE OF ISSUE", issueDate, false);
        drawInfoBox(canvas, startX + 2 * (boxW + gap), startY, boxW, boxH, "SCORE", formatScore(cert.getScore()), false);
        drawInfoBox(canvas, startX + 3 * (boxW + gap), startY, boxW, boxH, "GRADE", safeText(cert.getGrade()), false);
        drawInfoBox(canvas, startX + 4 * (boxW + gap), startY, boxW, boxH, "STATUS", "VERIFIED", true);
    }

    private void drawInfoBox(PdfContentByte canvas, float x, float y, float w, float h, String label, String value, boolean highlight) {
        canvas.saveState();
        canvas.setColorFill(highlight ? SOFT_BLUE : Color.WHITE);
        canvas.roundRectangle(x, y, w, h, 12);
        canvas.fillStroke();
        canvas.setColorStroke(highlight ? GOLD : new Color(208, 215, 224));
        canvas.setLineWidth(1f);
        canvas.roundRectangle(x, y, w, h, 12);
        canvas.stroke();
        canvas.restoreState();

        addText(canvas, label, x + w / 2, y + h - 20, 10, Font.HELVETICA, Font.BOLD, GOLD, PdfContentByte.ALIGN_CENTER);
        addText(canvas, value, x + w / 2, y + 25, 14, Font.HELVETICA, Font.BOLD, INK, PdfContentByte.ALIGN_CENTER);
    }

    private void drawQrBlock(PdfContentByte canvas, Document document, Certificate cert, byte[] qrImage, float width, float height)
            throws DocumentException, BadElementException, java.io.IOException {
        Image qr = Image.getInstance(qrImage);
        qr.scaleAbsolute(88, 88);
        qr.setAbsolutePosition(72, 70);
        document.add(qr);
        drawInfoBox(canvas, 68, 54, 118, 122, "CERTIFICATE ID", safeText(cert.getCertificateId()), true);
        addText(canvas, "Scan the QR code to verify\nthis certificate online.", 127, 50, 10, Font.HELVETICA, Font.NORMAL, INK, PdfContentByte.ALIGN_CENTER);
    }

    private void drawSeal(PdfContentByte canvas, float width, float height) {
        float cx = width / 2;
        float cy = 96;
        canvas.saveState();
        canvas.setColorFill(GOLD);
        canvas.circle(cx, cy, 48);
        canvas.fillStroke();
        canvas.setColorStroke(NAVY);
        canvas.setLineWidth(2f);
        canvas.circle(cx, cy, 42);
        canvas.stroke();
        canvas.setColorFill(NAVY);
        canvas.circle(cx, cy, 32);
        canvas.fill();
        canvas.setColorStroke(GOLD_LIGHT);
        canvas.setLineWidth(1f);
        canvas.circle(cx, cy, 24);
        canvas.stroke();
        addText(canvas, "VERIFIED", cx, cy + 11, 10, Font.HELVETICA, Font.BOLD, Color.WHITE, PdfContentByte.ALIGN_CENTER);
        addText(canvas, "& CERTIFIED", cx, cy - 4, 10, Font.HELVETICA, Font.BOLD, Color.WHITE, PdfContentByte.ALIGN_CENTER);
        addText(canvas, "AI EXAM SYSTEM", cx, cy - 18, 8, Font.HELVETICA, Font.BOLD, Color.WHITE, PdfContentByte.ALIGN_CENTER);
        canvas.restoreState();
    }

    private void drawSignature(PdfContentByte canvas, float width, float height) {
        float x2 = width - 82;
        float y = 90;
        canvas.saveState();
        canvas.setColorStroke(GOLD);
        canvas.setLineWidth(1.2f);
        canvas.moveTo(width - 220, y + 12);
        canvas.lineTo(x2, y + 12);
        canvas.stroke();
        canvas.restoreState();

        addText(canvas, "Dr. AI Admin", width - 150, y + 32, 16, Font.TIMES_ROMAN, Font.BOLD, INK, PdfContentByte.ALIGN_CENTER);
        addText(canvas, "Chief Administrator", width - 150, y + 12, 11, Font.HELVETICA, Font.BOLD, INK, PdfContentByte.ALIGN_CENTER);
        addText(canvas, "AI Exam System", width - 150, y - 2, 11, Font.HELVETICA, Font.NORMAL, INK, PdfContentByte.ALIGN_CENTER);
    }

    private void drawCertificateId(PdfContentByte canvas, float width, float height, Certificate cert) {
        addText(canvas, "CERTIFICATE ID", 220, 90, 11, Font.HELVETICA, Font.BOLD, INK, PdfContentByte.ALIGN_LEFT);
        addText(canvas, safeText(cert.getCertificateId()), 220, 72, 11, Font.HELVETICA, Font.NORMAL, INK, PdfContentByte.ALIGN_LEFT);
        addText(canvas, "AI Exam System", 220, 52, 10, Font.HELVETICA, Font.BOLD, GOLD, PdfContentByte.ALIGN_LEFT);
    }

    private void drawFooterBar(PdfContentByte canvas, float width, float height) {
        canvas.saveState();
        canvas.setColorFill(NAVY);
        canvas.roundRectangle(140, 8, width - 280, 44, 10);
        canvas.fill();
        canvas.restoreState();

        addText(canvas, "SECURE", width / 2 - 180, 34, 11, Font.HELVETICA, Font.BOLD, Color.WHITE, PdfContentByte.ALIGN_CENTER);
        addText(canvas, "RELIABLE", width / 2, 34, 11, Font.HELVETICA, Font.BOLD, Color.WHITE, PdfContentByte.ALIGN_CENTER);
        addText(canvas, "TRANSPARENT", width / 2 + 180, 34, 11, Font.HELVETICA, Font.BOLD, Color.WHITE, PdfContentByte.ALIGN_CENTER);
        addText(canvas, "Your Data is Protected", width / 2 - 180, 18, 9, Font.HELVETICA, Font.NORMAL, GOLD_LIGHT, PdfContentByte.ALIGN_CENTER);
        addText(canvas, "Accurate & Fair Evaluation", width / 2, 18, 9, Font.HELVETICA, Font.NORMAL, GOLD_LIGHT, PdfContentByte.ALIGN_CENTER);
        addText(canvas, "Trusted Assessment Process", width / 2 + 180, 18, 9, Font.HELVETICA, Font.NORMAL, GOLD_LIGHT, PdfContentByte.ALIGN_CENTER);
        addText(canvas, "AI Exam System", width / 2, 10, 8, Font.HELVETICA, Font.BOLD, Color.WHITE, PdfContentByte.ALIGN_CENTER);
    }

    private void drawDividerWithCenterDot(PdfContentByte canvas, float centerX, float y, float halfWidth) {
        canvas.saveState();
        canvas.setColorStroke(GOLD);
        canvas.setLineWidth(1.1f);
        canvas.moveTo(centerX - halfWidth, y);
        canvas.lineTo(centerX - 28, y);
        canvas.stroke();
        canvas.circle(centerX, y, 2.2f);
        canvas.fillStroke();
        canvas.moveTo(centerX + 28, y);
        canvas.lineTo(centerX + halfWidth, y);
        canvas.stroke();
        canvas.restoreState();
    }

    private void addText(PdfContentByte canvas,
                         String text,
                         float x,
                         float y,
                         float size,
                         int family,
                         int style,
                         java.awt.Color color,
                         int align) {
        try {
            String fontName = resolveFontName(family, style);
            BaseFont bf = BaseFont.createFont(fontName, BaseFont.WINANSI, BaseFont.EMBEDDED);
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

    private String resolveFontName(int family, int style) {
        boolean bold = (style & Font.BOLD) == Font.BOLD;
        boolean italic = (style & Font.ITALIC) == Font.ITALIC || (style & Font.BOLDITALIC) == Font.BOLDITALIC;

        if (family == Font.TIMES_ROMAN) {
            if (bold && italic) return BaseFont.TIMES_BOLDITALIC;
            if (bold) return BaseFont.TIMES_BOLD;
            if (italic) return BaseFont.TIMES_ITALIC;
            return BaseFont.TIMES_ROMAN;
        }

        if (bold && italic) return BaseFont.HELVETICA_BOLDOBLIQUE;
        if (bold) return BaseFont.HELVETICA_BOLD;
        if (italic) return BaseFont.HELVETICA_OBLIQUE;
        return BaseFont.HELVETICA;
    }

    private String safeText(String value) {
        return StringUtils.hasText(value) ? value : "-";
    }

    private String formatScore(double score) {
        if (Math.floor(score) == score) {
            return String.format(java.util.Locale.ROOT, "%.0f%%", score);
        }
        return String.format(java.util.Locale.ROOT, "%.1f%%", score);
    }

    private Image loadImage(String path) throws Exception {
        ClassPathResource file = new ClassPathResource(path);
        InputStream stream = file.getInputStream();
        return Image.getInstance(stream.readAllBytes());
    }
}
