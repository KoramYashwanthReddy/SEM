package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.*;
import com.yashwanth.ai_exam_system.repository.ExamResultRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
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
    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final ExamQuestionSelectionService questionSelectionService;

    public ExamEvaluationService(
            StudentAnswerRepository answerRepository,
            QuestionRepository questionRepository,
            ExamResultRepository resultRepository,
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository,
            ExamQuestionSelectionService questionSelectionService) {

        this.answerRepository = answerRepository;
        this.questionRepository = questionRepository;
        this.resultRepository = resultRepository;
        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.questionSelectionService = questionSelectionService;
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

        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new RuntimeException("Exam not found"));
        List<Question> questions = questionSelectionService.selectQuestionsForExam(exam, studentId, attemptId);

        for (Question question : questions) {
            StudentAnswer studentAnswer = answerRepository
                    .findByAttemptIdAndQuestionId(attemptId, question.getId())
                    .orElseGet(() -> {
                        StudentAnswer sa = new StudentAnswer();
                        sa.setAttemptId(attemptId);
                        sa.setQuestionId(question.getId());
                        sa.setStatus("NOT_ANSWERED");
                        sa.setAnswer("");
                        sa.setVisited(false);
                        sa.setIsCorrect(false);
                        sa.setMarksObtained(0);
                        return sa;
                    });

            String correctAnswer = question.getCorrectAnswer();
            String studentAnswerValue = studentAnswer.getAnswer();

            int questionMarks = question.getMarks() == null ? 0 : question.getMarks();
            totalMarks += questionMarks;

            DifficultyLevel level = question.getDifficultyLevel();

            // count totals
            if (level == DifficultyLevel.EASY)
                easyTotal++;
            else if (level == DifficultyLevel.MEDIUM)
                mediumTotal++;
            else if (level == DifficultyLevel.DIFFICULT)
                difficultTotal++;

            // unanswered check
            if (studentAnswerValue == null || studentAnswerValue.trim().isEmpty()) {
                unanswered++;
                studentAnswer.setIsCorrect(false);
                studentAnswer.setMarksObtained(0);
                answerRepository.save(studentAnswer);
                continue;
            }

            boolean isCorrect = correctAnswer != null &&
                    studentAnswerValue.trim().equalsIgnoreCase(correctAnswer.trim());

            if (isCorrect) {
                studentAnswer.setIsCorrect(true);
                studentAnswer.setMarksObtained(questionMarks);
                obtainedMarks += questionMarks;
                correct++;

                if (level == DifficultyLevel.EASY)
                    easyCorrect++;
                else if (level == DifficultyLevel.MEDIUM)
                    mediumCorrect++;
                else
                    difficultCorrect++;

            } else {
                studentAnswer.setIsCorrect(false);
                studentAnswer.setMarksObtained(0);
                wrong++;

                if (level == DifficultyLevel.EASY)
                    easyWrong++;
                else if (level == DifficultyLevel.MEDIUM)
                    mediumWrong++;
                else
                    difficultWrong++;
            }
            answerRepository.save(studentAnswer);
        }

        double percentage = totalMarks == 0 ? 0 : (obtainedMarks * 100.0) / totalMarks;

        boolean passed = percentage >= 40;

        ExamResult result = resultRepository.findByAttemptId(attemptId)
                .orElseGet(() -> {
                    ExamResult er = new ExamResult();
                    er.setAttemptId(attemptId);
                    er.setStudentId(studentId);
                    er.setExamCode(examCode);
                    return er;
                });

        result.setTotalQuestions(questions.size());
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

        LocalDateTime now = LocalDateTime.now();
        result.setSubmittedAt(now);
        result.setEvaluatedAt(now);

        long timeTakenSeconds = resolveTimeTakenSeconds(attemptId, now);
        result.setTimeTakenSeconds(timeTakenSeconds);

        return resultRepository.save(result);
    }

    private long resolveTimeTakenSeconds(Long attemptId, LocalDateTime fallbackEndTime) {
        return attemptRepository.findById(attemptId)
                .map(attempt -> {
                    if (attempt.getTimeTakenSeconds() != null && attempt.getTimeTakenSeconds() > 0) {
                        return attempt.getTimeTakenSeconds();
                    }
                    LocalDateTime startTime = attempt.getStartTime();
                    LocalDateTime endTime = attempt.getEndTime() != null ? attempt.getEndTime() : fallbackEndTime;
                    if (startTime != null && endTime != null && endTime.isAfter(startTime)) {
                        return java.time.Duration.between(startTime, endTime).getSeconds();
                    }
                    if (attempt.getDurationMinutes() != null && attempt.getDurationMinutes() > 0) {
                        return attempt.getDurationMinutes() * 60L;
                    }
                    return 0L;
                })
                .orElse(0L);
    }
}
