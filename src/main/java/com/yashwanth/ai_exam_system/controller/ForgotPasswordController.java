package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.ForgotPasswordRequest;
import com.yashwanth.ai_exam_system.dto.ResetPasswordRequest;
import com.yashwanth.ai_exam_system.service.ForgotPasswordService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class ForgotPasswordController {

    private static final Logger log =
            LoggerFactory.getLogger(ForgotPasswordController.class);

    private final ForgotPasswordService forgotPasswordService;

    public ForgotPasswordController(
            ForgotPasswordService forgotPasswordService
    ) {
        this.forgotPasswordService = forgotPasswordService;
    }

    /*
     * ================================
     * FORGOT PASSWORD
     * ================================
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {

        log.info("Forgot password request for {}", request.getEmail());

        forgotPasswordService.sendResetLink(request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Reset link sent to email");

        return ResponseEntity.ok(response);
    }

    /*
     * ================================
     * RESET PASSWORD
     * ================================
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request
    ) {

        log.info("Reset password attempt with token");

        forgotPasswordService.resetPassword(request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Password updated successfully");

        return ResponseEntity.ok(response);
    }
}