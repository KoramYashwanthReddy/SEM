package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.QuestionResponse;
import com.yashwanth.ai_exam_system.entity.Question;
import com.yashwanth.ai_exam_system.repository.QuestionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class QuestionService {

    private final QuestionRepository questionRepository;

    public QuestionService(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    public List<QuestionResponse> getQuestionsByExam(String examCode) {

        List<Question> questions = questionRepository.findByExamCode(examCode);

        return questions.stream().map(q -> {

            QuestionResponse response = new QuestionResponse();

            response.setId(q.getId());
            response.setQuestionText(q.getQuestionText());
            response.setOptionA(q.getOptionA());
            response.setOptionB(q.getOptionB());
            response.setOptionC(q.getOptionC());
            response.setOptionD(q.getOptionD());
            response.setQuestionType(q.getQuestionType().name());
            response.setMarks(q.getMarks());

            return response;

        }).collect(Collectors.toList());
    }
}