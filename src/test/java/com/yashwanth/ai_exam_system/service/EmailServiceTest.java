package com.yashwanth.ai_exam_system.service;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailService emailService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailService, "fromEmail", "test@ai-exam.local");
        ReflectionTestUtils.setField(emailService, "fromName", "AI Exam System Test");
        ReflectionTestUtils.setField(emailService, "emailEnabled", true);
        ReflectionTestUtils.setField(emailService, "maxRetries", 2);
        ReflectionTestUtils.setField(emailService, "retryDelayMs", 10L);
    }

    @Test
    @DisplayName("sendEmail should return immediately and not interact with mailSender when email is disabled")
    void sendEmail_WhenEmailDisabled_ShouldReturnImmediatelyAndNotCallMailSender() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendEmail("user@example.com", "Test Subject", "<p>Test Content</p>");

        verifyNoInteractions(mailSender);
    }

    @Test
    @DisplayName("sendCertificateEmail should return immediately and not interact with mailSender when email is disabled")
    void sendCertificateEmail_WhenEmailDisabled_ShouldReturnImmediatelyAndNotCallMailSender() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendCertificateEmail("user@example.com", "John Doe", "CERT-123", new byte[]{1, 2, 3});

        verifyNoInteractions(mailSender);
    }

    @Test
    @DisplayName("sendPasswordResetEmail should return immediately and not interact with mailSender when email is disabled")
    void sendPasswordResetEmail_WhenEmailDisabled_ShouldReturnImmediatelyAndNotCallMailSender() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendPasswordResetEmail("user@example.com", "https://reset-link.com");

        verifyNoInteractions(mailSender);
    }

    @Test
    @DisplayName("sendSignupOtpEmail should return immediately and not interact with mailSender when email is disabled")
    void sendSignupOtpEmail_WhenEmailDisabled_ShouldReturnImmediatelyAndNotCallMailSender() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendSignupOtpEmail("user@example.com", "Jane Doe", "123456", 15);

        verifyNoInteractions(mailSender);
    }

    @Test
    @DisplayName("sendPhase2VerificationEmail should return immediately and not interact with mailSender when email is disabled")
    void sendPhase2VerificationEmail_WhenEmailDisabled_ShouldReturnImmediatelyAndNotCallMailSender() {
        ReflectionTestUtils.setField(emailService, "emailEnabled", false);

        emailService.sendPhase2VerificationEmail(
                "user@example.com",
                "Jane Doe",
                "Math Exam",
                "EXAM-101",
                "654321",
                "https://verify-link.com",
                15
        );

        verifyNoInteractions(mailSender);
    }

    @Test
    @DisplayName("sendEmail should not send email when recipient is null or blank")
    void sendEmail_WhenRecipientNullOrBlank_ShouldNotCallMailSender() {
        emailService.sendEmail(null, "Subject", "Content");
        emailService.sendEmail("   ", "Subject", "Content");

        verifyNoInteractions(mailSender);
    }

    @Test
    @DisplayName("sendEmail should create and send MimeMessage when email is enabled")
    void sendEmail_WhenEmailEnabled_ShouldSendEmail() {
        MimeMessage mimeMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        emailService.sendEmail("user@example.com", "Subject", "<p>Hello</p>");

        verify(mailSender, times(1)).createMimeMessage();
        verify(mailSender, times(1)).send(mimeMessage);
    }

    @Test
    @DisplayName("sendEmail should retry up to maxRetries on failure when email is enabled")
    void sendEmail_WhenSendingFails_ShouldRetryUpToMaxRetries() {
        MimeMessage mimeMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doThrow(new MailSendException("SMTP server down")).when(mailSender).send(any(MimeMessage.class));

        emailService.sendEmail("user@example.com", "Subject", "<p>Hello</p>");

        verify(mailSender, times(2)).createMimeMessage();
        verify(mailSender, times(2)).send(mimeMessage);
    }
}
