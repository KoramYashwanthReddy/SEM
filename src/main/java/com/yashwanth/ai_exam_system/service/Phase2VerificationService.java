package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.Exam;
import com.yashwanth.ai_exam_system.entity.ExamRegistration;
import com.yashwanth.ai_exam_system.entity.Phase2VerificationChallenge;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.exception.ConflictException;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.repository.ExamRegistrationRepository;
import com.yashwanth.ai_exam_system.repository.ExamRepository;
import com.yashwanth.ai_exam_system.repository.Phase2VerificationChallengeRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class Phase2VerificationService {

    private static final int EXPIRY_MINUTES = 15;

    private final Phase2VerificationChallengeRepository challengeRepository;
    private final ExamRepository examRepository;
    private final ExamRegistrationRepository examRegistrationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Value("${app.frontend.base-url:http://localhost:8080}")
    private String frontendBaseUrl;

    public Phase2VerificationService(
            Phase2VerificationChallengeRepository challengeRepository,
            ExamRepository examRepository,
            ExamRegistrationRepository examRegistrationRepository,
            UserRepository userRepository,
            EmailService emailService
    ) {
        this.challengeRepository = challengeRepository;
        this.examRepository = examRepository;
        this.examRegistrationRepository = examRegistrationRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    @Transactional
    public Map<String, Object> sendVerificationEmail(Long studentId, String examCode, String requestBaseUrl) {
        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        if (!exam.isPublished() || !exam.isActive()) {
            throw new ForbiddenException("Only active published exams can be verified");
        }
        if (!exam.isInPhase2()) {
            throw new ForbiddenException("Phase 2 verification is not available at this time");
        }
        if (examRegistrationRepository.findByStudentIdAndExamCode(studentId, examCode).isPresent()) {
            throw new ConflictException("You are already registered for this exam");
        }

        challengeRepository.deleteByStudentIdAndExamCodeAndConsumedAtIsNull(studentId, examCode);

        String otp = generateOtp();
        String token = UUID.randomUUID().toString().replace("-", "");
        Phase2VerificationChallenge challenge = new Phase2VerificationChallenge();
        challenge.setStudentId(studentId);
        challenge.setExamId(exam.getId());
        challenge.setExamCode(examCode);
        challenge.setEmail(student.getEmail());
        challenge.setVerificationOtpHash(hash(otp));
        challenge.setVerificationTokenHash(hash(token));
        challenge.setExpiresAt(LocalDateTime.now().plusMinutes(EXPIRY_MINUTES));
        challenge.setVerificationMethod("PENDING");
        challengeRepository.save(challenge);

        String baseUrl = normalizeBaseUrl(requestBaseUrl);
        String confirmLink = UriComponentsBuilder.fromHttpUrl(baseUrl)
                .path("/api/public/phase2/confirm")
                .queryParam("token", token)
                .queryParam("examCode", examCode)
                .build()
                .toUriString();

        emailService.sendPhase2VerificationEmail(
                student.getEmail(),
                student.getName(),
                exam.getTitle(),
                examCode,
                otp,
                confirmLink,
                EXPIRY_MINUTES
        );

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Phase 2 verification email sent");
        response.put("examCode", examCode);
        response.put("expiresInSeconds", EXPIRY_MINUTES * 60);
        response.put("email", student.getEmail());
        return response;
    }

    @Transactional
    public Map<String, Object> completeRegistrationWithOtp(Long studentId, String examCode, String otp) {
        if (otp == null || otp.isBlank()) {
            throw new ForbiddenException("Verification code is required");
        }
        Phase2VerificationChallenge challenge = challengeRepository
                .findTopByStudentIdAndExamCodeAndConsumedAtIsNullOrderByCreatedAtDesc(studentId, examCode)
                .orElseThrow(() -> new ResourceNotFoundException("Phase 2 verification code not found"));
        return completeRegistration(challenge, otp.trim(), null);
    }

    @Transactional
    public Map<String, Object> completeRegistrationWithToken(String examCode, String token) {
        if (token == null || token.isBlank()) {
            throw new ForbiddenException("Verification link token is required");
        }
        Phase2VerificationChallenge challenge = challengeRepository
                .findTopByVerificationTokenHashAndConsumedAtIsNullOrderByCreatedAtDesc(hash(token.trim()))
                .orElseThrow(() -> new ResourceNotFoundException("Verification link expired or invalid"));
        if (!challenge.getExamCode().equalsIgnoreCase(examCode)) {
            throw new ForbiddenException("Verification link does not match this exam");
        }
        return completeRegistration(challenge, null, token.trim());
    }

    private Map<String, Object> completeRegistration(Phase2VerificationChallenge challenge, String otp, String token) {
        if (challenge.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ForbiddenException("Phase 2 verification expired");
        }

        boolean verifiedByToken = token != null;
        if (verifiedByToken) {
            if (!challenge.getVerificationTokenHash().equals(hash(token))) {
                throw new ForbiddenException("Invalid verification link");
            }
            challenge.setVerificationMethod("LINK");
        } else {
            if (!challenge.getVerificationOtpHash().equals(hash(otp))) {
                throw new ForbiddenException("Invalid verification code");
            }
            challenge.setVerificationMethod("OTP");
        }

        long studentId = challenge.getStudentId();
        String examCode = challenge.getExamCode();
        if (examRegistrationRepository.findByStudentIdAndExamCode(studentId, examCode).isPresent()) {
            challenge.setConsumedAt(LocalDateTime.now());
            challenge.setVerifiedAt(LocalDateTime.now());
            challengeRepository.save(challenge);
            throw new ConflictException("You are already registered for this exam");
        }

        Exam exam = examRepository.findByExamCode(examCode)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        ExamRegistration registration = new ExamRegistration();
        registration.setStudentId(studentId);
        registration.setExamId(exam.getId());
        registration.setExamCode(examCode);
        registration.setActive(true);
        registration.setSource(verifiedByToken ? "PHASE2_LINK" : "PHASE2_OTP");
        registration.setRegistrationPhase("PHASE2");
        registration.setPhase2Verified(true);
        registration.setPhase2VerificationMethod(challenge.getVerificationMethod());
        registration.setPhase2VerificationCodeHash(hash(otp != null ? otp : token));
        registration.setPhase2VerifiedAt(LocalDateTime.now());
        registration.setRegisteredAt(LocalDateTime.now());
        examRegistrationRepository.save(registration);

        challenge.setConsumedAt(LocalDateTime.now());
        challenge.setVerifiedAt(LocalDateTime.now());
        challengeRepository.save(challenge);

        Map<String, Object> response = new HashMap<>();
        response.put("registered", true);
        response.put("studentId", studentId);
        response.put("examCode", examCode);
        response.put("registrationId", registration.getId());
        response.put("registrationPhase", registration.getRegistrationPhase());
        response.put("phase2Verified", true);
        response.put("phase2VerifiedAt", registration.getPhase2VerifiedAt());
        response.put("phase2VerificationMethod", registration.getPhase2VerificationMethod());
        response.put("studentEmail", student.getEmail());
        return response;
    }

    private String normalizeBaseUrl(String requestBaseUrl) {
        String base = requestBaseUrl;
        if (base == null || base.isBlank()) {
            base = frontendBaseUrl;
        }
        return base.replaceAll("/+$", "");
    }

    private String generateOtp() {
        return String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Unable to hash verification payload", ex);
        }
    }
}
