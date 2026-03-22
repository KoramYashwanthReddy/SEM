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

        // total questions
        long total = answerRepository.countByAttemptId(attemptId);

        // answered
        long answered = answerRepository
                .countByAttemptIdAndStatus(attemptId, "ANSWERED");

        // marked for review
        long markedForReview = answerRepository
                .countByAttemptIdAndReviewMarkedTrue(attemptId);

        // answered + review
        long answeredAndReview = answerRepository
                .countByAttemptIdAndStatusAndReviewMarkedTrue(attemptId, "ANSWERED");

        // not answered (visited but not answered)
        long notAnswered = answerRepository
                .countByAttemptIdAndStatus(attemptId, "NOT_ANSWERED");

        // not visited
        long notVisited = total - (answered + notAnswered);

        ExamNavigationStatusDTO dto = new ExamNavigationStatusDTO();

        dto.setAttemptId(attemptId);
        dto.setTotalQuestions(total);

        dto.setAnswered(answered);
        dto.setMarkedForReview(markedForReview);
        dto.setAnsweredAndMarkedForReview(answeredAndReview);

        dto.setNotAnswered(notAnswered);
        dto.setNotVisited(notVisited);

        return dto;
    }
}