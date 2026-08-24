package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import com.yashwanth.ai_exam_system.service.AudioAnalysisService;
import com.yashwanth.ai_exam_system.service.CheatingEvidenceService;
import com.yashwanth.ai_exam_system.service.FaceDetectionService;
import com.yashwanth.ai_exam_system.service.FileStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    private final FileStorageService fileStorageService;
    private final FaceDetectionService faceDetectionService;
    private final AudioAnalysisService audioAnalysisService;
    private final CheatingEvidenceService cheatingEvidenceService;
    private final UserRepository userRepository;

    public FileUploadController(FileStorageService fileStorageService,
                                FaceDetectionService faceDetectionService,
                                AudioAnalysisService audioAnalysisService,
                                CheatingEvidenceService cheatingEvidenceService,
                                UserRepository userRepository) {
        this.fileStorageService = fileStorageService;
        this.faceDetectionService = faceDetectionService;
        this.audioAnalysisService = audioAnalysisService;
        this.cheatingEvidenceService = cheatingEvidenceService;
        this.userRepository = userRepository;
    }

    // 📸 Upload Snapshot + AI + Evidence
    @PostMapping("/snapshot")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> uploadSnapshot(
            @RequestParam MultipartFile file,
            @RequestParam Long studentId,
            @RequestParam Long examId,
            Authentication auth) {

        try {
            validateStudentOwnership(studentId, auth);
            String path = fileStorageService.saveSnapshot(file);
            String aiResult = faceDetectionService.analyzeFace(path);

            // 🔥 Save evidence
            cheatingEvidenceService.saveEvidence(
                    studentId,
                    examId,
                    path,
                    null,
                    null,
                    aiResult
            );

            Map<String, Object> response = new HashMap<>();
            response.put("type", "SNAPSHOT");
            response.put("filePath", path);
            response.put("aiResult", aiResult);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(errorResponse(e));
        }
    }

    // 🎤 Upload Audio + AI + Evidence
    @PostMapping("/audio")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> uploadAudio(
            @RequestParam MultipartFile file,
            @RequestParam Long studentId,
            @RequestParam Long examId,
            Authentication auth) {

        try {
            validateStudentOwnership(studentId, auth);
            String path = fileStorageService.saveAudio(file);
            String aiResult = audioAnalysisService.analyzeAudio(path);

            cheatingEvidenceService.saveEvidence(
                    studentId,
                    examId,
                    null,
                    path,
                    null,
                    aiResult
            );

            Map<String, Object> response = new HashMap<>();
            response.put("type", "AUDIO");
            response.put("filePath", path);
            response.put("aiResult", aiResult);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(errorResponse(e));
        }
    }

    // 📄 Upload Logs + Evidence
    @PostMapping("/log")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> uploadLog(
            @RequestBody String logData,
            @RequestParam Long studentId,
            @RequestParam Long examId,
            Authentication auth) {

        try {
            validateStudentOwnership(studentId, auth);
            String path = fileStorageService.saveLog(logData);

            cheatingEvidenceService.saveEvidence(
                    studentId,
                    examId,
                    null,
                    null,
                    path,
                    "LOG_EVENT"
            );

            Map<String, Object> response = new HashMap<>();
            response.put("type", "LOG");
            response.put("filePath", path);
            response.put("message", "Log stored successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(errorResponse(e));
        }
    }

    // 🔥 Error Handler
    private Map<String, Object> errorResponse(Exception e) {
        Map<String, Object> error = new HashMap<>();
        error.put("status", "ERROR");
        error.put("message", e.getMessage());
        return error;
    }

    private void validateStudentOwnership(Long studentId, Authentication auth) {
        String identifier = auth == null || auth.getName() == null ? "" : auth.getName().trim();
        if (identifier.isBlank()) {
            throw new ForbiddenException("Authentication required");
        }
        User user = userRepository.findByEmailIgnoreCase(identifier).orElse(null);
        if (user == null && identifier.matches("\\d+")) {
            user = userRepository.findById(Long.valueOf(identifier)).orElse(null);
        }
        if (user == null) {
            throw new ResourceNotFoundException("Authenticated student not found");
        }
        if (user.getRole() != Role.STUDENT) {
            throw new ForbiddenException("Only students can upload files");
        }
        if (!studentId.equals(user.getId())) {
            throw new ForbiddenException("You can only upload evidence for your own account");
        }
    }
}