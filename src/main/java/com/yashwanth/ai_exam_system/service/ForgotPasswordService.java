package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.ForgotPasswordRequest;
import com.yashwanth.ai_exam_system.dto.ResetPasswordRequest;
import com.yashwanth.ai_exam_system.entity.PasswordResetToken;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.repository.PasswordResetTokenRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class ForgotPasswordService {

    private static final Logger log =
            LoggerFactory.getLogger(ForgotPasswordService.class);

    private static final int TOKEN_EXPIRY_MINUTES = 15;

    @Value("${app.frontend.reset-url:http://localhost:8080/reset-password}")
    private String resetBaseUrl;

    private final PasswordResetTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    public ForgotPasswordService(
            PasswordResetTokenRepository tokenRepository,
            UserRepository userRepository,
            EmailService emailService,
            PasswordEncoder passwordEncoder
    ) {
        this.tokenRepository = tokenRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    /*
     * ================================
     * SEND RESET LINK
     * ================================
     */
    public void sendResetLink(ForgotPasswordRequest request) {

        String email = request.getEmail();

        log.info("Password reset requested for {}", email);

        if (email == null || email.isBlank()) {
            throw new RuntimeException("Email is required");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Remove old token
        tokenRepository.findByEmail(email)
                .ifPresent(tokenRepository::delete);

        String token = UUID.randomUUID().toString();

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setEmail(email);
        resetToken.setToken(token);
        resetToken.setExpiryTime(
                LocalDateTime.now().plusMinutes(TOKEN_EXPIRY_MINUTES)
        );

        tokenRepository.save(resetToken);

        String resetLink = resetBaseUrl + "?token=" + token;

        emailService.sendPasswordResetEmail(email, resetLink);

        log.info("Reset link sent to {}", email);
    }

    /*
     * ================================
     * RESET PASSWORD
     * ================================
     */
    public void resetPassword(ResetPasswordRequest request) {

        String token = request.getToken();
        String newPassword = request.getNewPassword();

        if (token == null || token.isBlank()) {
            throw new RuntimeException("Token is required");
        }

        if (newPassword == null || newPassword.length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters");
        }

        PasswordResetToken resetToken =
                tokenRepository.findByToken(token)
                        .orElseThrow(() -> new RuntimeException("Invalid token"));

        if (resetToken.getExpiryTime().isBefore(LocalDateTime.now())) {
            tokenRepository.delete(resetToken);
            throw new RuntimeException("Token expired");
        }

        User user = userRepository.findByEmail(resetToken.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        tokenRepository.delete(resetToken);

        log.info("Password reset successful for {}", user.getEmail());
    }
}
