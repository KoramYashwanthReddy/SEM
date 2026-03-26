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

    public CertificateService(
            CertificateRepository certificateRepository,
            QrCodeService qrCodeService,
            StudentProfileRepository studentProfileRepository) {

        this.certificateRepository = certificateRepository;
        this.qrCodeService = qrCodeService;
        this.studentProfileRepository = studentProfileRepository;
    }

    public byte[] generateCertificate(
            Long studentId,
            String examCode,
            String examTitle,
            double score
    ) {

        // AUTO FILL PROFILE
        StudentProfile profile = studentProfileRepository
                .findByUserId(studentId)
                .orElseThrow(() -> new RuntimeException("Student profile not found"));

        String grade = calculateGrade(score);

        String certificateId =
                "CERT-" + UUID.randomUUID().toString().substring(0,8).toUpperCase();

        String verifyUrl =
                "http://localhost:8080/api/certificate/verify/" + certificateId;

        byte[] qrImage = qrCodeService.generateQRCode(verifyUrl);

        Certificate cert = new Certificate();

        // Student snapshot
        cert.setCertificateId(certificateId);
        cert.setStudentId(studentId);
        cert.setStudentName(profile.getFullName());
        cert.setCollegeName(profile.getCollegeName());
        cert.setDepartment(profile.getDepartment());
        cert.setRollNumber(profile.getRollNumber());
        cert.setSection(profile.getSection());
        cert.setProfilePhoto(profile.getProfilePhoto());

        // Exam info
        cert.setExamCode(examCode);
        cert.setExamTitle(examTitle);
        cert.setScore(score);
        cert.setGrade(grade);

        // Metadata
        cert.setQrCodeData(verifyUrl);
        cert.setIssuedAt(LocalDateTime.now());

        certificateRepository.save(cert);

        return generatePremiumPdf(cert, qrImage);
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

            // GOLD BORDER
            Rectangle border = new Rectangle(30, 30, width - 30, height - 30);
            border.setBorder(Rectangle.BOX);
            border.setBorderWidth(4);
            border.setBorderColor(new Color(212, 175, 55));
            canvas.rectangle(border);

            // WATERMARK
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

            // LOGO
            addCenteredImage(document, "static/logo.png", 80, 80);

            // TITLE
            addCenteredText(document,
                    "CERTIFICATE OF ACHIEVEMENT",
                    new Font(Font.TIMES_ROMAN, 36, Font.BOLD, new Color(212, 175, 55)));

            document.add(new Paragraph("\n"));

            addCenteredText(document,
                    "This is proudly presented to",
                    new Font(Font.HELVETICA, 18));

            document.add(new Paragraph("\n"));

            // NAME
            addCenteredText(document,
                    cert.getStudentName(),
                    new Font(Font.TIMES_ROMAN, 32, Font.BOLD));

            document.add(new Paragraph("\n"));

            // CONTENT WITH AUTO-FILL DATA
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

            // QR
            Image qr = Image.getInstance(qrImage);
            qr.scaleAbsolute(100, 100);
            qr.setAbsolutePosition(70, 70);
            document.add(qr);

            // SEAL
            try {
                Image seal = loadImage("static/seal.png");
                seal.scaleAbsolute(120, 120);
                seal.setAbsolutePosition((width / 2) - 60, 70);
                document.add(seal);
            } catch (Exception ignored) {}

            // SIGNATURE
            try {
                Image sign = loadImage("static/signature.png");
                sign.scaleAbsolute(140, 60);
                sign.setAbsolutePosition(width - 220, 80);
                document.add(sign);

                ColumnText.showTextAligned(
                        canvas,
                        Element.ALIGN_RIGHT,
                        new Phrase("Authorized Signature",
                                new Font(Font.HELVETICA, 12)),
                        width - 80,
                        60,
                        0
                );

            } catch (Exception ignored) {}

            document.close();
            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Premium PDF generation failed", e);
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