package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.service.ForgotPasswordService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class ForgotPasswordController {

    private final ForgotPasswordService forgotPasswordService;

    @PostMapping("/forgot-password")
    public String forgotPassword(@RequestParam String email) {
        forgotPasswordService.sendResetLink(email);
        return "Reset link sent to email";
    }

    @PostMapping("/reset-password")
    public String resetPassword(
            @RequestParam String token,
            @RequestParam String newPassword
    ) {
        forgotPasswordService.resetPassword(token, newPassword);
        return "Password updated successfully";
    }
}