package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.StudentNotification;
import com.yashwanth.ai_exam_system.repository.StudentNotificationRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class StudentNotificationService {

    private final StudentNotificationRepository repository;
    private final SimpMessagingTemplate messagingTemplate;

    public StudentNotificationService(StudentNotificationRepository repository,
                                      SimpMessagingTemplate messagingTemplate) {
        this.repository = repository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public StudentNotification createNotification(Long studentId,
                                                  String type,
                                                  String title,
                                                  String message,
                                                  String source,
                                                  String severity,
                                                  String targetUrl) {
        if (studentId == null) {
            throw new IllegalArgumentException("Student ID is required");
        }

        StudentNotification notification = new StudentNotification();
        notification.setStudentId(studentId);
        notification.setType(normalizeType(type));
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setSource(source);
        notification.setSeverity(severity);
        notification.setTargetUrl(targetUrl);
        notification.setUnread(true);

        StudentNotification saved = repository.save(notification);
        messagingTemplate.convertAndSend("/topic/student/" + saved.getStudentId(), toPayload(saved));
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getNotifications(Long studentId) {
        return repository.findByStudentIdOrderByCreatedAtDesc(studentId).stream()
                .map(this::toPayload)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long studentId) {
        return repository.countByStudentIdAndUnreadTrue(studentId);
    }

    @Transactional
    public Map<String, Object> markRead(Long studentId, Long id) {
        StudentNotification notification = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        ensureOwnership(studentId, notification);
        notification.markRead();
        repository.save(notification);
        return toPayload(notification);
    }

    @Transactional
    public int markAllRead(Long studentId) {
        List<StudentNotification> unread = repository.findByStudentIdAndUnreadTrueOrderByCreatedAtDesc(studentId);
        unread.forEach(StudentNotification::markRead);
        repository.saveAll(unread);
        return unread.size();
    }

    @Transactional
    public void delete(Long studentId, Long id) {
        StudentNotification notification = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        ensureOwnership(studentId, notification);
        repository.delete(notification);
    }

    @Transactional
    public void clearAll(Long studentId) {
        repository.findByStudentIdOrderByCreatedAtDesc(studentId)
                .forEach(repository::delete);
    }

    private void ensureOwnership(Long studentId, StudentNotification notification) {
        if (studentId == null || notification.getStudentId() == null || !studentId.equals(notification.getStudentId())) {
            throw new RuntimeException("Notification does not belong to this student");
        }
    }

    private Map<String, Object> toPayload(StudentNotification notification) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", notification.getId());
        payload.put("studentId", notification.getStudentId());
        payload.put("type", notification.getType() == null ? "system" : notification.getType().toLowerCase(Locale.ROOT));
        payload.put("title", notification.getTitle());
        payload.put("message", notification.getMessage());
        payload.put("desc", notification.getMessage());
        payload.put("source", notification.getSource());
        payload.put("severity", notification.getSeverity());
        payload.put("targetUrl", notification.getTargetUrl());
        payload.put("unread", Boolean.TRUE.equals(notification.getUnread()));
        payload.put("timestamp", notification.getCreatedAt());
        payload.put("readAt", notification.getReadAt());
        return payload;
    }

    private String normalizeType(String type) {
        if (type == null || type.trim().isEmpty()) {
            return "SYSTEM";
        }
        String value = type.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (value) {
            case "EXAM", "EXAMS", "EXAM_ALERT", "EXAM_STARTED", "EXAM_REGISTERED", "REGISTRATION" -> "EXAM";
            case "RESULT", "RESULTS", "RESULT_READY", "RESULT_AVAILABLE", "RESULT_PENDING" -> "RESULT";
            case "CERT", "CERTIFICATE", "CERTIFICATES", "CERTIFICATE_ISSUED" -> "CERTIFICATE";
            case "CHEAT", "CHEATING", "PROCTORING", "WARNING", "STUDENT_WARNING", "EXAM_CANCELLED" -> "CHEATING";
            case "SYSTEM", "GENERAL", "NOTICE" -> "SYSTEM";
            case "ACCOUNT", "AUTH", "PROFILE" -> "SYSTEM";
            default -> value;
        };
    }
}
