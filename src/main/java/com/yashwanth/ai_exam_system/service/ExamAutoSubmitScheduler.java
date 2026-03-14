package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.ExamResult;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ExamAutoSubmitScheduler {

    private final ExamAttemptRepository attemptRepository;
    private final ExamEvaluationService evaluationService;

    public ExamAutoSubmitScheduler(
            ExamAttemptRepository attemptRepository,
            ExamEvaluationService evaluationService) {

        this.attemptRepository = attemptRepository;
        this.evaluationService = evaluationService;
    }

    // Runs every 30 seconds
    @Scheduled(fixedRate = 30000)
    public void autoSubmitExpiredExams() {

        List<ExamAttempt> expiredAttempts =
                attemptRepository.findByStatusAndExpiryTimeBefore(
                        "STARTED",
                        LocalDateTime.now()
                );

        for (ExamAttempt attempt : expiredAttempts) {

            try {

                ExamResult result =
                        evaluationService.evaluateExam(
                                attempt.getId(),
                                attempt.getStudentId(),
                                attempt.getExamCode()
                        );

                attempt.setStatus("SUBMITTED");
                attempt.setEndTime(LocalDateTime.now());

                attempt.setObtainedMarks((int) result.getScore());
                attempt.setTotalMarks(result.getTotalQuestions());

                attemptRepository.save(attempt);

                System.out.println("Auto submitted exam attempt: " + attempt.getId());

            } catch (Exception e) {

                System.out.println("Auto submit failed for attempt: " + attempt.getId());

            }
        }
    }
}