package com.yashwanth.ai_exam_system.service;

import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
public class NotificationService {

    private final AdminNotificationService adminNotificationService;
    private final TeacherNotificationService teacherNotificationService;
    private final StudentNotificationService studentNotificationService;

    public NotificationService(AdminNotificationService adminNotificationService,
                               TeacherNotificationService teacherNotificationService,
                               StudentNotificationService studentNotificationService) {
        this.adminNotificationService = adminNotificationService;
        this.teacherNotificationService = teacherNotificationService;
        this.studentNotificationService = studentNotificationService;
    }

    // ================= ADMIN ALERT =================
    public void notifyAdmin(String message) {
        notifyAdmin("SYSTEM", "Admin Alert", message, "System", "high");
    }

    public void notifyAdmin(String category,
                            String title,
                            String message,
                            String source,
                            String severity) {

        adminNotificationService.createNotification(
                category,
                title,
                message,
                source,
                severity,
                null
        );

        System.out.println("ADMIN ALERT: " + message);
    }

    // ================= STUDENT WARNING =================
    public void notifyStudent(Long studentId, String message) {
        notifyStudent(studentId, "STUDENT_WARNING", "Student Warning", message, "medium", null);
    }

    public void notifyStudent(Long studentId,
                              String type,
                              String title,
                              String message,
                              String severity,
                              Map<String, Object> metadata) {
        String source = metadata == null ? null : stringValue(metadata.get("source"));
        String targetUrl = metadata == null ? null : stringValue(metadata.get("targetUrl"));
        studentNotificationService.createNotification(
                studentId,
                type,
                title,
                message,
                source,
                severity,
                targetUrl
        );

        System.out.println("STUDENT ALERT: " + title + " | " + message);
    }

    private String stringValue(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() || "null".equalsIgnoreCase(text) ? null : text;
    }

    // ================= EXAM CANCELLED ALERT =================
    public void notifyExamCancelled(Long studentId, String message) {
        adminNotificationService.createNotification(
                "CHEATING",
                "Exam Cancelled",
                message,
                "Proctoring Engine",
                "critical",
                null
        );

        notifyStudent(
                studentId,
                "EXAM_CANCELLED",
                "Exam Cancelled",
                message,
                "critical",
                null
        );

        System.out.println("EXAM CANCELLED: " + message);
    }

    // ================= TEACHER ALERT =================
    public void notifyTeacher(String recipientKey,
                              String category,
                              String title,
                              String message,
                              String source,
                              String severity) {

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", category);
        payload.put("title", title);
        payload.put("message", message);
        payload.put("source", source);
        payload.put("severity", severity);
        payload.put("timestamp", System.currentTimeMillis());

        teacherNotificationService.createNotification(
                recipientKey,
                category,
                title,
                message,
                source,
                severity,
                null
        );

        System.out.println("TEACHER ALERT: " + message);
    }
}
