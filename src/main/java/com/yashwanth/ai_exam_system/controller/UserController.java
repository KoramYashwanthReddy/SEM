package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.dto.ChangePasswordRequest;
import com.yashwanth.ai_exam_system.dto.TeacherProfileUpdateRequest;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.exception.ValidationException;
import com.yashwanth.ai_exam_system.repository.UserRepository;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(
            org.springframework.security.core.Authentication auth) {

        User user = getCurrentUser(auth.getName());
        return ResponseEntity.ok(profileMap(user));
    }

    @PutMapping("/update")
    public ResponseEntity<Map<String, Object>> update(
            org.springframework.security.core.Authentication auth,
            @RequestBody TeacherProfileUpdateRequest request) {

        User user = getCurrentUser(auth.getName());

        if (request.getEmail() != null && !request.getEmail().isBlank()
                && !user.getEmail().equalsIgnoreCase(request.getEmail())) {
            throw new ValidationException("Email cannot be changed from the profile screen");
        }

        if (request.getName() != null) user.setName(request.getName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getDepartment() != null) user.setDepartment(request.getDepartment());
        if (request.getDesignation() != null) user.setDesignation(request.getDesignation());
        if (request.getExperienceYears() != null) user.setExperienceYears(request.getExperienceYears());
        if (request.getQualification() != null) user.setQualification(request.getQualification());
        if (request.getEmployeeId() != null) user.setEmployeeId(request.getEmployeeId());
        if (request.getProfileImage() != null && !request.getProfileImage().isBlank()) {
            user.setProfileImage(request.getProfileImage());
        }

        userRepository.save(user);
        return ResponseEntity.ok(profileMap(user));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(
            org.springframework.security.core.Authentication auth,
            @RequestBody ChangePasswordRequest request) {

        User user = getCurrentUser(auth.getName());

        if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
            throw new ValidationException("Current password is required");
        }
        if (request.getNewPassword() == null || request.getNewPassword().length() < 8) {
            throw new ValidationException("New password must be at least 8 characters");
        }
        if (request.getConfirmPassword() == null
                || !request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new ValidationException("Passwords do not match");
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new ValidationException("Current password is invalid");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "Password changed successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/profile-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadProfileImage(
            org.springframework.security.core.Authentication auth,
            @RequestParam("file") MultipartFile file) throws Exception {

        if (file.isEmpty()) {
            throw new ValidationException("File is empty");
        }

        User user = getCurrentUser(auth.getName());
        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = "image/png";
        }

        String base64 = Base64.getEncoder().encodeToString(file.getBytes());
        String dataUrl = "data:" + contentType + ";base64," + base64;
        user.setProfileImage(dataUrl);
        userRepository.save(user);

        Map<String, Object> response = profileMap(user);
        response.put("profileImage", dataUrl);
        response.put("url", dataUrl);
        response.put("imageUrl", dataUrl);
        return ResponseEntity.ok(response);
    }

    private User getCurrentUser(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!user.isEnabled() || !user.isAccountNonLocked()) {
            throw new ForbiddenException("Account is not verified or is locked");
        }
        return user;
    }

    private Map<String, Object> profileMap(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("name", user.getName());
        map.put("email", user.getEmail());
        map.put("phone", user.getPhone());
        map.put("department", user.getDepartment());
        map.put("designation", user.getDesignation());
        map.put("experienceYears", user.getExperienceYears());
        map.put("qualification", user.getQualification());
        map.put("employeeId", user.getEmployeeId());
        map.put("profileImage", user.getProfileImage());
        map.put("enabled", user.isEnabled());
        map.put("verified", user.isEnabled());
        map.put("accountNonLocked", user.isAccountNonLocked());
        map.put("createdAt", user.getCreatedAt());
        map.put("updatedAt", user.getUpdatedAt());
        return map;
    }
}
