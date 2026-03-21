package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.ProctoringEventRequest;
import com.yashwanth.ai_exam_system.service.ProctoringService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/proctoring")
public class ProctoringController {

    private final ProctoringService proctoringService;

    public ProctoringController(ProctoringService proctoringService) {
        this.proctoringService = proctoringService;
    }

    // =========================================================
    // 🔥 RECORD EVENT
    // =========================================================
    @PostMapping("/event")
    public ResponseEntity<?> recordEvent(@RequestBody ProctoringEventRequest request) {

        Map<String, Object> response = new HashMap<>();

        try {
            proctoringService.recordEvent(request);

            response.put("status", "SUCCESS");
            response.put("message", "Event recorded successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("status", "ERROR");
            response.put("message", e.getMessage());

            return ResponseEntity.badRequest().body(response);
        }
    }

    // =========================================================
    // 📊 GET EVENTS
    // =========================================================
    @GetMapping("/events/{attemptId}")
    public ResponseEntity<?> getEvents(@PathVariable Long attemptId) {

        Map<String, Object> response = new HashMap<>();

        response.put("status", "SUCCESS");
        response.put("data", proctoringService.getEvents(attemptId));

        return ResponseEntity.ok(response);
    }

    // =========================================================
    // 🚨 CHECK SUSPICIOUS
    // =========================================================
    @GetMapping("/suspicious/{attemptId}")
    public ResponseEntity<?> isSuspicious(@PathVariable Long attemptId) {

        Map<String, Object> response = new HashMap<>();

        boolean suspicious = proctoringService.isSuspicious(attemptId);

        response.put("status", "SUCCESS");
        response.put("suspicious", suspicious);

        return ResponseEntity.ok(response);
    }

    // =========================================================
    // 🔥 GET CHEATING SCORE (NEW)
    // =========================================================
    @GetMapping("/score/{attemptId}")
    public ResponseEntity<?> getScore(@PathVariable Long attemptId) {

        Map<String, Object> response = new HashMap<>();

        int score = proctoringService.getCheatingScore(attemptId);

        response.put("status", "SUCCESS");
        response.put("cheatingScore", score);

        return ResponseEntity.ok(response);
    }
}