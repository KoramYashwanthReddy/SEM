package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.repository.ProctoringEventRepository;

import org.springframework.stereotype.Service;

@Service
public class ProctoringEventService {

    private final ProctoringEventRepository eventRepository;
    private final CheatingDetectionService cheatingDetectionService;

    public ProctoringEventService(
            ProctoringEventRepository eventRepository,
            CheatingDetectionService cheatingDetectionService) {

        this.eventRepository = eventRepository;
        this.cheatingDetectionService = cheatingDetectionService;
    }

    // 🚀 REAL-TIME DETECTION HERE
    public ProctoringEvent logEvent(ProctoringEvent event) {

        ProctoringEvent savedEvent = eventRepository.save(event);

        // 🔥 TRIGGER AI IMMEDIATELY
        cheatingDetectionService.analyzeAttempt(event.getAttemptId());

        return savedEvent;
    }
}