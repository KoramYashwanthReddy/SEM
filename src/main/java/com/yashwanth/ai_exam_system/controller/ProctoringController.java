package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.ProctoringEventRequest;
import com.yashwanth.ai_exam_system.dto.ProctoringSummary;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import com.yashwanth.ai_exam_system.service.ProctoringService;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/proctoring")
public class ProctoringController {

    private final ProctoringService proctoringService;
    private final ExamAttemptRepository attemptRepository;
    private final UserRepository userRepository;

    public ProctoringController(ProctoringService proctoringService,
                                ExamAttemptRepository attemptRepository,
                                UserRepository userRepository) {
        this.proctoringService = proctoringService;
        this.attemptRepository = attemptRepository;
        this.userRepository = userRepository;
    }

    // =========================================================
    // 🔥 RECORD EVENT
    // =========================================================
    @PostMapping("/event")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Map<String, Object>> recordEvent(
            @Valid @RequestBody ProctoringEventRequest request,
            Authentication auth) {

        Long studentId = resolveAuthenticatedStudentId(auth);
        ExamAttempt attempt = attemptRepository.findById(request.getAttemptId())
                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found"));
        if (!studentId.equals(attempt.getStudentId())) {
            throw new ForbiddenException("You can only record events for your own attempt");
        }

        proctoringService.recordEvent(request);

        return success("Proctoring event recorded successfully");
    }

    // =========================================================
    // 📊 GET EVENTS
    // =========================================================
    @GetMapping("/events/{attemptId}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> getEvents(
            @PathVariable Long attemptId) {

        return success("Events fetched successfully",
                proctoringService.getEvents(attemptId));
    }

    // =========================================================
    // 🚨 CHECK SUSPICIOUS
    // =========================================================
    @GetMapping("/suspicious/{attemptId}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> isSuspicious(
            @PathVariable Long attemptId) {

        boolean suspicious = proctoringService.isSuspicious(attemptId);

        Map<String, Object> data = new HashMap<>();
        data.put("suspicious", suspicious);

        return success("Suspicious check completed", data);
    }

    // =========================================================
    // 🔥 GET CHEATING SCORE
    // =========================================================
    @GetMapping("/score/{attemptId}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> getScore(
            @PathVariable Long attemptId) {

        int score = proctoringService.getCheatingScore(attemptId);

        Map<String, Object> data = new HashMap<>();
        data.put("cheatingScore", score);

        return success("Cheating score fetched", data);
    }

    // =========================================================
    // 🚫 AUTO FLAG CHECK
    // =========================================================
    @GetMapping("/flag/{attemptId}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> checkAutoFlag(
            @PathVariable Long attemptId) {

        boolean flagged = proctoringService.shouldAutoFlag(attemptId);

        Map<String, Object> data = new HashMap<>();
        data.put("flagged", flagged);

        return success("Flag check completed", data);
    }

    // =========================================================
    // ⛔ AUTO CANCEL CHECK
    // =========================================================
    @GetMapping("/cancel/{attemptId}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> checkAutoCancel(
            @PathVariable Long attemptId) {

        boolean cancelled = proctoringService.shouldAutoCancel(attemptId);

        Map<String, Object> data = new HashMap<>();
        data.put("cancelled", cancelled);

        return success("Cancel check completed", data);
    }

    // =========================================================
    // 📈 FULL SUMMARY
    // =========================================================
    @GetMapping("/summary/{attemptId}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> getSummary(
            @PathVariable Long attemptId) {

        ProctoringSummary summary =
                proctoringService.getSummary(attemptId);

        return success("Proctoring summary fetched", summary);
    }

    // =========================================================
    // TEACHER ACTION ALIASES
    // =========================================================
    @PostMapping("/attempt/{attemptId}/warn")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> warnAttempt(
            @PathVariable Long attemptId) {

        proctoringService.warnAttempt(attemptId);
        return success("Attempt warned successfully");
    }

    @PostMapping("/attempt/{attemptId}/mark-safe")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> markAttemptSafe(
            @PathVariable Long attemptId) {

        proctoringService.markAttemptSafe(attemptId);
        return success("Attempt marked safe successfully");
    }

    @PostMapping("/attempt/{attemptId}/cancel")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> cancelAttempt(
            @PathVariable Long attemptId) {

        proctoringService.cancelAttempt(attemptId);
        return success("Attempt cancelled successfully");
    }

    @GetMapping("/evidence/{attemptId}/summary")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> evidenceSummary(
            @PathVariable Long attemptId) {

        ProctoringSummary summary = proctoringService.getSummary(attemptId);
        Map<String, Object> data = new HashMap<>();
        data.put("attemptId", summary.getAttemptId());
        data.put("cheatingScore", summary.getCheatingScore());
        data.put("suspicious", summary.isSuspicious());
        data.put("flagged", summary.isFlagged());
        data.put("cancelled", summary.isCancelled());
        data.put("events", normalizeEvents(proctoringService.getEvents(attemptId)));
        return success("Evidence summary fetched", data);
    }

