package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.Certificate;
import com.yashwanth.ai_exam_system.entity.StudentProfile;
import com.yashwanth.ai_exam_system.repository.CertificateRepository;
import com.yashwanth.ai_exam_system.repository.ExamResultRepository;
import com.yashwanth.ai_exam_system.repository.StudentProfileRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CertificateServiceTest {

    @Mock
    private CertificateRepository certificateRepository;

    @Mock
    private ExamResultRepository examResultRepository;

    @Mock
    private QrCodeService qrCodeService;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private StudentNotificationService studentNotificationService;

    private CertificateService certificateService;

    @BeforeEach
    void setUp() {
        certificateService = new CertificateService(
                certificateRepository,
                examResultRepository,
                qrCodeService,
                studentProfileRepository,
                userRepository,
                emailService,
                studentNotificationService,
                "http://localhost:8080"
        );
    }

    @Test
    void generateCertificateHandlesEmailFailureGracefully() throws Exception {
        Long studentId = 1L;
        String examCode = "EXAM101";
        String examTitle = "Java Fundamentals";
        double score = 85.0;

        StudentProfile profile = new StudentProfile();
        profile.setUserId(studentId);
        profile.setFullName("Test Student");
        profile.setEmail("student@test.com");
        profile.setCollegeName("Test College");
        profile.setDepartment("CS");

        when(studentProfileRepository.findByUserId(studentId)).thenReturn(Optional.of(profile));
        when(certificateRepository.findByStudentIdAndExamCode(studentId, examCode)).thenReturn(Optional.empty());
        when(certificateRepository.saveAndFlush(any(Certificate.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(qrCodeService.generateQRCode(anyString())).thenReturn(new byte[]{1, 2, 3});

        doThrow(new RuntimeException("Mail server down"))
                .when(emailService).sendCertificateEmail(anyString(), anyString(), anyString(), any());

        byte[] pdf = certificateService.generateCertificate(studentId, examCode, examTitle, score, "http://localhost:8080");

        assertThat(pdf).isNotNull();
        verify(emailService, times(1)).sendCertificateEmail(eq("student@test.com"), eq("Test Student"), anyString(), any());
    }
}
