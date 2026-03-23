package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.TeacherDashboardResponse;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class TeacherDashboardService {

    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;

    public TeacherDashboardService(
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository) {

        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
    }

    public TeacherDashboardResponse getDashboard(Authentication auth) {

        String teacherEmail = auth.getName();

        List<Exam> exams =
                examRepository.findByCreatedBy(teacherEmail);

        List<String> examCodes =
                exams.stream().map(Exam::getExamCode).toList();

        List<ExamAttempt> attempts =
                attemptRepository.findByExamCodeIn(examCodes);

        TeacherDashboardResponse response =
                new TeacherDashboardResponse();

        response.setTotalExams(exams.size());

        response.setPublishedExams(
                (int) exams.stream()
                        .filter(Exam::isPublished)
                        .count()
        );

        response.setDraftExams(
                (int) exams.stream()
                        .filter(e -> !e.isPublished())
                        .count()
        );

        response.setTotalAttempts(attempts.size());

        response.setTotalStudents(
                attempts.stream()
                        .map(ExamAttempt::getStudentId)
                        .distinct()
                        .count()
        );

        List<Double> scores = new ArrayList<>();

        for (ExamAttempt attempt : attempts) {

            if (attempt.getTotalMarks() == null) continue;

            double percent =
                    (attempt.getObtainedMarks() * 100.0)
                            / attempt.getTotalMarks();

            scores.add(percent);
        }

        response.setAverageScore(
                scores.stream()
                        .mapToDouble(Double::doubleValue)
                        .average()
                        .orElse(0)
        );

        response.setCheatingFlags(
                attempts.stream()
                        .filter(ExamAttempt::getCheatingFlag)
                        .count()
        );

        response.setRecentExamCodes(
                examCodes.stream().limit(5).collect(Collectors.toList())
        );

        response.setPerformanceTrend(
                scores.stream().limit(10).collect(Collectors.toList())
        );

        return response;
    }
}