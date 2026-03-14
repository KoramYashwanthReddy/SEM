package com.yashwanth.ai_exam_system.monitoring;

import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.service.ExamAttemptService;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class ExamAutoSubmitScheduler {

    private final ExamAttemptRepository attemptRepository;
    private final ExamAttemptService examAttemptService;

    public ExamAutoSubmitScheduler(
            ExamAttemptRepository attemptRepository,
            ExamAttemptService examAttemptService) {

        this.attemptRepository = attemptRepository;
        this.examAttemptService = examAttemptService;
    }

    // runs every 30 seconds
    @Scheduled(fixedRate = 30000)
    public void autoSubmitExpiredExams() {

        List<ExamAttempt> activeAttempts =
                attemptRepository.findByStatus("STARTED");

        for (ExamAttempt attempt : activeAttempts) {

            if (attempt.getExpiryTime() != null &&
                LocalDateTime.now().isAfter(attempt.getExpiryTime())) {

                System.out.println("Auto submitting exam attempt: " + attempt.getId());

                examAttemptService.generateResult(attempt.getId());
            }
        }
    }
}