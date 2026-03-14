package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.ExamNavigationStatusDTO;
import com.yashwanth.ai_exam_system.repository.StudentAnswerRepository;
import org.springframework.stereotype.Service;

@Service
public class ExamNavigationService {

    private final StudentAnswerRepository answerRepository;

    public ExamNavigationService(StudentAnswerRepository answerRepository) {
        this.answerRepository = answerRepository;
    }

    public ExamNavigationStatusDTO getNavigationStatus(Long attemptId) {

        long total = answerRepository.countByAttemptId(attemptId);

        long answered = answerRepository.countByAttemptIdAndStatus(attemptId, "ANSWERED");

        long review = answerRepository.countByAttemptIdAndReviewMarkedTrue(attemptId);

        long notAnswered = total - answered;

        ExamNavigationStatusDTO dto = new ExamNavigationStatusDTO();

        dto.setAttemptId(attemptId);
        dto.setTotalQuestions(total);
        dto.setAnswered(answered);
        dto.setMarkedForReview(review);
        dto.setNotAnswered(notAnswered);

        return dto;
    }
}