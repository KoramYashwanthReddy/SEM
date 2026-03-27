package com.yashwanth.ai_exam_system.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log =
            LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /*
     * ================================
     * GENERIC EMAIL SENDER
     * ================================
     */
    @Async
    public void sendEmail(
            String to,
            String subject,
            String htmlContent
    ) {
        try {

            MimeMessage message = mailSender.createMimeMessage();

            MimeMessageHelper helper =
                    new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);

        } catch (Exception e) {
            log.error("Failed to send email to {} : {}", to, e.getMessage(), e);
        }
    }

    /*
     * ================================
     * CERTIFICATE EMAIL
     * ================================
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
                    new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("🎓 Certificate Issed - " + certificateId);

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
            log.error("Certificate email failed for {} : {}", toEmail, e.getMessage(), e);
        }
    }

    /*
     * ================================
     * FORGOT PASSWORD EMAIL
     * ================================
     */
    @Async
    public void sendPasswordResetEmail(
            String toEmail,
            String resetLink
    ) {

        String subject = "🔐 Password Reset - AI Exam System";

        String content =
                "<div style='font-family:Arial,sans-serif;padding:20px'>" +
                "<h2>Password Reset Request</h2>" +
                "<p>You requested to reset your password.</p>" +
                "<p>Click the button below:</p>" +
                "<br>" +
                "<a href='" + resetLink + "' " +
                "style='background:#2563eb;color:white;padding:10px 20px;" +
                "text-decoration:none;border-radius:5px'>Reset Password</a>" +
                "<br><br>" +
                "<p>This link expires in 15 minutes.</p>" +
                "<p>If you did not request this, ignore this email.</p>" +
                "<br>" +
                "<p>Regards,<br><b>AI Exam System</b></p>" +
                "</div>";

        sendEmail(toEmail, subject, content);
    }
}