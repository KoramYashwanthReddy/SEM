package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.TeacherDashboardResponse;
import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamAttempt;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.repository.ExamAttemptRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class TeacherDashboardService {

    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final UserRepository userRepository;

    public TeacherDashboardService(
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository,
            UserRepository userRepository) {

        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.userRepository = userRepository;
    }

    public TeacherDashboardResponse getDashboard(Authentication auth) {

        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            throw new ForbiddenException("Authenticated teacher/admin is required");
        }
        List<Exam> exams =
                isAdmin(auth)
                        ? examRepository.findAllActiveOrderByCreatedAtDesc()
                        : examRepository.findAllActiveOrderByCreatedAtDesc()
                                .stream()
                                .filter(exam -> isOwnerMatch(auth, exam.getCreatedBy()))
                                .toList();

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

            if (attempt.getTotalMarks() == null || attempt.getTotalMarks() <= 0 || attempt.getObtainedMarks() == null) continue;

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
                        .filter(attempt -> Boolean.TRUE.equals(attempt.getCheatingFlag()))
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

    private boolean isAdmin(Authentication auth) {
        if (auth == null || auth.getAuthorities() == null) return false;
        for (GrantedAuthority authority : auth.getAuthorities()) {
            String role = authority == null ? "" : String.valueOf(authority.getAuthority());
            if ("ROLE_ADMIN".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role)) {
                return true;
            }
        }
        return false;
    }

    private boolean isOwnerMatch(Authentication auth, String createdByRaw) {
        String owner = createdByRaw == null ? "" : createdByRaw.trim();
        if (owner.isBlank()) {
            return false;
        }

        String actor = auth == null || auth.getName() == null ? "" : auth.getName().trim();
        if (!actor.isBlank() && owner.equalsIgnoreCase(actor)) {
            return true;
        }

        User actorUser = resolveUserByIdentifier(actor);
        if (actorUser == null) {
            return false;
        }

        return matchesTeacher(owner, actorUser);
    }

    private User resolveUserByIdentifier(String identifier) {
        String value = identifier == null ? "" : identifier.trim();
        if (value.isBlank()) {
            return null;
        }
        return userRepository.findByEmailIgnoreCase(value)
                .or(() -> userRepository.findByEmployeeIdIgnoreCase(value))
                .orElse(null);
    }

    private boolean matchesTeacher(String createdBy, User actorUser) {
        String owner = normalizeForMatch(createdBy);
        if (owner.isBlank() || actorUser == null) {
            return false;
        }

        return normalizeForMatch(actorUser.getEmail()).equals(owner)
                || normalizeForMatch(actorUser.getName()).equals(owner)
                || normalizeForMatch(actorUser.getEmployeeId()).equals(owner)
                || normalizeForMatch(actorUser.getDepartment()).equals(owner)
                || normalizeForMatch(actorUser.getDesignation()).equals(owner);
    }

    private String normalizeForMatch(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase().replaceAll("\\s+", " ");
    }
}
