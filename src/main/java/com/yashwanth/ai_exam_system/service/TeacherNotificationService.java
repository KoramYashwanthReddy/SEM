package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.TeacherNotification;
import com.yashwanth.ai_exam_system.repository.TeacherNotificationRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class TeacherNotificationService {

    private final TeacherNotificationRepository repository;
    private final SimpMessagingTemplate messagingTemplate;

    public TeacherNotificationService(TeacherNotificationRepository repository,
                                      SimpMessagingTemplate messagingTemplate) {
        this.repository = repository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public TeacherNotification createNotification(String recipientKey,
                                                  String category,
                                                  String title,
                                                  String message,
                                                  String source,
                                                  String severity,
                                                  String targetUrl) {
        TeacherNotification notification = new TeacherNotification();
        notification.setRecipientKey(normalizeRecipient(recipientKey));
        notification.setCategory(normalizeCategory(category));
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setSource(source);
        notification.setSeverity(severity);
        notification.setTargetUrl(targetUrl);
        notification.setUnread(true);

        TeacherNotification saved = repository.save(notification);
        messagingTemplate.convertAndSend(
                "/topic/teacher/" + saved.getRecipientKey(),
                toPayload(saved)
        );
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getNotifications(String recipientKey) {
        String key = normalizeRecipient(recipientKey);
        return repository.findByRecipientKeyIgnoreCaseOrderByCreatedAtDesc(key)
                .stream()
                .map(this::toPayload)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String recipientKey) {
        return repository.countByRecipientKeyIgnoreCaseAndUnreadTrue(normalizeRecipient(recipientKey));
    }

    @Transactional
    public Map<String, Object> markRead(String recipientKey, Long id) {
        TeacherNotification notification = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        if (!normalizeRecipient(recipientKey).equalsIgnoreCase(normalizeRecipient(notification.getRecipientKey()))) {
            throw new RuntimeException("Notification does not belong to this teacher");
        }
        notification.markRead();
        repository.save(notification);
        return toPayload(notification);
    }

    @Transactional
    public int markAllRead(String recipientKey) {
        List<TeacherNotification> unread = repository.findByRecipientKeyIgnoreCaseAndUnreadTrueOrderByCreatedAtDesc(normalizeRecipient(recipientKey));
        unread.forEach(TeacherNotification::markRead);
        repository.saveAll(unread);
        return unread.size();
    }

    @Transactional
    public void delete(String recipientKey, Long id) {
        TeacherNotification notification = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        if (!normalizeRecipient(recipientKey).equalsIgnoreCase(normalizeRecipient(notification.getRecipientKey()))) {
            throw new RuntimeException("Notification does not belong to this teacher");
        }
        repository.delete(notification);
    }

    @Transactional
    public void clearAll(String recipientKey) {
        repository.findByRecipientKeyIgnoreCaseOrderByCreatedAtDesc(normalizeRecipient(recipientKey))
                .forEach(repository::delete);
    }

    private Map<String, Object> toPayload(TeacherNotification notification) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", notification.getId());
        payload.put("recipientKey", notification.getRecipientKey());
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

    private String normalizeRecipient(String recipientKey) {
        return recipientKey == null ? "" : recipientKey.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeCategory(String category) {
        if (category == null || category.trim().isEmpty()) {
            return "SYSTEM";
        }
        String value = category.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (value) {
            case "EXAM", "EXAMS" -> "EXAM";
            case "CHEAT", "CHEATING", "PROCTORING" -> "CHEATING";
            case "CERT", "CERTIFICATE", "CERTIFICATES" -> "CERTIFICATE";
            case "USER", "USERS" -> "USER";
            case "SYSTEM", "GENERAL", "NOTICE" -> "SYSTEM";
            default -> value;
        };
    }
}
