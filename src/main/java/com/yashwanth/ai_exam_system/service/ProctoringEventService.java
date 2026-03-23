package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.ProctoringEvent;
import com.yashwanth.ai_exam_system.repository.ProctoringEventRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProctoringEventService {

    private static final Logger logger =
            LoggerFactory.getLogger(ProctoringEventService.class);

    private final ProctoringEventRepository eventRepository;
    private final CheatingDetectionService cheatingDetectionService;

    public ProctoringEventService(
            ProctoringEventRepository eventRepository,
            CheatingDetectionService cheatingDetectionService) {

        this.eventRepository = eventRepository;
        this.cheatingDetectionService = cheatingDetectionService;
    }

    // =========================================================
    // 🚀 LOG EVENT + REAL-TIME AI DETECTION
    // =========================================================
    @Transactional
    public ProctoringEvent logEvent(ProctoringEvent event) {

        if (event == null) {
            throw new IllegalArgumentException("Proctoring event cannot be null");
        }

        if (event.getAttemptId() == null) {
            throw new IllegalArgumentException("Attempt ID is required");
        }

        try {

            // 1️⃣ Save event
            ProctoringEvent savedEvent = eventRepository.save(event);

            logger.info(
                    "Proctoring event recorded | Attempt: {} | Type: {}",
                    event.getAttemptId(),
                    event.getEventType()
            );

            // 2️⃣ Trigger real-time AI detection
            cheatingDetectionService.analyzeAttempt(event.getAttemptId());

            return savedEvent;

        } catch (Exception ex) {

            logger.error(
                    "Error logging proctoring event for attempt {}",
                    event.getAttemptId(),
                    ex
            );

            throw new RuntimeException(
                    "Failed to log proctoring event",
                    ex
            );
        }
    }

    // =========================================================
    // 🔥 BULK EVENT LOGGING (for batch AI processing)
    // =========================================================
    @Transactional
    public void logEventWithoutAnalysis(ProctoringEvent event) {

        if (event == null || event.getAttemptId() == null) {
            return;
        }

        eventRepository.save(event);
    }

    // =========================================================
    // 🚀 FORCE ANALYSIS
    // =========================================================
    public void triggerAnalysis(Long attemptId) {

        if (attemptId == null) {
            throw new IllegalArgumentException("Attempt ID cannot be null");
        }

        cheatingDetectionService.analyzeAttempt(attemptId);
    }

    // =========================================================
    // 📊 COUNT EVENTS
    // =========================================================
    public long countEvents(Long attemptId) {
        return eventRepository.countByAttemptId(attemptId);
    }

    // =========================================================
    // 🚨 COUNT BY TYPE
    // =========================================================
    public long countByType(Long attemptId, String type) {
        return eventRepository.countByAttemptIdAndEventType(attemptId, type);
    }
}