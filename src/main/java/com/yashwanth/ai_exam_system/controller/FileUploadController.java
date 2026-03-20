package com.yashwanth.ai_exam_system.controller;

import com.yashwanth.ai_exam_system.service.AudioAnalysisService;
import com.yashwanth.ai_exam_system.service.CheatingEvidenceService;
import com.yashwanth.ai_exam_system.service.FaceDetectionService;
import com.yashwanth.ai_exam_system.service.FileStorageService;
import org.springframework.http.ResponseEntity;
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

    public FileUploadController(FileStorageService fileStorageService,
                                FaceDetectionService faceDetectionService,
                                AudioAnalysisService audioAnalysisService,
                                CheatingEvidenceService cheatingEvidenceService) {
        this.fileStorageService = fileStorageService;
        this.faceDetectionService = faceDetectionService;
        this.audioAnalysisService = audioAnalysisService;
        this.cheatingEvidenceService = cheatingEvidenceService;
    }

    // 📸 Upload Snapshot + AI + Evidence
    @PostMapping("/snapshot")
    public ResponseEntity<?> uploadSnapshot(
            @RequestParam MultipartFile file,
            @RequestParam Long studentId,
            @RequestParam Long examId) {

        try {
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
    public ResponseEntity<?> uploadAudio(
            @RequestParam MultipartFile file,
            @RequestParam Long studentId,
            @RequestParam Long examId) {

        try {
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
    public ResponseEntity<?> uploadLog(
            @RequestBody String logData,
            @RequestParam Long studentId,
            @RequestParam Long examId) {

        try {
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
}