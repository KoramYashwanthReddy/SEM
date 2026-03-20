package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.service.ProctoringEventService;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/proctoring")
public class ProctoringEventController {

    private final ProctoringEventService eventService;

    public ProctoringEventController(ProctoringEventService eventService) {
        this.eventService = eventService;
    }

    // 🚀 LIVE EVENT LOGGING
    @PostMapping("/log")
    public ProctoringEvent logEvent(@RequestBody ProctoringEvent event) {
        return eventService.logEvent(event);
    }
}