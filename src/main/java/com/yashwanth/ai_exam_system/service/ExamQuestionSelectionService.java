package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.DifficultyLevel;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.Question;
import com.yashwanth.ai_exam_system.repository.QuestionRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class ExamQuestionSelectionService {

    private final QuestionRepository questionRepository;

    public ExamQuestionSelectionService(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    public List<Question> selectQuestionsForExam(Exam exam, Long studentId) {
        return selectQuestionsForExam(exam, studentId, null);
    }

    public List<Question> selectQuestionsForExam(Exam exam, Long studentId, Long attemptId) {
        if (exam == null || exam.getExamCode() == null || exam.getExamCode().isBlank()) {
            return List.of();
        }

        List<Question> activeQuestions = questionRepository.findByExamCodeAndActiveTrue(exam.getExamCode());
        if (activeQuestions.isEmpty()) {
            return List.of();
        }

        int easyLimit = safeCount(exam.getEasyQuestionCount());
        int mediumLimit = safeCount(exam.getMediumQuestionCount());
        int hardLimit = safeCount(exam.getDifficultQuestionCount());

        if (easyLimit == 0 && mediumLimit == 0 && hardLimit == 0) {
            return orderByDifficulty(activeQuestions, exam, studentId, attemptId);
        }

        List<Question> selected = new ArrayList<>();
        selected.addAll(selectByDifficulty(activeQuestions, DifficultyLevel.EASY, easyLimit, exam, studentId, attemptId));
        selected.addAll(selectByDifficulty(activeQuestions, DifficultyLevel.MEDIUM, mediumLimit, exam, studentId, attemptId));
        selected.addAll(selectByDifficulty(activeQuestions, DifficultyLevel.DIFFICULT, hardLimit, exam, studentId, attemptId));

        if (selected.isEmpty()) {
            return orderByDifficulty(activeQuestions, exam, studentId, attemptId);
        }

        return selected;
    }

    private List<Question> selectByDifficulty(
            List<Question> questions,
            DifficultyLevel level,
            int limit,
            Exam exam,
            Long studentId,
            Long attemptId) {

        if (limit <= 0) {
            return List.of();
        }

        List<Question> bucket = questions.stream()
                .filter(question -> level.equals(question.getDifficultyLevel()))
                .collect(Collectors.toCollection(ArrayList::new));

        if (bucket.isEmpty()) {
            return List.of();
        }

        bucket = orderQuestions(bucket, exam, studentId, attemptId, level.name());
        return bucket.size() <= limit ? bucket : new ArrayList<>(bucket.subList(0, limit));
    }

    private List<Question> orderByDifficulty(List<Question> questions, Exam exam, Long studentId, Long attemptId) {
        List<Question> ordered = new ArrayList<>();
        ordered.addAll(orderQuestions(filterByDifficulty(questions, DifficultyLevel.EASY), exam, studentId, attemptId, "EASY"));
        ordered.addAll(orderQuestions(filterByDifficulty(questions, DifficultyLevel.MEDIUM), exam, studentId, attemptId, "MEDIUM"));
        ordered.addAll(orderQuestions(filterByDifficulty(questions, DifficultyLevel.DIFFICULT), exam, studentId, attemptId, "DIFFICULT"));
        return ordered;
    }

    private List<Question> filterByDifficulty(List<Question> questions, DifficultyLevel level) {
        return questions.stream()
                .filter(question -> level.equals(question.getDifficultyLevel()))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private List<Question> orderQuestions(List<Question> questions, Exam exam, Long studentId, Long attemptId, String bucketKey) {
        List<Question> ordered = new ArrayList<>(questions);
        Comparator<Question> byDisplayOrder = Comparator
                .comparing((Question question) -> question.getDisplayOrder() == null ? Integer.MAX_VALUE : question.getDisplayOrder())
                .thenComparing(question -> question.getId() == null ? Long.MAX_VALUE : question.getId());

        if (Boolean.TRUE.equals(exam.getShuffleQuestions())) {
            ordered.sort(Comparator.comparing(question -> question.getId() == null ? Long.MAX_VALUE : question.getId()));
            Collections.shuffle(ordered, new Random(seedFor(exam.getExamCode(), studentId, attemptId, bucketKey)));
            return ordered;
        }

        ordered.sort(byDisplayOrder);
        return ordered;
    }

    private int safeCount(Integer value) {
        return Math.max(value == null ? 0 : value, 0);
    }

    private long seedFor(String examCode, Long studentId, Long attemptId, String bucketKey) {
        String raw = String.valueOf(examCode)
                + ":" + String.valueOf(studentId)
                + ":" + String.valueOf(attemptId)
                + ":" + String.valueOf(bucketKey);
        return raw.hashCode() & 0xffffffffL;
    }

}
