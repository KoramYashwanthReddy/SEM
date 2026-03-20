package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ProctoringEventRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CheatingDetectionService {

    private final ProctoringEventRepository eventRepository;
    private final ExamAttemptRepository attemptRepository;
    private final NotificationService notificationService;

    // 🔥 THRESHOLDS (can be tuned later)
    private static final int FLAG_THRESHOLD = 30;
    private static final int INVALIDATE_THRESHOLD = 50;

    public CheatingDetectionService(
            ProctoringEventRepository eventRepository,
            ExamAttemptRepository attemptRepository,
            NotificationService notificationService) {

        this.eventRepository = eventRepository;
        this.attemptRepository = attemptRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public void analyzeAttempt(Long attemptId) {

        // 🔥 Step 1: Get total cheating score
        Integer score = eventRepository.getTotalSeverityScore(attemptId);

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        attempt.setCheatingScore(score);

        // 🔥 Step 2: Apply AI Logic
        if (score >= INVALIDATE_THRESHOLD) {

            attempt.setStatus("INVALIDATED");
            attempt.setCheatingFlag(true);

            notificationService.notifyAdmin(
                    "🚨 HIGH CHEATING DETECTED → Attempt ID: " + attemptId +
                    " | Score: " + score
            );

        } else if (score >= FLAG_THRESHOLD) {

            attempt.setStatus("FLAGGED");
            attempt.setCheatingFlag(true);

            notificationService.notifyAdmin(
                    "⚠️ Suspicious Exam → Attempt ID: " + attemptId +
                    " | Score: " + score
            );
        }

        // Save result
        attemptRepository.save(attempt);
    }
}