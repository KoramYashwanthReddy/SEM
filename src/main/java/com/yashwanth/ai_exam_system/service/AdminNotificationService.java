package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.AdminNotification;
import com.yashwanth.ai_exam_system.repository.AdminNotificationRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AdminNotificationService {

    private final AdminNotificationRepository repository;
    private final SimpMessagingTemplate messagingTemplate;

    public AdminNotificationService(AdminNotificationRepository repository,
                                    SimpMessagingTemplate messagingTemplate) {
        this.repository = repository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public AdminNotification createNotification(String category,
                                                String title,
                                                String message,
                                                String source,
                                                String severity,
                                                String targetUrl) {
        AdminNotification notification = new AdminNotification();
        notification.setCategory(normalizeCategory(category));
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setSource(source);
        notification.setSeverity(severity);
        notification.setTargetUrl(targetUrl);
        notification.setUnread(true);

        AdminNotification saved = repository.save(notification);
        messagingTemplate.convertAndSend("/topic/admin-alerts", toPayload(saved));
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getNotifications(String category) {
        boolean allCategories = !hasText(category) || "all".equalsIgnoreCase(category);
        List<AdminNotification> notifications = !allCategories
                ? repository.findByCategoryIgnoreCaseOrderByCreatedAtDesc(normalizeCategory(category))
                : repository.findAllByOrderByCreatedAtDesc();
        return notifications.stream().map(this::toPayload).toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount() {
        return repository.countByUnreadTrue();
    }

    @Transactional
    public Map<String, Object> markRead(Long id) {
        AdminNotification notification = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.markRead();
        repository.save(notification);
        return toPayload(notification);
    }

    @Transactional
    public int markAllRead() {
        List<AdminNotification> unread = repository.findByUnreadTrueOrderByCreatedAtDesc();
        unread.forEach(AdminNotification::markRead);
        repository.saveAll(unread);
        return unread.size();
    }

    @Transactional
    public void delete(Long id) {
        repository.deleteById(id);
    }

    @Transactional
    public void clearAll() {
        repository.deleteAll();
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getCountsByCategory() {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("all", repository.count());
        counts.put("cheating", countByCategory("CHEATING"));
        counts.put("exam", countByCategory("EXAM"));
        counts.put("cert", countByCategory("CERTIFICATE"));
        counts.put("system", countByCategory("SYSTEM"));
        counts.put("user", countByCategory("USER"));
        return counts;
    }

    private Map<String, Object> toPayload(AdminNotification notification) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", notification.getId());
        payload.put("type", notification.getCategory() == null ? "system" : notification.getCategory().toLowerCase(Locale.ROOT));
        payload.put("title", notification.getTitle());
        payload.put("desc", notification.getMessage());
        payload.put("source", notification.getSource());
        payload.put("severity", notification.getSeverity());
        payload.put("targetUrl", notification.getTargetUrl());
        payload.put("unread", Boolean.TRUE.equals(notification.getUnread()));
        payload.put("timestamp", notification.getCreatedAt());
        payload.put("readAt", notification.getReadAt());
        return payload;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String normalizeCategory(String category) {
        if (!hasText(category)) {
            return "SYSTEM";
        }
        String value = category.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (value) {
            case "CERT", "CERTIFICATE", "CERTIFICATES" -> "CERTIFICATE";
            case "EXAM", "EXAMS" -> "EXAM";
            case "CHEAT", "CHEATING", "PROCTORING" -> "CHEATING";
            case "USER", "USERS" -> "USER";
            case "SYSTEM", "ADMIN", "GENERAL" -> "SYSTEM";
            default -> value;
        };
    }

    private long countByCategory(String category) {
        return repository.findByCategoryIgnoreCaseOrderByCreatedAtDesc(category).size();
    }
}
