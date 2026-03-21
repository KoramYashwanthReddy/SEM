package com.yashwanth.ai_exam_system.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // =========================================================
    // 🚨 ADMIN ALERT
    // =========================================================
    public void notifyAdmin(String message) {

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "ADMIN_ALERT");
        payload.put("message", message);
        payload.put("timestamp", System.currentTimeMillis());

        messagingTemplate.convertAndSend("/topic/admin-alerts", payload);

        System.out.println("ADMIN ALERT 🚨: " + message);
    }

    // =========================================================
    // ⚠️ STUDENT WARNING (NEW)
    // =========================================================
    public void notifyStudent(Long studentId, String message) {

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "STUDENT_WARNING");
        payload.put("message", message);
        payload.put("timestamp", System.currentTimeMillis());

        messagingTemplate.convertAndSend(
                "/topic/student/" + studentId,
                payload
        );

        System.out.println("STUDENT WARNING ⚠️: " + message);
    }

    // =========================================================
    // ❌ EXAM CANCELLED ALERT (NEW)
    // =========================================================
    public void notifyExamCancelled(Long studentId, String message) {

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "EXAM_CANCELLED");
        payload.put("message", message);
        payload.put("timestamp", System.currentTimeMillis());

        messagingTemplate.convertAndSend(
                "/topic/student/" + studentId,
                payload
        );

        messagingTemplate.convertAndSend("/topic/admin-alerts", payload);

        System.out.println("EXAM CANCELLED ❌: " + message);
    }
}