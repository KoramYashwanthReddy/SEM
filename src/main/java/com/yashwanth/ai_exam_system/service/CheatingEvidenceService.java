package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.entity.CheatingEvidence;
import com.yashwanth.ai_exam_system.repository.CheatingEvidenceRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class CheatingEvidenceService {

    private final CheatingEvidenceRepository repository;
    private final ExamService examService;

    public CheatingEvidenceService(CheatingEvidenceRepository repository,
                                    ExamService examService) {
        this.repository = repository;
        this.examService = examService;
    }

    public void saveEvidence(Long studentId,
                             Long examId,
                             String snapshot,
                             String audio,
                             String log,
                             String aiReason) {

        CheatingEvidence evidence = new CheatingEvidence();
        evidence.setStudentId(studentId);
        evidence.setExamId(examId);
        evidence.setSnapshotPath(snapshot);
        evidence.setAudioPath(audio);
        evidence.setLogPath(log);
        evidence.setAiReason(aiReason);
        evidence.setTimestamp(LocalDateTime.now());

        // 🚨 Cancel exam if serious cheating
        if (isSevere(aiReason)) {
            evidence.setExamCancelled(true);
            examService.cancelExam(examId, studentId, aiReason);
        }

        repository.save(evidence);
    }

    private boolean isSevere(String reason) {
        return reason.equals("MULTIPLE_FACES_DETECTED")
                || reason.equals("NO_FACE_DETECTED")
                || reason.equals("HIGH_NOISE_DETECTED");
    }
}