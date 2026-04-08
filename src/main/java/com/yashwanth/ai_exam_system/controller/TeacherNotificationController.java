package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.service.TeacherNotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/teacher/notifications")
@PreAuthorize("hasRole('TEACHER')")
public class TeacherNotificationController {

    private final TeacherNotificationService notificationService;

    public TeacherNotificationController(TeacherNotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getNotifications(
            org.springframework.security.core.Authentication auth) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("data", notificationService.getNotifications(auth.getName()));
        response.put("unreadCount", notificationService.getUnreadCount(auth.getName()));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(
            org.springframework.security.core.Authentication auth) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("count", notificationService.getUnreadCount(auth.getName()));
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createNotification(
            org.springframework.security.core.Authentication auth,
            @RequestBody Map<String, Object> payload) {
        String message = String.valueOf(payload.getOrDefault("message", payload.getOrDefault("text", "")));
        String category = String.valueOf(payload.getOrDefault("category", "SYSTEM"));
        String title = String.valueOf(payload.getOrDefault("title", message));
        String source = String.valueOf(payload.getOrDefault("source", "Teacher Console"));
        String severity = String.valueOf(payload.getOrDefault("severity", "info"));
        String targetUrl = payload.get("targetUrl") != null ? String.valueOf(payload.get("targetUrl")) : null;

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("data", notificationService.createNotification(
                auth.getName(),
                category,
                title,
                message,
                source,
                severity,
                targetUrl
        ));
        response.put("unreadCount", notificationService.getUnreadCount(auth.getName()));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Map<String, Object>> markRead(
            org.springframework.security.core.Authentication auth,
            @PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("data", notificationService.markRead(auth.getName(), id));
        response.put("unreadCount", notificationService.getUnreadCount(auth.getName()));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllRead(
            org.springframework.security.core.Authentication auth) {
        int updated = notificationService.markAllRead(auth.getName());
        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("updated", updated);
        response.put("unreadCount", notificationService.getUnreadCount(auth.getName()));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteNotification(
            org.springframework.security.core.Authentication auth,
            @PathVariable Long id) {
        notificationService.delete(auth.getName(), id);
        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "Notification deleted successfully");
        response.put("unreadCount", notificationService.getUnreadCount(auth.getName()));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/clear")
    public ResponseEntity<Map<String, Object>> clearNotifications(
            org.springframework.security.core.Authentication auth) {
        notificationService.clearAll(auth.getName());
        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "Notifications cleared successfully");
        response.put("unreadCount", 0);
        return ResponseEntity.ok(response);
    }
}
