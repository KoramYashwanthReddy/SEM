package com.yashwanth.ai_exam_system.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Async Certificate Email
     */
    @Async
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

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("🎓 Certificate Issued - " + certificateId);

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
            // DO NOT throw — avoid breaking certificate generation
            System.out.println("Email sending failed: " + e.getMessage());
        }
    }
}