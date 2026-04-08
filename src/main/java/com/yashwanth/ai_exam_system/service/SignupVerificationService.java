package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.AuthResponse;
import com.yashwanth.ai_exam_system.dto.RegisterRequest;
import com.yashwanth.ai_exam_system.dto.SignupOtpResendRequest;
import com.yashwanth.ai_exam_system.dto.SignupOtpVerifyRequest;
import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.SignupOtpToken;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.exception.ConflictException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.exception.ValidationException;
import com.yashwanth.ai_exam_system.repository.SignupOtpTokenRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import com.yashwanth.ai_exam_system.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class SignupVerificationService {

    private static final Logger log = LoggerFactory.getLogger(SignupVerificationService.class);
    private static final int OTP_EXPIRY_MINUTES = 10;

    private final SignupOtpTokenRepository otpTokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final JwtService jwtService;

    public SignupVerificationService(
            SignupOtpTokenRepository otpTokenRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            JwtService jwtService
    ) {
        this.otpTokenRepository = otpTokenRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.jwtService = jwtService;
    }

    @Transactional
    public Map<String, Object> startSignup(RegisterRequest request) {
        String email = normalize(request.getEmail());
        String name = normalize(request.getName());
        String password = request.getPassword();

        if (email.isBlank()) {
            throw new ValidationException("Email is required");
        }
        if (name.isBlank()) {
            throw new ValidationException("Name is required");
        }
        if (password == null || password.length() < 6) {
            throw new ValidationException("Password must be at least 6 characters");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Email already registered");
        }

        SignupOtpToken pending = otpTokenRepository.findByEmailIgnoreCase(email)
                .orElseGet(SignupOtpToken::new);
        pending.setEmail(email);
        pending.setName(name);
        pending.setPasswordHash(passwordEncoder.encode(password));
        pending.setOtp(generateOtp());
        pending.setExpiryTime(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
        otpTokenRepository.save(pending);

        log.info("Signup OTP generated for {}", email);
        emailService.sendSignupOtpEmail(email, name, pending.getOtp(), OTP_EXPIRY_MINUTES);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Verification code sent to email");
        response.put("id", pending.getId());
        response.put("email", email);
        response.put("expiresInSeconds", OTP_EXPIRY_MINUTES * 60);
        response.put("liveFor", OTP_EXPIRY_MINUTES * 60);
        return response;
    }

    @Transactional
    public AuthResponse verifySignupOtp(SignupOtpVerifyRequest request) {
        String email = normalize(request.getEmail());
        String otp = normalize(request.getOtp());

        SignupOtpToken pending = otpTokenRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("No pending signup found"));

        if (pending.getExpiryTime().isBefore(LocalDateTime.now())) {
            otpTokenRepository.delete(pending);
            throw new ValidationException("OTP expired");
        }

        if (!pending.getOtp().equals(otp)) {
            throw new ValidationException("Invalid OTP");
        }

        if (userRepository.existsByEmailIgnoreCase(email)) {
            otpTokenRepository.delete(pending);
            throw new ConflictException("Email already registered");
        }

        User user = new User();
        user.setName(pending.getName());
        user.setEmail(email);
        user.setPassword(pending.getPasswordHash());
        user.setRole(Role.STUDENT);
        user.setEnabled(true);
        user.setAccountNonLocked(true);
        userRepository.save(user);
        otpTokenRepository.delete(pending);

        log.info("Student signup verified for {}", email);
        return buildAuthResponse(user);
    }

    @Transactional
    public Map<String, Object> resendSignupOtp(SignupOtpResendRequest request) {
        String email = normalize(request.getEmail());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Email already registered");
        }

        SignupOtpToken pending = otpTokenRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("No pending signup found"));

        pending.setOtp(generateOtp());
        pending.setExpiryTime(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
        otpTokenRepository.save(pending);
        emailService.sendSignupOtpEmail(email, pending.getName(), pending.getOtp(), OTP_EXPIRY_MINUTES);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Verification code resent");
        response.put("id", pending.getId());
        response.put("email", email);
        response.put("expiresInSeconds", OTP_EXPIRY_MINUTES * 60);
        response.put("liveFor", OTP_EXPIRY_MINUTES * 60);
        return response;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> checkSignupEmailExists(String value) {
        String email = normalize(value);
        boolean exists = !email.isBlank() && userRepository.existsByEmailIgnoreCase(email);

        Map<String, Object> response = new HashMap<>();
        response.put("exists", exists);
        response.put("email", email);
        response.put("message", exists ? "Email already registered" : "Email available");
        return response;
    }

    private String generateOtp() {
        return String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateAccessToken(
                user.getEmail(),
                user.getRole().name());
        String refreshToken = jwtService.generateRefreshToken(user.getEmail());

        AuthResponse response = new AuthResponse();
        response.setAccessToken(accessToken);
        response.setRefreshToken(refreshToken);
        response.setRole(user.getRole().name());
        response.setUserId(user.getId());
        response.setName(user.getName());
        response.setEmail(user.getEmail());
        response.setEmployeeId(user.getEmployeeId());
        response.setPhone(user.getPhone());
        response.setProfileImage(user.getProfileImage());
        response.setDepartment(user.getDepartment());
        response.setDesignation(user.getDesignation());
        response.setExperienceYears(user.getExperienceYears());
        response.setQualification(user.getQualification());
        response.setExpiresIn(jwtService.getAccessTokenExpiry());
        response.setIssuedAt(LocalDateTime.now());
        return response;
    }
}
