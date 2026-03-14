package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.ExamResult;
import com.yashwanth.ai_exam_system.entity.Question;
import com.yashwanth.ai_exam_system.entity.StudentAnswer;
import com.yashwanth.ai_exam_system.repository.ExamResultRepository;
import com.yashwanth.ai_exam_system.repository.QuestionRepository;
import com.yashwanth.ai_exam_system.repository.StudentAnswerRepository;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ExamEvaluationService {

    private final StudentAnswerRepository answerRepository;
    private final QuestionRepository questionRepository;
    private final ExamResultRepository resultRepository;

    public ExamEvaluationService(
            StudentAnswerRepository answerRepository,
            QuestionRepository questionRepository,
            ExamResultRepository resultRepository) {

        this.answerRepository = answerRepository;
        this.questionRepository = questionRepository;
        this.resultRepository = resultRepository;
    }

    public ExamResult evaluateExam(Long attemptId, Long studentId, String examCode) {

        List<StudentAnswer> answers = answerRepository.findByAttemptId(attemptId);

        int correct = 0;
        int wrong = 0;

        for (StudentAnswer studentAnswer : answers) {

            Question question = questionRepository
                    .findById(studentAnswer.getQuestionId())
                    .orElseThrow(() -> new RuntimeException("Question not found"));

            String correctAnswer = question.getCorrectAnswer();
            String studentAnswerValue = studentAnswer.getAnswer();

            if (studentAnswerValue != null &&
                    correctAnswer != null &&
                    studentAnswerValue.equalsIgnoreCase(correctAnswer)) {

                studentAnswer.setIsCorrect(true);
                studentAnswer.setMarksObtained(1);
                correct++;

            } else {

                studentAnswer.setIsCorrect(false);
                studentAnswer.setMarksObtained(0);
                wrong++;
            }

            answerRepository.save(studentAnswer);
        }

        int total = answers.size();

        double percentage = total == 0 ? 0 : (correct * 100.0) / total;

        ExamResult result = new ExamResult();
        result.setAttemptId(attemptId);
        result.setStudentId(studentId);
        result.setExamCode(examCode);
        result.setTotalQuestions(total);
        result.setCorrectAnswers(correct);
        result.setWrongAnswers(wrong);
        result.setScore(correct);
        result.setPercentage(percentage);
        result.setResultStatus(percentage >= 40 ? "PASS" : "FAIL");
        result.setSubmittedAt(LocalDateTime.now());

        return resultRepository.save(result);
    }
}