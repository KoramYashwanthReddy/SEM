package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.service.ProctoringEventService;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/proctoring/events")
public class ProctoringEventController {

    private static final Logger logger =
            LoggerFactory.getLogger(ProctoringEventController.class);

    private final ProctoringEventService eventService;

    public ProctoringEventController(ProctoringEventService eventService) {
        this.eventService = eventService;
    }

    // =========================================================
    // 🚀 LIVE EVENT LOGGING
    // =========================================================
    @PostMapping("/log")
    public ResponseEntity<Map<String, Object>> logEvent(
            @Valid @RequestBody ProctoringEvent event) {

        ProctoringEvent saved = eventService.logEvent(event);

        logger.info("Proctoring event logged | attempt={} | type={}",
                event.getAttemptId(), event.getEventType());

        return success("Event logged successfully", saved);
    }

    // =========================================================
    // 📊 COUNT EVENTS
    // =========================================================
    @GetMapping("/count/{attemptId}")
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
}