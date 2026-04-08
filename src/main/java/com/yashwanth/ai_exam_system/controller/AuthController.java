package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.AuthResponse;
import com.yashwanth.ai_exam_system.dto.LoginRequest;
import com.yashwanth.ai_exam_system.dto.RefreshTokenRequest;
import com.yashwanth.ai_exam_system.dto.RegisterRequest;
import com.yashwanth.ai_exam_system.dto.SignupOtpResendRequest;
import com.yashwanth.ai_exam_system.dto.SignupOtpVerifyRequest;
import com.yashwanth.ai_exam_system.service.AuthService;
import com.yashwanth.ai_exam_system.service.SignupVerificationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final SignupVerificationService signupVerificationService;

    public AuthController(AuthService authService, SignupVerificationService signupVerificationService) {
        this.authService = authService;
        this.signupVerificationService = signupVerificationService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(
            @Valid @RequestBody RegisterRequest request) {

        Map<String, Object> data = signupVerificationService.startSignup(request);
        return success("Signup started. Verify OTP to activate student account", data);
    }

    @PostMapping("/signup/start")
    public ResponseEntity<Map<String, Object>> startSignup(
            @Valid @RequestBody RegisterRequest request) {

        Map<String, Object> response = signupVerificationService.startSignup(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/signup/verify")
    public ResponseEntity<AuthResponse> verifySignup(
            @Valid @RequestBody SignupOtpVerifyRequest request) {

        AuthResponse response = signupVerificationService.verifySignupOtp(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/signup/resend")
    public ResponseEntity<Map<String, Object>> resendSignupOtp(
            @Valid @RequestBody SignupOtpResendRequest request) {

        Map<String, Object> response = signupVerificationService.resendSignupOtp(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/signup/email-exists")
    public ResponseEntity<Map<String, Object>> checkSignupEmailExists(
            @RequestParam("value") String value) {
        return ResponseEntity.ok(signupVerificationService.checkSignupEmailExists(value));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request) {

        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {

        AuthResponse response = authService.refreshToken(request.getRefreshToken());
        return success("Token refreshed successfully", response);
    }

    private ResponseEntity<Map<String, Object>> success(
            String message,
            Object data) {

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", message);
        response.put("data", data);

        return ResponseEntity.ok(response);
    }
}
