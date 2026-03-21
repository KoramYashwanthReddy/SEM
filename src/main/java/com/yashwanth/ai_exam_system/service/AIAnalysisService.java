package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.*;
import com.yashwanth.ai_exam_system.entity.Question;
import com.yashwanth.ai_exam_system.entity.StudentAnswer;
import com.yashwanth.ai_exam_system.repository.QuestionRepository;
import com.yashwanth.ai_exam_system.repository.StudentAnswerRepository;

import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AIAnalysisService {

    private final StudentAnswerRepository answerRepository;
    private final QuestionRepository questionRepository;

    public AIAnalysisService(StudentAnswerRepository answerRepository,
                             QuestionRepository questionRepository) {
        this.answerRepository = answerRepository;
        this.questionRepository = questionRepository;
    }

    public AIAnalysisResponse analyzeStudent(Long studentId) {

        // 🔥 FIXED: correct repository method
        List<StudentAnswer> answers =
                answerRepository.findByAttempt_StudentId(studentId);

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

        List<TopicPerformanceDTO> performanceList = new ArrayList<>();
        List<WeakTopicDTO> weakTopics = new ArrayList<>();

        for (TopicPerformanceDTO dto : topicMap.values()) {

            double accuracy = (dto.getTotalQuestions() == 0) ? 0 :
                    (dto.getCorrectAnswers() * 100.0) / dto.getTotalQuestions();

            dto.setAccuracy(accuracy);
            performanceList.add(dto);

            // 🔥 Identify weak topics
            if (accuracy < 50) {

                WeakTopicDTO weak = new WeakTopicDTO();
                weak.setTopic(dto.getTopic());
                weak.setAccuracy(accuracy);
                weak.setRecommendation(generateRecommendation(dto.getTopic()));

                weakTopics.add(weak);
            }
        }

        AIAnalysisResponse response = new AIAnalysisResponse();
        response.setPerformance(performanceList);
        response.setWeakTopics(weakTopics);
        response.setOverallFeedback(generateOverallFeedback(performanceList));

        return response;
    }

    // 🔥 Recommendation Engine
    private String generateRecommendation(String topic) {

        return switch (topic.toLowerCase()) {
            case "arrays" -> "Practice array traversal and sorting problems";
            case "dbms" -> "Revise normalization and SQL queries";
            case "os" -> "Focus on process scheduling and deadlocks";
            case "java" -> "Practice OOPs, collections and multithreading";
            case "spring" -> "Revise dependency injection and REST APIs";
            default -> "Revise fundamentals and practice more questions on " + topic;
        };
    }

    // 🔥 AI Feedback
    private String generateOverallFeedback(List<TopicPerformanceDTO> performance) {

        double avg = performance.stream()
                .mapToDouble(TopicPerformanceDTO::getAccuracy)
                .average()
                .orElse(0);

        if (avg >= 75) {
            return "Excellent performance! You are exam-ready.";
        } else if (avg >= 50) {
            return "Good effort! Focus on weak areas to improve.";
        } else {
            return "Needs improvement. Revise concepts and practice consistently.";
        }
    }
}