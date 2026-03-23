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

    private static final double WEAK_THRESHOLD = 50.0;

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
                answerRepository.findByAttempt_Exam_Id(examId);

        long total = answers.size();
        long correct = answers.stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsCorrect()))
                .count();

        double accuracy = total == 0 ? 0 :
                (correct * 100.0) / total;

        return Map.of(
                "totalAnswers", total,
                "correctAnswers", correct,
                "accuracy", accuracy
        );
    }

    // ================= CLASS PERFORMANCE =================

    public Map<String, Object> analyzeClassPerformance(Long examId) {

        List<StudentAnswer> answers =
                answerRepository.findByAttempt_Exam_Id(examId);

        Map<Long, List<StudentAnswer>> grouped =
                answers.stream()
                        .collect(Collectors.groupingBy(
                                a -> a.getAttempt().getStudentId()
                        ));

        List<Double> scores = grouped.values().stream()
                .map(studentAnswers -> {

                    long correct = studentAnswers.stream()
                            .filter(a -> Boolean.TRUE.equals(a.getIsCorrect()))
                            .count();

                    return studentAnswers.isEmpty() ? 0 :
                            (correct * 100.0) / studentAnswers.size();
                })
                .collect(Collectors.toList());

        double avg = scores.stream()
                .mapToDouble(Double::doubleValue)
                .average().orElse(0);

        return Map.of(
                "averageScore", avg,
                "totalStudents", grouped.size()
        );
    }

    // ================= WEAK TOPICS =================

    public Map<String, Object> detectWeakTopics(Long studentId) {

        AIAnalysisResponse response = analyzeStudent(studentId);

        return Map.of(
                "weakTopics", response.getWeakTopics(),
                "feedback", response.getOverallFeedback()
        );
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

        String level =
                risk > 70 ? "HIGH" :
                risk > 40 ? "MEDIUM" : "LOW";

        return Map.of(
                "riskScore", risk,
                "level", level
        );
    }

    // ================= INTERNAL HELPERS =================

    private Map<String, TopicPerformanceDTO> buildTopicPerformance(
            List<StudentAnswer> answers) {

        Map<Long, Question> questionCache =
                questionRepository.findAllById(
                        answers.stream()
                                .map(StudentAnswer::getQuestionId)
                                .collect(Collectors.toSet())
                ).stream()
                .collect(Collectors.toMap(Question::getId, q -> q));

        Map<String, TopicPerformanceDTO> topicMap = new HashMap<>();

        for (StudentAnswer answer : answers) {

            Question question = questionCache.get(answer.getQuestionId());
            if (question == null) continue;

            String topic = Optional.ofNullable(question.getTopic())
                    .orElse("General");

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

        return performance.stream()
                .filter(dto -> dto.getAccuracy() < WEAK_THRESHOLD)
                .map(dto -> {

                    WeakTopicDTO weak = new WeakTopicDTO();
                    weak.setTopic(dto.getTopic());
                    weak.setAccuracy(dto.getAccuracy());
                    weak.setRecommendation(
                            generateRecommendation(dto.getTopic())
                    );
                    return weak;

                })
                .collect(Collectors.toList());
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