package com.yashwanth.ai_exam_system.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.yashwanth.ai_exam_system.dto.*;
import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.exception.ConflictException;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.exception.UnauthorizedException;
import com.yashwanth.ai_exam_system.exception.ValidationException;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import com.yashwanth.ai_exam_system.security.JwtService;

@Service
public class AuthService {

    private static final Logger logger =
            LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    // =========================================================
    // 🧑‍🎓 REGISTER (STUDENT ONLY)
    // =========================================================
    @Transactional
    public AuthResponse register(RegisterRequest request) {

        logger.info("Register attempt: {}", request.getEmail());

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ConflictException("Email already registered");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        // Force STUDENT role
        user.setRole(Role.STUDENT);

        userRepository.save(user);

        logger.info("Student registered successfully: {}", user.getEmail());

        return buildAuthResponse(user);
    }

    // =========================================================
    // 🔐 LOGIN
    // =========================================================
    public AuthResponse login(LoginRequest request) {

        String identifier = request.getEmail() == null ? "" : request.getEmail().trim();
        if (identifier.isBlank()) {
            throw new ValidationException("Email or employee ID is required");
        }

        logger.info("Login attempt: {}", identifier);

        User user = userRepository.findByEmailIgnoreCase(identifier)
                .or(() -> userRepository.findByEmployeeIdIgnoreCase(identifier))
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        validateUser(user);

        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPassword())) {

            throw new UnauthorizedException("Invalid credentials");
        }

        logger.info("Login successful: {}", user.getEmail());

        return buildAuthResponse(user);
    }

    // =========================================================
    // 🔄 REFRESH TOKEN
    // =========================================================
    public AuthResponse refreshToken(String refreshToken) {

        if (!jwtService.isRefreshToken(refreshToken)) {
            throw new UnauthorizedException("Invalid refresh token");
        }

        String email = jwtService.extractEmail(refreshToken);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found"));

        validateUser(user);

        String accessToken = jwtService.generateAccessToken(
                user.getEmail(),
                user.getRole().name());

        return buildAuthResponse(user, accessToken, refreshToken);
    }

    // =========================================================
    // USER VALIDATION
    // =========================================================
    private void validateUser(User user) {

        if (!user.isEnabled()) {
            throw new ForbiddenException("Account disabled");
        }

        if (!user.isAccountNonLocked()) {
            throw new ForbiddenException("Account locked");
        }
    }

    // =========================================================
    // TOKEN BUILDER
    // =========================================================
    private AuthResponse buildAuthResponse(User user) {

        String accessToken = jwtService.generateAccessToken(
                user.getEmail(),
                user.getRole().name());

        String refreshToken = jwtService.generateRefreshToken(
                user.getEmail());

        return buildAuthResponse(user, accessToken, refreshToken);
    }

    private AuthResponse buildAuthResponse(
            User user,
            String accessToken,
            String refreshToken) {

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

        // optional expiry (if available in jwtService)
        response.setExpiresIn(jwtService.getAccessTokenExpiry());
        response.setIssuedAt(java.time.LocalDateTime.now());

        return response;
    }
}
