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
import org.springframework.core.io.ClassPathResource;
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

    private final CertificateRepository certificateRepository;
    private final QrCodeService qrCodeService;
    private final StudentProfileRepository studentProfileRepository;
    private final EmailService emailService;

    public CertificateService(
            CertificateRepository certificateRepository,
            QrCodeService qrCodeService,
            StudentProfileRepository studentProfileRepository,
            EmailService emailService) {

        this.certificateRepository = certificateRepository;
        this.qrCodeService = qrCodeService;
        this.studentProfileRepository = studentProfileRepository;
        this.emailService = emailService;
    }

    @Transactional
    public byte[] generateCertificate(
            Long studentId,
            String examCode,
            String examTitle,
            double score
    ) {

        // 🔒 PROFILE VALIDATION
        StudentProfile profile = studentProfileRepository
                .findByUserId(studentId)
                .orElseThrow(() -> new RuntimeException("Student profile not found"));

        if (!profile.isProfileCompleted()) {
            throw new RuntimeException("Complete profile before generating certificate");
        }

        // 🚫 PREVENT DUPLICATE CERTIFICATE
        certificateRepository.findByStudentIdAndExamCode(studentId, examCode)
                .ifPresent(c -> {
                    throw new RuntimeException("Certificate already generated for this exam");
                });

        String certificateId = generateCertificateId();

        String verifyUrl =
                "http://localhost:8080/api/certificate/verify/" + certificateId;

        byte[] qrImage = qrCodeService.generateQRCode(verifyUrl);

        Certificate cert = new Certificate();

        // STUDENT SNAPSHOT
        cert.setCertificateId(certificateId);
        cert.setStudentId(studentId);
        cert.setStudentName(profile.getFullName());
        cert.setCollegeName(profile.getCollegeName());
        cert.setDepartment(profile.getDepartment());
        cert.setRollNumber(profile.getRollNumber());
        cert.setSection(profile.getSection());
        cert.setProfilePhoto(profile.getProfilePhoto());

        // EXAM INFO
        cert.setExamCode(examCode);
        cert.setExamTitle(examTitle);
        cert.setScore(score);
        cert.setGrade(calculateGrade(score));

        // METADATA
        cert.setQrCodeData(verifyUrl);
        cert.setIssuedAt(LocalDateTime.now());

        certificateRepository.save(cert);

        // PDF GENERATION
        byte[] pdf = generatePremiumPdf(cert, qrImage);

        // 📧 EMAIL (FAIL-SAFE)
        try {
            emailService.sendCertificateEmail(
                    profile.getEmail(),
                    profile.getFullName(),
                    certificateId,
                    pdf
            );
        } catch (Exception e) {
            // log but don't fail main flow
            System.out.println("Email failed: " + e.getMessage());
        }

        return pdf;
    }

    private String generateCertificateId() {
        return "CERT-" + UUID.randomUUID().toString()
                .substring(0, 8)
                .toUpperCase();
    }

    private String calculateGrade(double score) {
        if (score >= 90) return "A+";
        if (score >= 75) return "A";
        if (score >= 60) return "B";
        if (score >= 50) return "C";
        return "Fail";
    }

    private byte[] generatePremiumPdf(Certificate cert, byte[] qrImage) {

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Document document = new Document(PageSize.A4.rotate(), 60, 60, 60, 60);
            PdfWriter writer = PdfWriter.getInstance(document, out);

            document.open();

            PdfContentByte canvas = writer.getDirectContent();

            float width = document.getPageSize().getWidth();
            float height = document.getPageSize().getHeight();

            Rectangle border = new Rectangle(30, 30, width - 30, height - 30);
            border.setBorder(Rectangle.BOX);
            border.setBorderWidth(4);
            border.setBorderColor(new Color(212, 175, 55));
            canvas.rectangle(border);

            try {
                Image watermark = loadImage("static/watermark.png");
                watermark.scaleAbsolute(400, 300);
                watermark.setAbsolutePosition((width - 400) / 2, (height - 300) / 2);

                PdfGState gs = new PdfGState();
                gs.setFillOpacity(0.08f);

                canvas.saveState();
                canvas.setGState(gs);
                canvas.addImage(watermark);
                canvas.restoreState();
            } catch (Exception ignored) {}

            addCenteredImage(document, "static/logo.png", 80, 80);

            addCenteredText(document,
                    "CERTIFICATE OF ACHIEVEMENT",
                    new Font(Font.TIMES_ROMAN, 36, Font.BOLD, new Color(212, 175, 55)));

            document.add(new Paragraph("\n"));

            addCenteredText(document,
                    "This is proudly presented to",
                    new Font(Font.HELVETICA, 18));

            document.add(new Paragraph("\n"));

            addCenteredText(document,
                    cert.getStudentName(),
                    new Font(Font.TIMES_ROMAN, 32, Font.BOLD));

            document.add(new Paragraph("\n"));

            addCenteredText(document,
                    "For successfully completing the examination\n\n" +
                            cert.getExamTitle() +
                            "\n\nCollege: " + cert.getCollegeName() +
                            "\nDepartment: " + cert.getDepartment() +
                            "\nRoll No: " + cert.getRollNumber() +
                            "\n\nScore: " + cert.getScore() +
                            "   |   Grade: " + cert.getGrade(),
                    new Font(Font.HELVETICA, 18));

            document.add(new Paragraph("\n\n"));

            String formattedDate = cert.getIssuedAt()
                    .format(DateTimeFormatter.ofPattern("dd MMMM yyyy"));

            addCenteredText(document,
                    "Certificate ID: " + cert.getCertificateId() +
                            "\nDate: " + formattedDate,
                    new Font(Font.HELVETICA, 14));

            Image qr = Image.getInstance(qrImage);
            qr.scaleAbsolute(100, 100);
            qr.setAbsolutePosition(70, 70);
            document.add(qr);

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

    private void addCenteredImage(Document doc, String path, float w, float h) {
        try {
            Image img = loadImage(path);
            img.scaleAbsolute(w, h);
            img.setAlignment(Image.ALIGN_CENTER);
            doc.add(img);
        } catch (Exception ignored) {}
    }

    private Image loadImage(String path) throws Exception {
        ClassPathResource file = new ClassPathResource(path);
        InputStream stream = file.getInputStream();
        return Image.getInstance(stream.readAllBytes());
    }
}