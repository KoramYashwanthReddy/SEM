package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.*;
import com.yashwanth.ai_exam_system.service.AuthService;
import com.yashwanth.ai_exam_system.service.SignupVerificationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<ApiResponse<Map<String, Object>>> register(
            @Valid @RequestBody RegisterRequest request) {

        Map<String, Object> data = signupVerificationService.startSignup(request);
        return ResponseEntity.ok(ApiResponse.success("Signup started. Verify OTP to activate student account", data));
    }

    @PostMapping("/signup/start")
    public ResponseEntity<ApiResponse<Map<String, Object>>> startSignup(
            @Valid @RequestBody RegisterRequest request) {

        Map<String, Object> response = signupVerificationService.startSignup(request);
        return ResponseEntity.ok(ApiResponse.success("Signup started", response));
    }

    @PostMapping("/signup/verify")
    public ResponseEntity<ApiResponse<AuthResponse>> verifySignup(
            @Valid @RequestBody SignupOtpVerifyRequest request) {

        AuthResponse response = signupVerificationService.verifySignupOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP Verified successfully", response));
    }

    @PostMapping("/signup/resend")
    public ResponseEntity<ApiResponse<Map<String, Object>>> resendSignupOtp(
            @Valid @RequestBody SignupOtpResendRequest request) {

        Map<String, Object> response = signupVerificationService.resendSignupOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP Resent successfully", response));
    }

    @GetMapping("/signup/email-exists")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkSignupEmailExists(
            @RequestParam("value") String value) {
        Map<String, Object> response = signupVerificationService.checkSignupEmailExists(value);
        return ResponseEntity.ok(ApiResponse.success("Email status checked", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {

        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {

        AuthResponse response = authService.refreshToken(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", response));
    }
}

