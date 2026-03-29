package com.yashwanth.ai_exam_system.monitoring;

import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.enums.AttemptStatus;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.service.ExamAttemptService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class ExamAutoSubmitScheduler {

    private static final Logger log =
            LoggerFactory.getLogger(ExamAutoSubmitScheduler.class);

    private final ExamAttemptRepository attemptRepository;
    private final ExamAttemptService examAttemptService;

    public ExamAutoSubmitScheduler(
            ExamAttemptRepository attemptRepository,
            ExamAttemptService examAttemptService) {

        this.attemptRepository = attemptRepository;
        this.examAttemptService = examAttemptService;
    }

    // Runs every 30 seconds
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void autoSubmitExpiredExams() {

        LocalDateTime now = LocalDateTime.now();

        // Only expired STARTED attempts
        List<ExamAttempt> expiredAttempts =
                attemptRepository.findExpiredAttempts(
                        AttemptStatus.STARTED,
                        now
                );

        for (ExamAttempt attempt : expiredAttempts) {

            try {

                log.info("Auto submitting expired exam attempt: {}", attempt.getId());

                // mark auto submitted
                attempt.setStatus(AttemptStatus.AUTO_SUBMITTED);
                attempt.setAutoSubmitted(true);

                attemptRepository.save(attempt);

                // generate result
                examAttemptService.generateResult(attempt.getId());

            } catch (Exception e) {

                log.error("Auto submit failed for attempt {}",
                        attempt.getId(), e);
            }
        }
    }
}