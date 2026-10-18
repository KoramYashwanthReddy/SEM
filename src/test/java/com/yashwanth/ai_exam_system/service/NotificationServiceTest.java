package com.yashwanth.ai_exam_system.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private AdminNotificationService adminNotificationService;

    @Mock
    private TeacherNotificationService teacherNotificationService;

    @Mock
    private StudentNotificationService studentNotificationService;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    void notifyAdminWithDefaultParameters() {
        notificationService.notifyAdmin("System alert test");

        verify(adminNotificationService).createNotification(
                "SYSTEM",
                "Admin Alert",
                "System alert test",
                "System",
                "high",
                null
        );
    }

    @Test
    void notifyAdminWithCustomParameters() {
        notificationService.notifyAdmin("SECURITY", "Breach Warning", "Unauthorized access", "AuthModule", "critical");

        verify(adminNotificationService).createNotification(
                "SECURITY",
                "Breach Warning",
                "Unauthorized access",
                "AuthModule",
                "critical",
                null
        );
    }

    @Test
    void notifyStudentWithDefaultParameters() {
        notificationService.notifyStudent(123L, "Warning test message");

        verify(studentNotificationService).createNotification(
                123L,
                "STUDENT_WARNING",
                "Student Warning",
                "Warning test message",
                null,
                "medium",
                null
        );
    }

    @Test
    void notifyStudentWithMetadata() {
        Map<String, Object> metadata = new HashMap<>();
        metadata.getOrDefault("source", null);
        metadata.put("source", "ExamModule");
        metadata.put("targetUrl", "/exams/1");

        notificationService.notifyStudent(123L, "EXAM_REMINDER", "Exam Starting", "Your exam starts in 5 minutes", "high", metadata);

        verify(studentNotificationService).createNotification(
                123L,
                "EXAM_REMINDER",
                "Exam Starting",
                "Your exam starts in 5 minutes",
                "ExamModule",
                "high",
                "/exams/1"
        );
    }

    @Test
    void notifyExamCancelled() {
        notificationService.notifyExamCancelled(456L, "Cheating detected during exam");

        verify(adminNotificationService).createNotification(
                "CHEATING",
                "Exam Cancelled",
                "Cheating detected during exam",
                "Proctoring Engine",
                "critical",
                null
        );

        verify(studentNotificationService).createNotification(
                456L,
                "EXAM_CANCELLED",
                "Exam Cancelled",
                "Cheating detected during exam",
                null,
                "critical",
                null
        );
    }

    @Test
    void notifyTeacher() {
        notificationService.notifyTeacher("TCH-1001", "EXAM_SUBMISSION", "Exam Submitted", "Student submitted exam", "Proctoring", "low");

        verify(teacherNotificationService).createNotification(
                "TCH-1001",
                "EXAM_SUBMISSION",
                "Exam Submitted",
                "Student submitted exam",
                "Proctoring",
                "low",
                null
        );
    }
}
