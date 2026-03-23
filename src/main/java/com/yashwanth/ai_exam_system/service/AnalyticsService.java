package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.AnalyticsResponse;
import com.yashwanth.ai_exam_system.entity.ExamResult;
import com.yashwanth.ai_exam_system.repository.ExamResultRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final ExamResultRepository resultRepository;

    public AnalyticsService(ExamResultRepository resultRepository) {
        this.resultRepository = resultRepository;
    }

    // ================= STUDENT ANALYTICS =================

    public AnalyticsResponse getStudentAnalytics(Long studentId) {

        List<ExamResult> results =
                resultRepository.findByStudentIdOrderBySubmittedAtAsc(studentId);

        if (results.isEmpty()) {
            return new AnalyticsResponse();
        }

        List<Integer> scores = results.stream()
                .map(r -> (int) r.getScore())
                .toList();

        List<String> dates = results.stream()
                .map(r -> r.getSubmittedAt().toString())
                .toList();

        double avg = results.stream()
                .mapToDouble(ExamResult::getScore)
                .average().orElse(0);

        double max = results.stream()
                .mapToDouble(ExamResult::getScore)
                .max().orElse(0);

        double min = results.stream()
                .mapToDouble(ExamResult::getScore)
                .min().orElse(0);

        AnalyticsResponse response = new AnalyticsResponse();
        response.setScores(scores);
        response.setDates(dates);
        response.setAverageScore(avg);
        response.setHighestScore(max);
        response.setLowestScore(min);

        return response;
    }

    // ================= PERFORMANCE TREND =================

    public Map<String, Object> getPerformanceTrend(Long studentId) {

        List<Integer> scores =
                resultRepository.findByStudentIdOrderBySubmittedAtAsc(studentId)
                        .stream()
                        .map(r -> (int) r.getScore())
                        .toList();

        return Map.of("trend", scores);
    }

    // ================= STUDENT HISTORY =================

    public Map<String, Object> getStudentHistory(Long studentId) {

        List<ExamResult> results =
                resultRepository.findByStudentIdOrderBySubmittedAtAsc(studentId);

        double avg = results.stream()
                .mapToDouble(ExamResult::getScore)
                .average().orElse(0);

        return Map.of(
                "totalExams", results.size(),
                "average", avg
        );
    }

    // ================= EXAM ANALYTICS =================

    public Map<String, Object> getExamAnalytics(Long examId) {

        List<ExamResult> results =
                resultRepository.findByExamId(examId);

        double avg = results.stream()
                .mapToDouble(ExamResult::getScore)
                .average().orElse(0);

        double max = results.stream()
                .mapToDouble(ExamResult::getScore)
                .max().orElse(0);

        double min = results.stream()
                .mapToDouble(ExamResult::getScore)
                .min().orElse(0);

        return Map.of(
                "average", avg,
                "highest", max,
                "lowest", min,
                "totalStudents", results.size()
        );
    }

    // ================= CLASS ANALYTICS =================

    public Map<String, Object> getClassAnalytics(Long examId) {

        List<ExamResult> results =
                resultRepository.findByExamId(examId);

        double avg = results.stream()
                .mapToDouble(ExamResult::getScore)
                .average().orElse(0);

        long passCount = results.stream()
                .filter(r -> Boolean.TRUE.equals(r.getPassed()))
                .count();

        double passPercentage =
                results.isEmpty() ? 0 :
                        (passCount * 100.0) / results.size();

        return Map.of(
                "average", avg,
                "passPercentage", passPercentage
        );
    }

    // ================= LEADERBOARD =================

    public Map<String, Object> getLeaderboardAnalytics(Long examId) {

        List<ExamResult> results =
                resultRepository.findTop10ByExamIdOrderByScoreDesc(examId);

        return Map.of("leaderboard", results);
    }

    // ================= ADMIN DASHBOARD =================

    public Map<String, Object> getAdminDashboard() {

        long totalResults = resultRepository.count();

        double avg = resultRepository.findAll().stream()
                .mapToDouble(ExamResult::getScore)
                .average().orElse(0);

        return Map.of(
                "totalResults", totalResults,
                "averageScore", avg
        );
    }
}