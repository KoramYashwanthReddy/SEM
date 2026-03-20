package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.AnalyticsResponse;
import com.yashwanth.ai_exam_system.entity.ExamResult;
import com.yashwanth.ai_exam_system.repository.ExamResultRepository;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AnalyticsService {

    private final ExamResultRepository resultRepository;

    public AnalyticsService(ExamResultRepository resultRepository) {
        this.resultRepository = resultRepository;
    }

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
}