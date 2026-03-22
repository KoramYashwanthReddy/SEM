package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.QuestionResponse;
import com.yashwanth.ai_exam_system.entity.Question;
import com.yashwanth.ai_exam_system.repository.QuestionRepository;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class QuestionService {

    private final QuestionRepository questionRepository;

    public QuestionService(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    // =========================================================
    // LOAD QUESTIONS
    // =========================================================

    public List<QuestionResponse> getQuestionsByExam(String examCode) {

        List<Question> questions = questionRepository.findByExamCode(examCode);

        questions = questions.stream()
                .filter(q -> q.getActive() == null || q.getActive())
                .collect(Collectors.toList());

        Collections.shuffle(questions);

        return questions.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // =========================================================
    // DIFFICULTY DISTRIBUTION
    // =========================================================

    public List<QuestionResponse> getQuestionsByDifficulty(
            String examCode,
            int easy,
            int medium,
            int hard) {

        List<Question> questions = questionRepository.findByExamCode(examCode);

        List<Question> easyQ = questions.stream()
                .filter(q -> "EASY".equalsIgnoreCase(q.getDifficulty()))
                .collect(Collectors.toList());

        List<Question> mediumQ = questions.stream()
                .filter(q -> "MEDIUM".equalsIgnoreCase(q.getDifficulty()))
                .collect(Collectors.toList());

        List<Question> hardQ = questions.stream()
                .filter(q -> "HARD".equalsIgnoreCase(q.getDifficulty()))
                .collect(Collectors.toList());

        Collections.shuffle(easyQ);
        Collections.shuffle(mediumQ);
        Collections.shuffle(hardQ);

        List<Question> finalList = new ArrayList<>();

        finalList.addAll(easyQ.stream().limit(easy).toList());
        finalList.addAll(mediumQ.stream().limit(medium).toList());
        finalList.addAll(hardQ.stream().limit(hard).toList());

        Collections.shuffle(finalList);

        return finalList.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // =========================================================
    // OPTION SHUFFLE ENGINE (CORE)
    // =========================================================

    private QuestionResponse mapToResponse(Question q) {

        QuestionResponse response = new QuestionResponse();

        response.setId(q.getId());
        response.setQuestionText(q.getQuestionText());
        response.setQuestionType(q.getQuestionType().name());
        response.setMarks(q.getMarks());
        response.setDifficulty(q.getDifficulty());
        response.setTopic(q.getTopic());

        response.setSampleInput(q.getSampleInput());
        response.setSampleOutput(q.getSampleOutput());

        // ================= OPTION RANDOMIZER =================

        List<String> allOptions = new ArrayList<>();

        if (q.getOptionA() != null) allOptions.add(q.getOptionA());
        if (q.getOptionB() != null) allOptions.add(q.getOptionB());
        if (q.getOptionC() != null) allOptions.add(q.getOptionC());
        if (q.getOptionD() != null) allOptions.add(q.getOptionD());
        if (q.getOptionE() != null) allOptions.add(q.getOptionE());
        if (q.getOptionF() != null) allOptions.add(q.getOptionF());

        String correctAnswer = q.getCorrectAnswer();

        // remove correct answer
        List<String> wrongOptions = allOptions.stream()
                .filter(opt -> !opt.equals(correctAnswer))
                .collect(Collectors.toList());

        Collections.shuffle(wrongOptions);

        List<String> finalOptions = new ArrayList<>();
        finalOptions.add(correctAnswer);

        for (int i = 0; i < Math.min(3, wrongOptions.size()); i++) {
            finalOptions.add(wrongOptions.get(i));
        }

        Collections.shuffle(finalOptions);

        // ensure 4 options
        while (finalOptions.size() < 4) {
            finalOptions.add("");
        }

        response.setOptionA(finalOptions.get(0));
        response.setOptionB(finalOptions.get(1));
        response.setOptionC(finalOptions.get(2));
        response.setOptionD(finalOptions.get(3));

        return response;
    }
}