package com.yashwanth.ai_exam_system.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void notifyAdmin(String message) {

        // 🔥 SEND REAL-TIME ALERT TO ADMIN DASHBOARD
        messagingTemplate.convertAndSend("/topic/admin-alerts", message);

        // ✅ Fallback log (important for debugging)
        System.out.println("ADMIN ALERT 🚨: " + message);
    }
}