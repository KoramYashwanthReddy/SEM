package com.yashwanth.ai_exam_system.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.yashwanth.ai_exam_system.entity.Certificate;
import com.yashwanth.ai_exam_system.repository.CertificateRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class CertificateService {

    private final CertificateRepository certificateRepository;
    private final QrCodeService qrCodeService;

    public CertificateService(CertificateRepository certificateRepository,
                              QrCodeService qrCodeService) {
        this.certificateRepository = certificateRepository;
        this.qrCodeService = qrCodeService;
    }

    public byte[] generateCertificate(
            Long studentId,
            String studentName,
            String examCode,
            String examTitle,
            double score
    ) {

        String grade = calculateGrade(score);
        String certificateId = UUID.randomUUID().toString();

        String verifyUrl = "http://localhost:8080/api/certificate/verify/" + certificateId;

        byte[] qrImage = qrCodeService.generateQRCode(verifyUrl);

        Certificate cert = new Certificate();
        cert.setCertificateId(certificateId);
        cert.setStudentId(studentId);
        cert.setStudentName(studentName);
        cert.setExamCode(examCode);
        cert.setExamTitle(examTitle);
        cert.setScore(score);
        cert.setGrade(grade);
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

        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();

            Document document = new Document(PageSize.A4.rotate());
            PdfWriter.getInstance(document, out);

            document.open();

            Font titleFont = new Font(Font.TIMES_ROMAN, 32, Font.BOLD);
            Font nameFont = new Font(Font.HELVETICA, 26, Font.BOLD);
            Font bodyFont = new Font(Font.HELVETICA, 18);

            Paragraph title = new Paragraph("Certificate of Achievement", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);

            Paragraph name = new Paragraph(cert.getStudentName(), nameFont);
            name.setAlignment(Element.ALIGN_CENTER);

            Paragraph content = new Paragraph(
                    "\nSuccessfully completed\n\n" +
                    cert.getExamTitle() +
                    "\n\nScore: " + cert.getScore() +
                    " | Grade: " + cert.getGrade(),
                    bodyFont
            );
            content.setAlignment(Element.ALIGN_CENTER);

            Image qr = Image.getInstance(qrImage);
            qr.scaleAbsolute(100, 100);

            document.add(title);
            document.add(new Paragraph("\n"));
            document.add(name);
            document.add(content);
            document.add(new Paragraph("\nCertificate ID: " + cert.getCertificateId()));
            document.add(qr);

            document.close();

            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("PDF generation failed", e);
        }
    }
}