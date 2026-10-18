package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.*;
import com.yashwanth.ai_exam_system.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExamEvaluationServiceTest {

    @Mock
    private StudentAnswerRepository answerRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private ExamResultRepository resultRepository;

    @Mock
    private ExamRepository examRepository;

    @Mock
    private ExamAttemptRepository attemptRepository;

    @Mock
    private ExamQuestionSelectionService questionSelectionService;

    @Mock
    private CertificateService certificateService;

    private ExamEvaluationService evaluationService;

    @BeforeEach
    void setUp() {
        evaluationService = new ExamEvaluationService(
                answerRepository,
                questionRepository,
                resultRepository,
                examRepository,
                attemptRepository,
                questionSelectionService,
                certificateService
        );
    }

    @Test
    void testEvaluateExamFunctionalCorrectness() {
        Long attemptId = 100L;
        Long studentId = 10L;
        String examCode = "EXAM1";

        Exam exam = new Exam();
        exam.setId(1L);
        exam.setExamCode(examCode);
        exam.setMarksPerQuestion(5.0);
        exam.setPassingMarks(50);

        Question q1 = new Question();
        q1.setId(1L);
        q1.setCorrectAnswer("A");
        q1.setMarks(5);
        q1.setDifficultyLevel(DifficultyLevel.EASY);

        Question q2 = new Question();
        q2.setId(2L);
        q2.setCorrectAnswer("B");
        q2.setMarks(5);
        q2.setDifficultyLevel(DifficultyLevel.MEDIUM);

        List<Question> questions = List.of(q1, q2);

        StudentAnswer sa1 = new StudentAnswer();
        sa1.setAttemptId(attemptId);
        sa1.setQuestionId(1L);
        sa1.setAnswer("A");

        when(examRepository.findByExamCode(examCode)).thenReturn(Optional.of(exam));
        when(questionSelectionService.selectQuestionsForExam(exam, studentId, attemptId)).thenReturn(questions);
        when(answerRepository.findByAttemptId(attemptId)).thenReturn(List.of(sa1));

        when(resultRepository.findByAttemptId(attemptId)).thenReturn(Optional.empty());
        when(resultRepository.saveAndFlush(any(ExamResult.class))).thenAnswer(i -> i.getArgument(0));

        ExamResult result = evaluationService.evaluateExam(attemptId, studentId, examCode);

        assertThat(result).isNotNull();
        assertThat(result.getTotalQuestions()).isEqualTo(2);
        assertThat(result.getCorrectAnswers()).isEqualTo(1);
        assertThat(result.getUnansweredQuestions()).isEqualTo(1);
        assertThat(result.getScore()).isEqualTo(5);
        assertThat(result.getPercentage()).isEqualTo(50.0);
        assertThat(result.getResultStatus()).isEqualTo("PASS");
        assertThat(result.getPassed()).isTrue();

        verify(certificateService, times(1)).issueCertificateForPassedResult(eq(result), eq(""));
    }

    @Test
    void benchmarkAndNPlusOneCheck() {
        Long attemptId = 200L;
        Long studentId = 20L;
        String examCode = "EXAM_BENCHMARK";

        Exam exam = new Exam();
        exam.setId(2L);
        exam.setExamCode(examCode);
        exam.setMarksPerQuestion(2.0);
        exam.setPassingMarks(40);

        int questionCount = 500;
        List<Question> questions = new ArrayList<>(questionCount);
        List<StudentAnswer> existingAnswers = new ArrayList<>(questionCount);

        for (long i = 1; i <= questionCount; i++) {
            Question q = new Question();
            q.setId(i);
            q.setCorrectAnswer("A");
            q.setMarks(2);
            q.setDifficultyLevel(DifficultyLevel.EASY);
            questions.add(q);

            StudentAnswer sa = new StudentAnswer();
            sa.setAttemptId(attemptId);
            sa.setQuestionId(i);
            sa.setAnswer(i % 2 == 0 ? "A" : "B");
            existingAnswers.add(sa);
        }

        when(examRepository.findByExamCode(examCode)).thenReturn(Optional.of(exam));
        when(questionSelectionService.selectQuestionsForExam(exam, studentId, attemptId)).thenReturn(questions);
        when(answerRepository.findByAttemptId(attemptId)).thenReturn(existingAnswers);
        when(resultRepository.findByAttemptId(attemptId)).thenReturn(Optional.empty());
        when(resultRepository.saveAndFlush(any(ExamResult.class))).thenAnswer(i -> i.getArgument(0));

        // Measure time
        long start = System.nanoTime();
        for (int run = 0; run < 50; run++) {
            evaluationService.evaluateExam(attemptId, studentId, examCode);
        }
        long durationMs = (System.nanoTime() - start) / 1_000_000;

        System.out.println("Execution time for 50 evaluations of 500 questions: " + durationMs + " ms");

        // Verify number of findByAttemptIdAndQuestionId calls
        int findByIdAndQuestionIdCalls = mockingDetails(answerRepository)
                .getInvocations()
                .stream()
                .filter(inv -> inv.getMethod().getName().equals("findByAttemptIdAndQuestionId"))
                .toList()
                .size();

        System.out.println("Calls to findByAttemptIdAndQuestionId: " + findByIdAndQuestionIdCalls);
        assertThat(findByIdAndQuestionIdCalls).isEqualTo(0);
    }
}
