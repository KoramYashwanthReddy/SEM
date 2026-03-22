package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.ExamResult;
import com.yashwanth.ai_exam_system.entity.Question;
import com.yashwanth.ai_exam_system.entity.StudentAnswer;
import com.yashwanth.ai_exam_system.repository.ExamResultRepository;
import com.yashwanth.ai_exam_system.repository.QuestionRepository;
import com.yashwanth.ai_exam_system.repository.StudentAnswerRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
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
        int obtainedMarks = 0;
        int totalMarks = 0;

        for (StudentAnswer studentAnswer : answers) {

            Question question = questionRepository
                    .findById(studentAnswer.getQuestionId())
                    .orElseThrow(() -> new RuntimeException("Question not found"));

            String correctAnswer = question.getCorrectAnswer();
            String studentAnswerValue = studentAnswer.getAnswer();

            int questionMarks = question.getMarks() == null ? 0 : question.getMarks();
            totalMarks += questionMarks;

            boolean isCorrect = studentAnswerValue != null &&
                    correctAnswer != null &&
                    studentAnswerValue.trim().equalsIgnoreCase(correctAnswer.trim());

            if (isCorrect) {
                studentAnswer.setIsCorrect(true);
                studentAnswer.setMarksObtained(questionMarks);

                obtainedMarks += questionMarks;
                correct++;
            } else {
                studentAnswer.setIsCorrect(false);
                studentAnswer.setMarksObtained(0);
                wrong++;
            }
        }

        // save all answers at once (better performance)
        answerRepository.saveAll(answers);

        double percentage = totalMarks == 0 ? 0 :
                (obtainedMarks * 100.0) / totalMarks;

        ExamResult result = new ExamResult();
        result.setAttemptId(attemptId);
        result.setStudentId(studentId);
        result.setExamCode(examCode);
        result.setTotalQuestions(answers.size());
        result.setCorrectAnswers(correct);
        result.setWrongAnswers(wrong);
        result.setScore(obtainedMarks);
        result.setPercentage(percentage);
        result.setResultStatus(percentage >= 40 ? "PASS" : "FAIL");
        result.setSubmittedAt(LocalDateTime.now());

        return resultRepository.save(result);
    }
}