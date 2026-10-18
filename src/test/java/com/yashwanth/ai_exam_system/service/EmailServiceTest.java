package com.yashwanth.ai_exam_system.service;

import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailService emailService;

    @Mock
    private MimeMessage mimeMessage;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "fromEmail", "no-reply@ai-exam-system.local");
        ReflectionTestUtils.setField(emailService, "fromName", "AI Exam System");
        ReflectionTestUtils.setField(emailService, "maxRetries", 1);
        ReflectionTestUtils.setField(emailService, "retryDelayMs", 0L);
    }

    @Test
    void sendEmail_whenEmailDisabled_shouldNotSendEmail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendEmail("user@example.com", "Test Subject", "<p>Test Content</p>");

        verifyNoInteractions(mailSender);
    }

    @Test
    void sendCertificateEmail_whenEmailDisabled_shouldNotSendEmail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendCertificateEmail("user@example.com", "John Doe", "CERT123", new byte[]{1, 2, 3});

        verifyNoInteractions(mailSender);
    }

    @Test
    void sendPasswordResetEmail_whenEmailDisabled_shouldNotSendEmail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendPasswordResetEmail("user@example.com", "http://example.com/reset");

        verifyNoInteractions(mailSender);
    }

    @Test
    void sendSignupOtpEmail_whenEmailDisabled_shouldNotSendEmail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendSignupOtpEmail("user@example.com", "John Doe", "123456", 15);

        verifyNoInteractions(mailSender);
    }

    @Test
    void sendPhase2VerificationEmail_whenEmailDisabled_shouldNotSendEmail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendPhase2VerificationEmail(
                "user@example.com", "John Doe", "Math Exam", "MATH101", "123456", "http://example.com/verify", 15
        );

        verifyNoInteractions(mailSender);
    }

    @Test
    void sendEmail_whenRecipientNullOrBlank_shouldNotSendEmail() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", true);

        emailService.sendEmail(null, "Test Subject", "<p>Test Content</p>");
        emailService.sendEmail("", "Test Subject", "<p>Test Content</p>");
        emailService.sendEmail("   ", "Test Subject", "<p>Test Content</p>");

        verifyNoInteractions(mailSender);
    }

    @Test
    void sendEmail_whenEmailEnabled_shouldSendEmailSuccessfully() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", true);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        emailService.sendEmail("user@example.com", "Test Subject", "<p>Test Content</p>");

        verify(mailSender, times(1)).createMimeMessage();
        verify(mailSender, times(1)).send(mimeMessage);
    }
}
