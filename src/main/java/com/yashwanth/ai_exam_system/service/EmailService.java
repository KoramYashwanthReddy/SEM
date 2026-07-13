package com.yashwanth.ai_exam_system.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log =
            LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${app.email.from-name:AI Exam System}")
    private String fromName;

    @Value("${app.email.enabled:true}")
    private boolean emailEnabled;

    @Value("${app.email.max-retries:3}")
    private int maxRetries;

    @Value("${app.email.retry-delay-ms:500}")
    private long retryDelayMs;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async("mailExecutor")
    public void sendEmail(String to, String subject, String htmlContent) {
        if (!emailEnabled) {
            log.info("Email disabled. Skipping message to {}", to);
            return;
        }
        if (to == null || to.isBlank()) {
            log.warn("Skipping email with empty recipient, subject={}", subject);
            return;
        }

        Exception lastError = null;
        int attempts = Math.max(1, maxRetries);
        for (int attempt = 1; attempt <= attempts; attempt++) {
            try {
                sendNow(to.trim(), subject, htmlContent);
                return;
            } catch (MailSendException mailSendException) {
                lastError = mailSendException;
                log.warn("Mail send attempt {} of {} failed for {}: {}",
                        attempt, attempts, to, mailSendException.getMessage());
            } catch (Exception e) {
                lastError = e;
                log.warn("Email attempt {} of {} failed for {}: {}",
                        attempt, attempts, to, e.getMessage());
            }

            if (attempt < attempts && retryDelayMs > 0) {
                sleepQuietly(retryDelayMs);
            }
        }

        log.error("Failed to send email to {} after {} attempts",
                to, attempts, lastError);
    }

    private void sendNow(String to, String subject, String htmlContent) throws Exception {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper =
                    new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(resolveFromEmail(), fromName);
            helper.setTo(to);
            helper.setSubject(subject == null ? "AI Exam System Notification" : subject);
            helper.setText(htmlContent == null ? "" : htmlContent, true);

            mailSender.send(message);
        } catch (Exception e) {
            log.error("sendNow failed for {}: {}", to, e.getMessage());
            throw e;
        }
    }

    @Async("mailExecutor")
    public void sendCertificateEmail(
            String toEmail,
            String studentName,
            String certificateId,
            byte[] pdfData
    ) {
        if (!emailEnabled) {
            log.info("Email disabled. Skipping certificate message to {}", toEmail);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper =
                    new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(resolveFromEmail(), fromName);
            helper.setTo(toEmail);
            helper.setSubject("Certificate Issued - " + certificateId);

            String emailContent =
                    "<div style='font-family:Arial,sans-serif;padding:20px'>" +
                            "<h2>Congratulations " + studentName + "</h2>" +
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

    @Async("mailExecutor")
    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        if (!emailEnabled) {
            log.info("Email disabled. Skipping password reset message to {}", toEmail);
            return;
        }

        String subject = "Password Reset - AI Exam System";

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

    @Async("mailExecutor")
    public void sendSignupOtpEmail(
            String toEmail,
            String recipientName,
            String otp,
            int expiryMinutes
    ) {
        if (!emailEnabled) {
            log.info("Email disabled. Skipping signup OTP message to {}", toEmail);
            return;
        }

        String subject = "Your SEM Signup Verification Code";
        String safeName = recipientName == null || recipientName.isBlank() ? "Student" : recipientName;

        String content =
                "<div style='font-family:Arial,sans-serif;padding:20px'>" +
                        "<h2>Welcome to SEM, " + safeName + "</h2>" +
                        "<p>Your verification code is:</p>" +
                        "<div style='font-size:28px;font-weight:bold;letter-spacing:6px;margin:20px 0'>" + otp + "</div>" +
                        "<p>This code expires in " + expiryMinutes + " minutes.</p>" +
                        "<p>If you did not request this signup, you can safely ignore this email.</p>" +
                        "<br>" +
                        "<p>Regards,<br><b>AI Exam System</b></p>" +
                        "</div>";

        sendEmail(toEmail, subject, content);
    }

    @Async("mailExecutor")
    public void sendPhase2VerificationEmail(
            String toEmail,
            String recipientName,
            String examTitle,
            String examCode,
            String otp,
            String verificationLink,
            int expiryMinutes
    ) {
        if (!emailEnabled) {
            log.info("Email disabled. Skipping phase 2 verification message to {}", toEmail);
            return;
        }

        String subject = "Phase 2 Verification - " + examCode;
        String safeName = recipientName == null || recipientName.isBlank() ? "Student" : recipientName;
        String safeExamTitle = examTitle == null || examTitle.isBlank() ? examCode : examTitle;

        String content =
                "<div style='font-family:Arial,sans-serif;padding:20px'>" +
                        "<h2>Phase 2 verification for " + safeExamTitle + "</h2>" +
                        "<p>Hello " + safeName + ",</p>" +
                        "<p>Your Phase 2 verification code is:</p>" +
                        "<div style='font-size:28px;font-weight:bold;letter-spacing:6px;margin:20px 0'>" + otp + "</div>" +
                        "<p>This code expires in " + expiryMinutes + " minutes.</p>" +
                        "<p>You can also complete verification using the secure link below:</p>" +
                        "<p><a href='" + verificationLink + "' " +
                        "style='background:#4f46e5;color:white;padding:12px 18px;text-decoration:none;border-radius:6px;display:inline-block'>Verify Phase 2 Registration</a></p>" +
                        "<p>If the button does not open, copy this link into your browser:</p>" +
                        "<p style='word-break:break-all'><a href='" + verificationLink + "'>" + verificationLink + "</a></p>" +
                        "<p>If you did not request this registration, you can ignore this email.</p>" +
                        "<br>" +
                        "<p>Regards,<br><b>AI Exam System</b></p>" +
                        "</div>";

        sendEmail(toEmail, subject, content);
    }

    private String resolveFromEmail() {
        return fromEmail == null || fromEmail.isBlank()
                ? "no-reply@ai-exam-system.local"
                : fromEmail.trim();
    }

    private void sleepQuietly(long delayMs) {
        try {
            Thread.sleep(delayMs);
        } catch (InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
        }
    }
}
