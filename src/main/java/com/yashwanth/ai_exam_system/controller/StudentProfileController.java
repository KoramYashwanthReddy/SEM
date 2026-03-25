package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.StudentProfileRequest;
import com.yashwanth.ai_exam_system.entity.StudentProfile;
import com.yashwanth.ai_exam_system.service.StudentProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/student/profile")
public class StudentProfileController {

    private final StudentProfileService service;

    public StudentProfileController(StudentProfileService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<StudentProfile> createProfile(
            @AuthenticationPrincipal(expression = "id") Long userId,
            @RequestBody StudentProfileRequest request){

        return ResponseEntity.ok(service.createProfile(userId, request));
    }

    @PutMapping
    public ResponseEntity<StudentProfile> updateProfile(
            @AuthenticationPrincipal(expression = "id") Long userId,
            @RequestBody StudentProfileRequest request){

        return ResponseEntity.ok(service.updateProfile(userId, request));
    }

    @GetMapping
    public ResponseEntity<StudentProfile> getProfile(
            @AuthenticationPrincipal(expression = "id") Long userId){

        return ResponseEntity.ok(
                service.getProfile(userId)
                        .orElseThrow(() -> new RuntimeException("Profile not found"))
        );
    }

    @GetMapping("/completed")
    public ResponseEntity<Boolean> isProfileCompleted(
            @AuthenticationPrincipal(expression = "id") Long userId){

        return ResponseEntity.ok(service.isProfileCompleted(userId));
    }
}