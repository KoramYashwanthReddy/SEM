package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import com.yashwanth.ai_exam_system.service.StudentNotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/student/notifications")
@PreAuthorize("hasRole('STUDENT')")
public class StudentNotificationController {

    private final StudentNotificationService notificationService;
    private final UserRepository userRepository;

    public StudentNotificationController(StudentNotificationService notificationService,
                                         UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getNotifications(Authentication auth) {
        Long studentId = resolveStudentId(auth);
        Map<String, Object> response = new HashMap<>();
        response.put("data", notificationService.getNotifications(studentId));
        response.put("unreadCount", notificationService.getUnreadCount(studentId));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(Authentication auth) {
        Long studentId = resolveStudentId(auth);
        Map<String, Object> response = new HashMap<>();
        response.put("count", notificationService.getUnreadCount(studentId));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Map<String, Object>> markRead(@PathVariable Long id, Authentication auth) {
        Long studentId = resolveStudentId(auth);
        Map<String, Object> response = new HashMap<>();
        response.put("data", notificationService.markRead(studentId, id));
        response.put("unreadCount", notificationService.getUnreadCount(studentId));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllRead(Authentication auth) {
        Long studentId = resolveStudentId(auth);
        int updated = notificationService.markAllRead(studentId);
        Map<String, Object> response = new HashMap<>();
        response.put("updated", updated);
        response.put("unreadCount", notificationService.getUnreadCount(studentId));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(@PathVariable Long id, Authentication auth) {
        Long studentId = resolveStudentId(auth);
        notificationService.delete(studentId, id);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Notification deleted successfully");
        response.put("unreadCount", notificationService.getUnreadCount(studentId));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/clear")
    public ResponseEntity<Map<String, Object>> clear(Authentication auth) {
        Long studentId = resolveStudentId(auth);
        notificationService.clearAll(studentId);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Notifications cleared successfully");
        response.put("unreadCount", 0);
        return ResponseEntity.ok(response);
    }

    private Long resolveStudentId(Authentication auth) {
        String identifier = auth == null || auth.getName() == null ? "" : auth.getName().trim();
        if (identifier.isBlank()) {
            throw new ForbiddenException("Student authentication is required");
        }
        User user = userRepository.findByEmailIgnoreCase(identifier).orElse(null);
        if (user == null && identifier.matches("\\d+")) {
            user = userRepository.findById(Long.parseLong(identifier)).orElse(null);
        }
        if (user == null) {
            throw new ResourceNotFoundException("Authenticated student not found");
        }
        if (user.getRole() != Role.STUDENT) {
            throw new ForbiddenException("Only students can access student notifications");
        }
        return user.getId();
    }
}
