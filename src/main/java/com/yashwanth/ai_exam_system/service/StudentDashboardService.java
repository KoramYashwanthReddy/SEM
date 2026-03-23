package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.*;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.QuestionRepository;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
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
        List<Double> trend = new ArrayList<>();

        int cheatingAlerts = 0;
        int certificates = 0;

        LocalDateTime lastAttempt = null;

        for (ExamAttempt attempt : attempts) {

            int obtained = attempt.getObtainedMarks() == null ? 0 : attempt.getObtainedMarks();
            int total = attempt.getTotalMarks() == null ? 0 : attempt.getTotalMarks();

            double percentage = 0;

            if (total > 0) {
                percentage = (obtained * 100.0) / total;
            }

            scores.add(percentage);
            trend.add(percentage);

            if (Boolean.TRUE.equals(attempt.getCheatingFlag())) {
                cheatingAlerts++;
            }

            if (percentage >= 80) {
                certificates++;
            }

            if (lastAttempt == null ||
                    (attempt.getEndTime() != null && attempt.getEndTime().isAfter(lastAttempt))) {
                lastAttempt = attempt.getEndTime();
            }

            attempted.add(
                    new StudentExamSummary(
                            attempt.getExamCode(),
                            obtained,
                            total,
                            percentage,
                            calculateBadge(percentage)
                    )
            );
        }

        // ================= ANALYTICS =================
        StudentExamAnalyticsResponse analytics = new StudentExamAnalyticsResponse();
        analytics.setAttemptedExams(attempted.size());

        double avg = scores.stream().mapToDouble(Double::doubleValue).average().orElse(0);

        analytics.setAverageScore(avg);
        analytics.setHighestScore(scores.stream().mapToDouble(Double::doubleValue).max().orElse(0));
        analytics.setLowestScore(scores.stream().mapToDouble(Double::doubleValue).min().orElse(0));

        long passCount = scores.stream().filter(s -> s >= 40).count();
        analytics.setPassRate(scores.isEmpty() ? 0 : (passCount * 100.0) / scores.size());

        // ================= SUGGESTIONS =================
        List<ExamSuggestionResponse> suggestions = generateSuggestions(analytics);

        // ================= WEAK TOPICS =================
        List<String> weakTopics = detectWeakTopics(studentId);

        // ================= RESPONSE =================
        StudentDashboardResponse response = new StudentDashboardResponse();

        response.setAttempted(attempted);
        response.setNotAttempted(new ArrayList<>());
        response.setAnalytics(analytics);
        response.setSuggestions(suggestions);

        response.setTotalExams(attempts.size());
        response.setAttemptedCount(attempted.size());
        response.setNotAttemptedCount(0);

        response.setAverageScore(avg);
        response.setCertificatesEarned(certificates);
        response.setLeaderboardRank(0); // can plug leaderboard service

        response.setCheatingAlerts(cheatingAlerts);
        response.setWeakTopics(weakTopics);
        response.setPerformanceTrend(trend);
        response.setLastAttemptTime(lastAttempt);

        return response;
    }

    // ================= BADGE =================
    private String calculateBadge(double percentage) {

        if (percentage >= 90) return "PLATINUM";
        if (percentage >= 80) return "GOLD";
        if (percentage >= 70) return "SILVER";
        if (percentage >= 60) return "BRONZE";

        return "PARTICIPANT";
    }

    // ================= SUGGESTIONS =================
    private List<ExamSuggestionResponse> generateSuggestions(
            StudentExamAnalyticsResponse analytics) {

        List<ExamSuggestionResponse> suggestions = new ArrayList<>();

        Double avg = analytics.getAverageScore();

        if (avg == null) return suggestions;

        if (avg < 50) {
            suggestions.add(
                    new ExamSuggestionResponse(
                            "Revise basics and attempt beginner exams"
                    )
            );
        }

        if (avg >= 50 && avg < 70) {
            suggestions.add(
                    new ExamSuggestionResponse(
                            "Practice medium difficulty exams"
                    )
            );
        }

        if (avg >= 70 && avg < 85) {
            suggestions.add(
                    new ExamSuggestionResponse(
                            "Attempt advanced level exams"
                    )
            );
        }

        if (avg >= 85) {
            suggestions.add(
                    new ExamSuggestionResponse(
                            "You are doing great! Try competitive exams"
                    )
            );
        }

        return suggestions;
    }

    // ================= WEAK TOPIC DETECTION =================
    private List<String> detectWeakTopics(Long studentId) {

        // placeholder — can plug AI topic analysis later
        return new ArrayList<>();
    }
}