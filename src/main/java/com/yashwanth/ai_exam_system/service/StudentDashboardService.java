package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.*;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.Question;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.QuestionRepository;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class StudentDashboardService {

    private final ExamAttemptRepository attemptRepository;
    private final QuestionRepository questionRepository;

    public StudentDashboardService(ExamAttemptRepository attemptRepository,
                                   QuestionRepository questionRepository) {
        this.attemptRepository = attemptRepository;
        this.questionRepository = questionRepository;
    }

    public StudentDashboardResponse getDashboard(Long studentId) {

        List<ExamAttempt> attempts = attemptRepository.findByStudentId(studentId);

        List<StudentExamSummary> attempted = new ArrayList<>();

        List<Double> scores = new ArrayList<>();

        for (ExamAttempt attempt : attempts) {

            double percentage = 0;

            if (attempt.getTotalMarks() != null && attempt.getTotalMarks() > 0) {
                percentage = (attempt.getObtainedMarks() * 100.0) / attempt.getTotalMarks();
            }

            scores.add(percentage);

            attempted.add(
                    new StudentExamSummary(
                            attempt.getExamCode(),
                            attempt.getObtainedMarks(),
                            attempt.getTotalMarks(),
                            percentage,
                            calculateBadge(percentage)
                    )
            );
        }

        StudentExamAnalyticsResponse analytics = new StudentExamAnalyticsResponse();

        analytics.setAttemptedExams(attempted.size());

        if (!scores.isEmpty()) {
            analytics.setAverageScore(scores.stream().mapToDouble(Double::doubleValue).average().orElse(0));
            analytics.setHighestScore(Collections.max(scores));
            analytics.setLowestScore(Collections.min(scores));

            long passCount = scores.stream().filter(s -> s >= 40).count();
            analytics.setPassRate((passCount * 100.0) / scores.size());
        }

        List<ExamSuggestionResponse> suggestions = generateSuggestions(analytics);

        StudentDashboardResponse response = new StudentDashboardResponse();

        response.setAttempted(attempted);
        response.setNotAttempted(new ArrayList<>());
        response.setAnalytics(analytics);
        response.setSuggestions(suggestions);

        return response;
    }

    private String calculateBadge(double percentage) {

        if (percentage >= 90) return "PLATINUM";
        if (percentage >= 80) return "GOLD";
        if (percentage >= 70) return "SILVER";
        if (percentage >= 60) return "BRONZE";

        return "PARTICIPANT";
    }

    private List<ExamSuggestionResponse> generateSuggestions(StudentExamAnalyticsResponse analytics) {

        List<ExamSuggestionResponse> suggestions = new ArrayList<>();

        if (analytics.getAverageScore() != null) {

            if (analytics.getAverageScore() < 60) {
                suggestions.add(new ExamSuggestionResponse("Revise fundamentals and attempt beginner exams"));
            }

            if (analytics.getAverageScore() < 75) {
                suggestions.add(new ExamSuggestionResponse("Practice more medium difficulty exams"));
            }

            if (analytics.getAverageScore() >= 80) {
                suggestions.add(new ExamSuggestionResponse("Try advanced coding exams"));
            }
        }

        return suggestions;
    }
}