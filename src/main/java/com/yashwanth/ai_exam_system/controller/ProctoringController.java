package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.ProctoringEventRequest;
import com.yashwanth.ai_exam_system.dto.ProctoringSummary;
import com.yashwanth.ai_exam_system.service.ProctoringService;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/proctoring")
public class ProctoringController {

    private static final Logger logger =
            LoggerFactory.getLogger(ProctoringController.class);

    private final ProctoringService proctoringService;

    public ProctoringController(ProctoringService proctoringService) {
        this.proctoringService = proctoringService;
    }

    // =========================================================
    // 🔥 RECORD EVENT
    // =========================================================
    @PostMapping("/event")
    public ResponseEntity<Map<String, Object>> recordEvent(
            @Valid @RequestBody ProctoringEventRequest request) {

        proctoringService.recordEvent(request);

        return success("Proctoring event recorded successfully");
    }

    // =========================================================
    // 📊 GET EVENTS
    // =========================================================
    @GetMapping("/events/{attemptId}")
    public ResponseEntity<Map<String, Object>> getEvents(
            @PathVariable Long attemptId) {

        return success("Events fetched successfully",
                proctoringService.getEvents(attemptId));
    }

    // =========================================================
    // 🚨 CHECK SUSPICIOUS
    // =========================================================
    @GetMapping("/suspicious/{attemptId}")
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
    public ResponseEntity<Map<String, Object>> getSummary(
            @PathVariable Long attemptId) {

        ProctoringSummary summary =
                proctoringService.getSummary(attemptId);

        return success("Proctoring summary fetched", summary);
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