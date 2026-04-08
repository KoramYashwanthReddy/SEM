package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.StudentProfileRequest;
import com.yashwanth.ai_exam_system.entity.StudentProfile;
import com.yashwanth.ai_exam_system.service.StudentProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/student/profile")
@PreAuthorize("hasRole('STUDENT')")
public class StudentProfileController {

    private final StudentProfileService service;

    public StudentProfileController(StudentProfileService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<StudentProfile> createProfile(
            Authentication auth,
            @Valid @RequestBody StudentProfileRequest request){

        return ResponseEntity.ok(service.saveProfile(auth.getName(), request));
    }

    @PutMapping
    public ResponseEntity<StudentProfile> updateProfile(
            Authentication auth,
            @Valid @RequestBody StudentProfileRequest request){

        return ResponseEntity.ok(service.saveProfile(auth.getName(), request));
    }

    @GetMapping
    public ResponseEntity<StudentProfile> getProfile(
            Authentication auth){

        return ResponseEntity.ok(service.getOrCreateBlankProfile(auth.getName()));
    }

    @GetMapping("/completed")
    public ResponseEntity<Boolean> isProfileCompleted(
            Authentication auth){

        return ResponseEntity.ok(service.isProfileCompleted(auth.getName()));
    }

    @GetMapping("/roll-number-exists")
    public ResponseEntity<Map<String, Object>> checkRollNumberExists(
            Authentication auth,
            @RequestParam("value") String value) {

        boolean exists = service.isRollNumberTaken(auth.getName(), value);
        Map<String, Object> response = new HashMap<>();
        response.put("exists", exists);
        response.put("value", value);
        response.put("message", exists ? "ID already exists" : "ID available");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/phone-exists")
    public ResponseEntity<Map<String, Object>> checkPhoneExists(
            Authentication auth,
            @RequestParam("value") String value) {

        boolean exists = service.isPhoneTaken(auth.getName(), value);
        Map<String, Object> response = new HashMap<>();
        response.put("exists", exists);
        response.put("value", value);
        response.put("message", exists ? "Mobile number already exists" : "Mobile number available");
        return ResponseEntity.ok(response);
    }
}
