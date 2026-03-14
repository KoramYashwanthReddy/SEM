package com.yashwanth.ai_exam_system.controller;

import org.springframework.web.bind.annotation.*;

import com.yashwanth.ai_exam_system.dto.*;
import com.yashwanth.ai_exam_system.service.AuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@RequestBody RegisterRequest request) {

        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request) {

        return authService.login(request);
    }
}