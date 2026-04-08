package com.yashwanth.ai_exam_system.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final AdminNotificationService adminNotificationService;
    private final TeacherNotificationService teacherNotificationService;

    public NotificationService(SimpMessagingTemplate messagingTemplate,
                               AdminNotificationService adminNotificationService,
                               TeacherNotificationService teacherNotificationService) {
        this.messagingTemplate = messagingTemplate;
        this.adminNotificationService = adminNotificationService;
        this.teacherNotificationService = teacherNotificationService;
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

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "STUDENT_WARNING");
        payload.put("message", message);
        payload.put("timestamp", System.currentTimeMillis());

        messagingTemplate.convertAndSend(
                "/topic/student/" + studentId,
                payload
        );

        System.out.println("STUDENT WARNING: " + message);
    }

    // ================= EXAM CANCELLED ALERT =================
    public void notifyExamCancelled(Long studentId, String message) {

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "EXAM_CANCELLED");
        payload.put("message", message);
        payload.put("timestamp", System.currentTimeMillis());

        adminNotificationService.createNotification(
                "CHEATING",
                "Exam Cancelled",
                message,
                "Proctoring Engine",
                "critical",
                null
        );

        messagingTemplate.convertAndSend(
                "/topic/student/" + studentId,
                payload
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
