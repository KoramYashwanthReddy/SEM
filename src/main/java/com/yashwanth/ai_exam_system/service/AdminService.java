package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.CreateTeacherRequest;
import com.yashwanth.ai_exam_system.entity.*;
import com.yashwanth.ai_exam_system.enums.AttemptStatus;
import com.yashwanth.ai_exam_system.repository.*;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class AdminService {

    private final ExamRepository examRepository;
    private final ExamAttemptRepository attemptRepository;
    private final ProctoringEventRepository proctoringEventRepository;
    private final CheatingEvidenceRepository evidenceRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminService(
            ExamRepository examRepository,
            ExamAttemptRepository attemptRepository,
            ProctoringEventRepository proctoringEventRepository,
            CheatingEvidenceRepository evidenceRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {

        this.examRepository = examRepository;
        this.attemptRepository = attemptRepository;
        this.proctoringEventRepository = proctoringEventRepository;
        this.evidenceRepository = evidenceRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ================= TEACHER =================

    public String createTeacher(CreateTeacherRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        if (request.getEmployeeId() != null &&
                userRepository.existsByEmployeeId(request.getEmployeeId())) {
            throw new RuntimeException("Employee ID already exists");
        }

        User teacher = new User();
        teacher.setName(request.getFullName());
        teacher.setEmail(request.getEmail());
        teacher.setPassword(passwordEncoder.encode(request.getPassword()));
        teacher.setRole(Role.TEACHER);

        teacher.setPhone(request.getPhone());
        teacher.setProfileImage(request.getProfileImage());
        teacher.setDepartment(request.getDepartment());
        teacher.setDesignation(request.getDesignation());
        teacher.setExperienceYears(request.getExperienceYears());
        teacher.setQualification(request.getQualification());
        teacher.setEmployeeId(request.getEmployeeId());

        userRepository.save(teacher);

        return "Teacher created successfully";
    }

    // ================= EXAMS =================

    public List<Exam> getAllExams() {
        return examRepository.findAll();
    }

    public void deleteExam(String examCode) {
        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        exam.setActive(false);
        examRepository.save(exam);
    }

    // ================= ATTEMPTS =================

    public List<ExamAttempt> getAllAttempts() {
        return attemptRepository.findAll();
    }

    public List<ExamAttempt> getAttemptsByExam(String examCode) {
        return attemptRepository.findByExamCode(examCode);
    }

    public List<ExamAttempt> getAttemptsByStudent(Long studentId) {
        return attemptRepository.findByStudentId(studentId);
    }

    public List<ExamAttempt> getSuspiciousAttempts() {

        Set<ExamAttempt> result = new HashSet<>();

        result.addAll(
                attemptRepository.findByStatus(AttemptStatus.INVALIDATED)
        );

        result.addAll(
                attemptRepository.findByCheatingScoreGreaterThan(50)
        );

        return new ArrayList<>(result);
    }

    public List<ExamAttempt> getTopRiskAttempts() {
        return attemptRepository.findTop10ByOrderByCheatingScoreDesc();
    }

    // ================= CHEATING EVENTS =================

    public List<ProctoringEvent> getAllCheatingLogs() {
        return proctoringEventRepository.findAll();
    }

    public List<ProctoringEvent> getEventsByAttempt(Long attemptId) {
        return proctoringEventRepository.findByAttemptId(attemptId);
    }

    public Integer getCheatingScore(Long attemptId) {

        Integer score = proctoringEventRepository.getTotalScore(attemptId);

        if (score != null && score > 0) {
            return score;
        }

        return attemptRepository.findById(attemptId)
                .map(ExamAttempt::getCheatingScore)
                .orElse(0);
    }

    // ================= EVIDENCE =================

    public List<CheatingEvidence> getAllEvidence() {
        return evidenceRepository.findAll();
    }

    public List<CheatingEvidence> getEvidenceByExam(Long examId) {
        return evidenceRepository.findByExamId(examId);
    }

    public List<CheatingEvidence> getEvidenceByStudent(Long studentId) {
        return evidenceRepository.findByStudentId(studentId);
    }

    // ================= ADMIN CONTROL =================

    public void cancelAttempt(Long attemptId) {

        ExamAttempt attempt = getAttempt(attemptId);

        if (Boolean.TRUE.equals(attempt.getCancelled())) {
            return;
        }

        attempt.markCancelled("Cancelled manually by admin");
        attemptRepository.save(attempt);
    }

    public void restoreAttempt(Long attemptId) {

        ExamAttempt attempt = getAttempt(attemptId);

        if (!Boolean.TRUE.equals(attempt.getCancelled())) {
            return;
        }

        attempt.setCancelled(false);
        attempt.setStatus(AttemptStatus.STARTED);
        attempt.setActive(true);
        attempt.setRemarks("Restored by admin");

        attemptRepository.save(attempt);
    }

    // ================= DASHBOARD =================

    public Map<String, Object> getDashboardStats() {

        Map<String, Object> stats = new HashMap<>();

        stats.put("totalExams", examRepository.count());
        stats.put("totalAttempts", attemptRepository.count());
        stats.put("suspiciousAttempts", getSuspiciousAttempts().size());
        stats.put("cancelledAttempts", attemptRepository.countByCancelledTrue());
        stats.put("averageCheatingScore",
                Optional.ofNullable(attemptRepository.getAverageCheatingScore()).orElse(0.0)
        );

        stats.put("timestamp", LocalDateTime.now());

        return stats;
    }

    // ================= LIVE MONITOR =================

    public List<ExamAttempt> getLiveHighRiskAttempts() {

        return attemptRepository.findLiveAttempts(AttemptStatus.STARTED)
                .stream()
                .filter(a -> a.getCheatingScore() != null && a.getCheatingScore() >= 50)
                .sorted(Comparator.comparing(ExamAttempt::getCheatingScore).reversed())
                .collect(Collectors.toList());
    }

    // ================= HELPER =================

    private ExamAttempt getAttempt(Long attemptId) {
        return attemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));
    }
}