    @GetMapping("/evidence/{attemptId}/{tab}")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<Map<String, Object>> evidenceTab(
            @PathVariable Long attemptId,
            @PathVariable String tab) {

        List<Map<String, Object>> events = normalizeEvents(
                proctoringService.getEvents(attemptId))
                .stream()
                .filter(event -> matchesTab(event, tab))
                .collect(Collectors.toList());

        Map<String, Object> data = new HashMap<>();
        data.put("tab", tab);
        data.put("events", events);
        return success("Evidence tab fetched", data);
    }

    @GetMapping("/evidence/{attemptId}/download")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<byte[]> downloadEvidence(
            @PathVariable Long attemptId) {

        String report = buildEvidenceReport(attemptId);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=evidence-" + attemptId + ".txt")
                .header("Content-Type", "text/plain; charset=utf-8")
                .body(report.getBytes(StandardCharsets.UTF_8));
    }

    @GetMapping("/evidence/{attemptId}/report")
    @PreAuthorize("hasAnyRole('TEACHER','ADMIN')")
    public ResponseEntity<byte[]> evidenceReport(
            @PathVariable Long attemptId) {

        String report = buildEvidenceReport(attemptId);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=report-" + attemptId + ".txt")
                .header("Content-Type", "text/plain; charset=utf-8")
                .body(report.getBytes(StandardCharsets.UTF_8));
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

    private List<Map<String, Object>> normalizeEvents(List<ProctoringEvent> events) {
        return events.stream().map(event -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", event.getId());
            map.put("attemptId", event.getAttemptId());
            map.put("type", event.getEventType());
            map.put("eventType", event.getEventType());
            map.put("description", event.getDetails());
            map.put("details", event.getDetails());
            map.put("severity", event.getSeverity());
            map.put("score", event.getScore());
            map.put("timestamp", event.getTimestamp());
            map.put("imageUrl", event.getEvidenceUrl());
            map.put("url", event.getEvidenceUrl());
            map.put("metadata", event.getMetadata());
            return map;
        }).collect(Collectors.toList());
    }

    private boolean matchesTab(Map<String, Object> event, String tab) {
        String normalized = String.valueOf(tab == null ? "" : tab).toLowerCase();
        String type = String.valueOf(event.getOrDefault("type", "")).toLowerCase();
        String details = String.valueOf(event.getOrDefault("details", "")).toLowerCase();
        String imageUrl = String.valueOf(event.getOrDefault("imageUrl", "")).toLowerCase();

        return switch (normalized) {
            case "screenshots" -> !imageUrl.isBlank() || type.contains("screen");
            case "webcam" -> type.contains("face") || type.contains("camera") || type.contains("webcam") || type.contains("video");
            case "audio" -> type.contains("audio") || type.contains("noise") || details.contains("noise");
            case "analysis" -> type.contains("analysis") || safeScore(event) >= 30;
            case "logs" -> type.contains("log")
                    || type.startsWith("action_")
                    || type.startsWith("exam_")
                    || type.startsWith("system_")
                    || type.contains("tab_switch")
                    || type.contains("window_blur")
                    || type.contains("fullscreen")
                    || type.contains("copy_paste")
                    || type.contains("shortcut")
                    || type.contains("submit")
                    || type.contains("navigate")
                    || type.contains("answer");
            default -> true;
        };
    }

    private int safeScore(Map<String, Object> event) {
        try {
            return Integer.parseInt(String.valueOf(event.getOrDefault("score", 0)));
        } catch (Exception ex) {
            return 0;
        }
    }

    private String buildEvidenceReport(Long attemptId) {
        ProctoringSummary summary = proctoringService.getSummary(attemptId);
        List<Map<String, Object>> events = normalizeEvents(proctoringService.getEvents(attemptId));
        StringBuilder report = new StringBuilder();
        report.append("Attempt ID: ").append(summary.getAttemptId()).append("\n");
        report.append("Cheating Score: ").append(summary.getCheatingScore()).append("\n");
        report.append("Suspicious: ").append(summary.isSuspicious()).append("\n");
        report.append("Flagged: ").append(summary.isFlagged()).append("\n");
        report.append("Cancelled: ").append(summary.isCancelled()).append("\n\n");
        report.append("Events:\n");
        for (Map<String, Object> event : events) {
            report.append("- ")
                    .append(event.get("timestamp"))
                    .append(" | ")
                    .append(event.get("type"))
                    .append(" | ")
                    .append(event.get("description"))
                    .append("\n");
        }
        return report.toString();
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
            throw new ForbiddenException("Only students can record proctoring events");
        }
        return user.getId();
    }
}
