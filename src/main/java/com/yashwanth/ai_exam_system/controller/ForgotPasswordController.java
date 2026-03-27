package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.service.ForgotPasswordService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<?> forgotPassword(@RequestParam String email) {

        log.info("Forgot password request for {}", email);

        forgotPasswordService.sendResetLink(email);

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "Reset link sent to email"
                )
        );
    }

    /*
     * ================================
     * RESET PASSWORD
     * ================================
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
            @RequestParam String token,
            @RequestParam String newPassword
    ) {

        forgotPasswordService.resetPassword(token, newPassword);

        return ResponseEntity.ok(
                Map.of(
                        "success", true,
                        "message", "Password updated successfully"
                )
        );
    }
}