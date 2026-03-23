package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.*;
import com.yashwanth.ai_exam_system.service.AuthService;

import jakarta.validation.Valid;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger =
            LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // =========================================================
    // 🧑‍🎓 REGISTER (STUDENT ONLY)
    // =========================================================
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(
            @Valid @RequestBody RegisterRequest request) {

        try {

            logger.info("Registration attempt for {}", request.getEmail());

            AuthResponse response = authService.register(request);

            return success("Student registered successfully", response);

        } catch (Exception ex) {

            logger.error("Registration failed for {}", request.getEmail(), ex);

            return error("Registration failed: " + ex.getMessage());
        }
    }

    // =========================================================
    // 🔐 LOGIN
    // =========================================================
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @Valid @RequestBody LoginRequest request) {

        try {

            logger.info("Login attempt for {}", request.getEmail());

            AuthResponse response = authService.login(request);

            return success("Login successful", response);

        } catch (Exception ex) {

            logger.error("Login failed for {}", request.getEmail(), ex);

            return error("Login failed: " + ex.getMessage());
        }
    }

    // =========================================================
    // 🔄 REFRESH TOKEN
    // =========================================================
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {

        try {

            AuthResponse response =
                    authService.refreshToken(request.getRefreshToken());

            return success("Token refreshed successfully", response);

        } catch (Exception ex) {

            logger.error("Token refresh failed", ex);

            return error("Token refresh failed: " + ex.getMessage());
        }
    }

    // =========================================================
    // ✅ SUCCESS RESPONSE
    // =========================================================
    private ResponseEntity<Map<String, Object>> success(
            String message,
            Object data) {

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", message);
        response.put("data", data);

        return ResponseEntity.ok(response);
    }

    // =========================================================
    // ❌ ERROR RESPONSE
    // =========================================================
    private ResponseEntity<Map<String, Object>> error(String message) {

        Map<String, Object> response = new HashMap<>();
        response.put("status", "ERROR");
        response.put("message", message);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }
}