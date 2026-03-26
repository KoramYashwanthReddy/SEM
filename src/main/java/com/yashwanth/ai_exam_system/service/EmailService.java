package com.yashwanth.ai_exam_system.service;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // PRODUCTION METHOD
    public void sendCertificateEmail(
            String toEmail,
            String studentName,
            String certificateId,
            byte[] pdfData
    ) {

        try {
            MimeMessage message = mailSender.createMimeMessage();

            MimeMessageHelper helper =
                    new MimeMessageHelper(message, true);

            helper.setTo(toEmail);
            helper.setSubject("🎓 Certificate Issued - " + certificateId);

            // HTML EMAIL TEMPLATE
            String emailContent =
                    "<div style='font-family:Arial,sans-serif;padding:20px'>" +
                    "<h2>Congratulations " + studentName + " 🎉</h2>" +
                    "<p>Your certificate has been successfully generated.</p>" +
                    "<p><b>Certificate ID:</b> " + certificateId + "</p>" +
                    "<p>Please find your certificate attached.</p>" +
                    "<br>" +
                    "<p>Regards,<br><b>AI Exam System</b></p>" +
                    "</div>";

            helper.setText(emailContent, true);

            helper.addAttachment(
                    "Certificate-" + certificateId + ".pdf",
                    new ByteArrayResource(pdfData)
            );

            mailSender.send(message);

        } catch (Exception e) {
            throw new RuntimeException("Certificate email sending failed", e);
        }
    }
}