package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.ProctoringEventRequest;
import com.yashwanth.ai_exam_system.service.ProctoringService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/proctoring")
public class ProctoringController {

    private final ProctoringService proctoringService;

    public ProctoringController(ProctoringService proctoringService) {
        this.proctoringService = proctoringService;
    }

    // record cheating event
    @PostMapping("/event")
    public ResponseEntity<?> recordEvent(
            @RequestBody ProctoringEventRequest request) {

        proctoringService.recordEvent(request);

        return ResponseEntity.ok("Event recorded");
    }

    // get events of an exam attempt
    @GetMapping("/events/{attemptId}")
    public ResponseEntity<?> getEvents(
            @PathVariable Long attemptId) {

        return ResponseEntity.ok(
                proctoringService.getEvents(attemptId)
        );
    }

    // check if suspicious
    @GetMapping("/suspicious/{attemptId}")
    public ResponseEntity<?> isSuspicious(
            @PathVariable Long attemptId) {

        return ResponseEntity.ok(
                proctoringService.isSuspicious(attemptId)
        );
    }
}