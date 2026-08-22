package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import com.yashwanth.ai_exam_system.service.ProctoringEventService;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/proctoring/events")
public class ProctoringEventController {

    private static final Logger logger =
            LoggerFactory.getLogger(ProctoringEventController.class);

    private final ProctoringEventService eventService;
    private final ExamAttemptRepository attemptRepository;
    private final UserRepository userRepository;

    public ProctoringEventController(ProctoringEventService eventService,
                                     ExamAttemptRepository attemptRepository,
                                     UserRepository userRepository) {
        this.eventService = eventService;
        this.attemptRepository = attemptRepository;
        this.userRepository = userRepository;
    }

    // =========================================================
    // 🚀 LIVE EVENT LOGGING
    // =========================================================
    @PostMapping("/log")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> logEvent(
            @Valid @RequestBody ProctoringEvent event,
            Authentication auth) {

        Long studentId = resolveAuthenticatedStudentId(auth);
        if (event.getAttemptId() != null) {
            ExamAttempt attempt = attemptRepository.findById(event.getAttemptId())
                    .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
            if (!studentId.equals(attempt.getStudentId())) {
                throw new ForbiddenException("You can only log proctoring events for your own attempt");
            }
        }

        ProctoringEvent saved = eventService.logEvent(event);

        logger.info("Proctoring event logged | attempt={} | type={}",
                event.getAttemptId(), event.getEventType());

        return success("Event logged successfully", saved);
    }

    // =========================================================
    // 📊 COUNT EVENTS
    // =========================================================
    @GetMapping("/count/{attemptId}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> countEvents(
            @PathVariable Long attemptId) {

        long count = eventService.countEvents(attemptId);

        Map<String, Object> data = new HashMap<>();
        data.put("count", count);

        return success("Event count fetched", data);
    }

    // =========================================================
    // 🚨 COUNT BY TYPE
    // =========================================================
    @GetMapping("/count/{attemptId}/{type}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> countByType(
            @PathVariable Long attemptId,
            @PathVariable String type) {

        long count = eventService.countByType(attemptId, type);

        Map<String, Object> data = new HashMap<>();
        data.put("type", type);
        data.put("count", count);

        return success("Event type count fetched", data);
    }

    // =========================================================
    // 🔥 FORCE AI ANALYSIS
    // =========================================================
    @PostMapping("/analyze/{attemptId}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> triggerAnalysis(
            @PathVariable Long attemptId) {

        eventService.triggerAnalysis(attemptId);

        return success("AI analysis triggered");
    }

    // =========================================================
    // ✅ COMMON SUCCESS RESPONSE
    // =========================================================
    private ResponseEntity<Map<String, Object>> success(String message) {

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", message);

        return ResponseEntity.ok(response);
    }

    private ResponseEntity<Map<String, Object>> success(
            String message,
            Object data) {

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", message);
        response.put("data", data);

        return ResponseEntity.ok(response);
    }

    private Long resolveAuthenticatedStudentId(Authentication auth) {
        String identifier = auth == null || auth.getName() == null ? "" : auth.getName().trim();
        if (identifier.isBlank()) {
            throw new ForbiddenException("Authentication required");
        }
        User user = userRepository.findByEmailIgnoreCase(identifier).orElse(null);
        if (user == null && identifier.matches("\\d+")) {
            user = userRepository.findById(Long.valueOf(identifier)).orElse(null);
        }
        if (user == null) {
            throw new ResourceNotFoundException("Authenticated student not found");
        }
        if (user.getRole() != Role.STUDENT) {
            throw new ForbiddenException("Only students can log proctoring events");
        }
        return user.getId();
    }
}