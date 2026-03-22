package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.*;
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
        int unanswered = 0;

        int obtainedMarks = 0;
        int totalMarks = 0;

        // difficulty tracking
        int easyTotal = 0, mediumTotal = 0, difficultTotal = 0;
        int easyCorrect = 0, mediumCorrect = 0, difficultCorrect = 0;
        int easyWrong = 0, mediumWrong = 0, difficultWrong = 0;

        for (StudentAnswer studentAnswer : answers) {

            Question question = questionRepository
                    .findById(studentAnswer.getQuestionId())
                    .orElseThrow(() -> new RuntimeException("Question not found"));

            String correctAnswer = question.getCorrectAnswer();
            String studentAnswerValue = studentAnswer.getAnswer();

            int questionMarks = question.getMarks() == null ? 0 : question.getMarks();
            totalMarks += questionMarks;

            DifficultyLevel level = question.getDifficultyLevel();

            // count totals
            if (level == DifficultyLevel.EASY) easyTotal++;
            else if (level == DifficultyLevel.MEDIUM) mediumTotal++;
            else if (level == DifficultyLevel.DIFFICULT) difficultTotal++;

            // unanswered check
            if (studentAnswerValue == null || studentAnswerValue.trim().isEmpty()) {
                unanswered++;
                studentAnswer.setIsCorrect(false);
                studentAnswer.setMarksObtained(0);
                continue;
            }

            boolean isCorrect = correctAnswer != null &&
                    studentAnswerValue.trim().equalsIgnoreCase(correctAnswer.trim());

            if (isCorrect) {

                studentAnswer.setIsCorrect(true);
                studentAnswer.setMarksObtained(questionMarks);

                obtainedMarks += questionMarks;
                correct++;

                if (level == DifficultyLevel.EASY) easyCorrect++;
                else if (level == DifficultyLevel.MEDIUM) mediumCorrect++;
                else difficultCorrect++;

            } else {

                studentAnswer.setIsCorrect(false);
                studentAnswer.setMarksObtained(0);

                wrong++;

                if (level == DifficultyLevel.EASY) easyWrong++;
                else if (level == DifficultyLevel.MEDIUM) mediumWrong++;
                else difficultWrong++;
            }
        }

        answerRepository.saveAll(answers);

        double percentage = totalMarks == 0 ? 0 :
                (obtainedMarks * 100.0) / totalMarks;

        boolean passed = percentage >= 40;

        ExamResult result = new ExamResult();
        result.setAttemptId(attemptId);
        result.setStudentId(studentId);
        result.setExamCode(examCode);

        result.setTotalQuestions(answers.size());
        result.setCorrectAnswers(correct);
        result.setWrongAnswers(wrong);

        // unanswered support
        result.setUnansweredQuestions(unanswered);

        result.setScore(obtainedMarks);
        result.setPercentage(percentage);

        result.setResultStatus(passed ? "PASS" : "FAIL");
        result.setPassed(passed);

        // difficulty stats
        result.setEasyQuestions(easyTotal);
        result.setMediumQuestions(mediumTotal);
        result.setDifficultQuestions(difficultTotal);

        result.setEasyCorrect(easyCorrect);
        result.setMediumCorrect(mediumCorrect);
        result.setDifficultCorrect(difficultCorrect);

        result.setEasyWrong(easyWrong);
        result.setMediumWrong(mediumWrong);
        result.setDifficultWrong(difficultWrong);

        result.setSubmittedAt(LocalDateTime.now());
        result.setEvaluatedAt(LocalDateTime.now());

        return resultRepository.save(result);
    }
}