package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.*;
import com.yashwanth.ai_exam_system.entity.Question;
import com.yashwanth.ai_exam_system.entity.StudentAnswer;
import com.yashwanth.ai_exam_system.repository.QuestionRepository;
import com.yashwanth.ai_exam_system.repository.StudentAnswerRepository;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AIAnalysisService {

    private final StudentAnswerRepository answerRepository;
    private final QuestionRepository questionRepository;

    public AIAnalysisService(StudentAnswerRepository answerRepository,
                             QuestionRepository questionRepository) {
        this.answerRepository = answerRepository;
        this.questionRepository = questionRepository;
    }

    // ================= STUDENT ANALYSIS =================

    public AIAnalysisResponse analyzeStudent(Long studentId) {

        List<StudentAnswer> answers =
                answerRepository.findByAttempt_StudentId(studentId);

        if (answers.isEmpty()) {
            return new AIAnalysisResponse();
        }

        Map<String, TopicPerformanceDTO> topicMap =
                buildTopicPerformance(answers);

        List<TopicPerformanceDTO> performance =
                new ArrayList<>(topicMap.values());

        List<WeakTopicDTO> weakTopics =
                buildWeakTopics(performance);

        AIAnalysisResponse response = new AIAnalysisResponse();
        response.setPerformance(performance);
        response.setWeakTopics(weakTopics);
        response.setOverallFeedback(generateOverallFeedback(performance));

        return response;
    }

    // ================= EXAM ANALYSIS =================

    public Map<String, Object> analyzeExam(Long examId) {

        List<StudentAnswer> answers =
                answerRepository.findByAttempt_ExamId(examId);

        Map<String, Object> result = new HashMap<>();

        long total = answers.size();
        long correct = answers.stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsCorrect()))
                .count();

        double accuracy = total == 0 ? 0 :
                (correct * 100.0) / total;

        result.put("totalAnswers", total);
        result.put("correctAnswers", correct);
        result.put("accuracy", accuracy);

        return result;
    }

    // ================= CLASS PERFORMANCE =================

    public Map<String, Object> analyzeClassPerformance(Long examId) {

        List<StudentAnswer> answers =
                answerRepository.findByAttempt_ExamId(examId);

        Map<Long, List<StudentAnswer>> grouped =
                answers.stream()
                        .collect(Collectors.groupingBy(
                                a -> a.getAttempt().getStudentId()
                        ));

        Map<String, Object> result = new HashMap<>();
        List<Double> scores = new ArrayList<>();

        for (List<StudentAnswer> studentAnswers : grouped.values()) {

            long correct = studentAnswers.stream()
                    .filter(a -> Boolean.TRUE.equals(a.getIsCorrect()))
                    .count();

            double score =
                    (correct * 100.0) / studentAnswers.size();

            scores.add(score);
        }

        double avg = scores.stream()
                .mapToDouble(Double::doubleValue)
                .average().orElse(0);

        result.put("averageScore", avg);
        result.put("totalStudents", grouped.size());

        return result;
    }

    // ================= WEAK TOPICS =================

    public Map<String, Object> detectWeakTopics(Long studentId) {

        AIAnalysisResponse response = analyzeStudent(studentId);

        Map<String, Object> result = new HashMap<>();
        result.put("weakTopics", response.getWeakTopics());
        result.put("feedback", response.getOverallFeedback());

        return result;
    }

    // ================= RISK SCORE =================

    public Map<String, Object> getStudentRiskScore(Long studentId) {

        List<StudentAnswer> answers =
                answerRepository.findByAttempt_StudentId(studentId);

        long incorrect = answers.stream()
                .filter(a -> Boolean.FALSE.equals(a.getIsCorrect()))
                .count();

        double risk = answers.isEmpty() ? 0 :
                (incorrect * 100.0) / answers.size();

        Map<String, Object> result = new HashMap<>();
        result.put("riskScore", risk);
        result.put("level",
                risk > 70 ? "HIGH" :
                risk > 40 ? "MEDIUM" : "LOW");

        return result;
    }

    // ================= INTERNAL HELPERS =================

    private Map<String, TopicPerformanceDTO> buildTopicPerformance(
            List<StudentAnswer> answers) {

        Map<String, TopicPerformanceDTO> topicMap = new HashMap<>();

        for (StudentAnswer answer : answers) {

            Question question = questionRepository
                    .findById(answer.getQuestionId())
                    .orElse(null);

            if (question == null) continue;

            String topic = question.getTopic();

            topicMap.putIfAbsent(topic, new TopicPerformanceDTO());

            TopicPerformanceDTO dto = topicMap.get(topic);
            dto.setTopic(topic);
            dto.setTotalQuestions(dto.getTotalQuestions() + 1);

            if (Boolean.TRUE.equals(answer.getIsCorrect())) {
                dto.setCorrectAnswers(dto.getCorrectAnswers() + 1);
            }
        }

        topicMap.values().forEach(dto -> {
            double accuracy = dto.getTotalQuestions() == 0 ? 0 :
                    (dto.getCorrectAnswers() * 100.0)
                            / dto.getTotalQuestions();

            dto.setAccuracy(accuracy);
        });

        return topicMap;
    }

    private List<WeakTopicDTO> buildWeakTopics(
            List<TopicPerformanceDTO> performance) {

        List<WeakTopicDTO> weakTopics = new ArrayList<>();

        for (TopicPerformanceDTO dto : performance) {

            if (dto.getAccuracy() < 50) {

                WeakTopicDTO weak = new WeakTopicDTO();
                weak.setTopic(dto.getTopic());
                weak.setAccuracy(dto.getAccuracy());
                weak.setRecommendation(
                        generateRecommendation(dto.getTopic())
                );

                weakTopics.add(weak);
            }
        }

        return weakTopics;
    }

    // ================= RECOMMENDATION ENGINE =================

    private String generateRecommendation(String topic) {

        return switch (topic.toLowerCase()) {

            case "arrays" ->
                    "Practice array traversal, searching and sorting";

            case "dbms" ->
                    "Revise normalization, indexing and SQL joins";

            case "os" ->
                    "Focus on scheduling, deadlocks and memory mgmt";

            case "java" ->
                    "Practice OOP, collections and multithreading";

            case "spring" ->
                    "Revise DI, REST APIs and Spring Boot";

            case "dsa" ->
                    "Practice trees, graphs and recursion";

            default ->
                    "Revise fundamentals and practice " + topic;
        };
    }

    // ================= AI FEEDBACK =================

    private String generateOverallFeedback(
            List<TopicPerformanceDTO> performance) {

        double avg = performance.stream()
                .mapToDouble(TopicPerformanceDTO::getAccuracy)
                .average()
                .orElse(0);

        if (avg >= 80) {
            return "Excellent performance. Exam ready.";
        } else if (avg >= 60) {
            return "Good performance. Improve weak areas.";
        } else if (avg >= 40) {
            return "Average. Needs focused practice.";
        } else {
            return "High risk. Immediate revision required.";
        }
    }
}