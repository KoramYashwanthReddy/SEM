package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.AnalyticsResponse;
import com.yashwanth.ai_exam_system.entity.ExamResult;
import com.yashwanth.ai_exam_system.repository.ExamResultRepository;

import org.springframework.stereotype.Service;

import java.util.*;
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

        List<Integer> scores = new ArrayList<>();
        List<String> dates = new ArrayList<>();

        double total = 0;
        double max = 0;
        double min = Double.MAX_VALUE;

        for (ExamResult r : results) {

            int score = (int) r.getScore();

            scores.add(score);
            dates.add(r.getSubmittedAt().toString());

            total += score;
            max = Math.max(max, score);
            min = Math.min(min, score);
        }

        AnalyticsResponse response = new AnalyticsResponse();
        response.setScores(scores);
        response.setDates(dates);
        response.setAverageScore(results.isEmpty() ? 0 : total / results.size());
        response.setHighestScore(max);
        response.setLowestScore(min == Double.MAX_VALUE ? 0 : min);

        return response;
    }

    // ================= PERFORMANCE TREND =================

    public Map<String, Object> getPerformanceTrend(Long studentId) {

        List<ExamResult> results =
                resultRepository.findByStudentIdOrderBySubmittedAtAsc(studentId);

        List<Integer> scores = results.stream()
                .map(r -> (int) r.getScore())
                .collect(Collectors.toList());

        Map<String, Object> map = new HashMap<>();
        map.put("trend", scores);

        return map;
    }

    // ================= STUDENT HISTORY =================

    public Map<String, Object> getStudentHistory(Long studentId) {

        List<ExamResult> results =
                resultRepository.findByStudentIdOrderBySubmittedAtAsc(studentId);

        Map<String, Object> map = new HashMap<>();
        map.put("totalExams", results.size());

        double avg = results.stream()
                .mapToDouble(ExamResult::getScore)
                .average()
                .orElse(0);

        map.put("average", avg);

        return map;
    }

    // ================= EXAM ANALYTICS =================

    public Map<String, Object> getExamAnalytics(Long examId) {

        List<ExamResult> results =
                resultRepository.findByExamId(examId);

        double avg = results.stream()
                .mapToDouble(ExamResult::getScore)
                .average()
                .orElse(0);

        double max = results.stream()
                .mapToDouble(ExamResult::getScore)
                .max().orElse(0);

        double min = results.stream()
                .mapToDouble(ExamResult::getScore)
                .min().orElse(0);

        Map<String, Object> map = new HashMap<>();
        map.put("average", avg);
        map.put("highest", max);
        map.put("lowest", min);
        map.put("totalStudents", results.size());

        return map;
    }

    // ================= CLASS ANALYTICS =================

    public Map<String, Object> getClassAnalytics(Long examId) {

        List<ExamResult> results =
                resultRepository.findByExamId(examId);

        double avg = results.stream()
                .mapToDouble(ExamResult::getScore)
                .average()
                .orElse(0);

        long passCount = results.stream()
                .filter(r -> r.getScore() >= 40)
                .count();

        Map<String, Object> map = new HashMap<>();
        map.put("average", avg);
        map.put("passPercentage",
                results.isEmpty() ? 0 :
                        (passCount * 100.0) / results.size());

        return map;
    }

    // ================= LEADERBOARD =================

    public Map<String, Object> getLeaderboardAnalytics(Long examId) {

        List<ExamResult> results =
                resultRepository.findByExamIdOrderByScoreDesc(examId);

        Map<String, Object> map = new HashMap<>();
        map.put("leaderboard", results.stream()
                .limit(10)
                .collect(Collectors.toList()));

        return map;
    }

    // ================= ADMIN DASHBOARD =================

    public Map<String, Object> getAdminDashboard() {

        Map<String, Object> map = new HashMap<>();

        long totalResults = resultRepository.count();

        double avg = resultRepository.findAll().stream()
                .mapToDouble(ExamResult::getScore)
                .average()
                .orElse(0);

        map.put("totalResults", totalResults);
        map.put("averageScore", avg);

        return map;
    }
}