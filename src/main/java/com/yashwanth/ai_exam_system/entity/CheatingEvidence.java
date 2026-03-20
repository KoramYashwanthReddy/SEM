package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class CheatingEvidence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long studentId;
    private Long examId;

    private String snapshotPath;
    private String audioPath;
    private String logPath;

    private String aiReason; // MULTIPLE_FACES / HIGH_NOISE etc

    private LocalDateTime timestamp;

    private boolean examCancelled;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public Long getStudentId() {
		return studentId;
	}

	public void setStudentId(Long studentId) {
		this.studentId = studentId;
	}

	public Long getExamId() {
		return examId;
	}

	public void setExamId(Long examId) {
		this.examId = examId;
	}

	public String getSnapshotPath() {
		return snapshotPath;
	}

	public void setSnapshotPath(String snapshotPath) {
		this.snapshotPath = snapshotPath;
	}

	public String getAudioPath() {
		return audioPath;
	}

	public void setAudioPath(String audioPath) {
		this.audioPath = audioPath;
	}

	public String getLogPath() {
		return logPath;
	}

	public void setLogPath(String logPath) {
		this.logPath = logPath;
	}

	public String getAiReason() {
		return aiReason;
	}

	public void setAiReason(String aiReason) {
		this.aiReason = aiReason;
	}

	public LocalDateTime getTimestamp() {
		return timestamp;
	}

	public void setTimestamp(LocalDateTime timestamp) {
		this.timestamp = timestamp;
	}

	public boolean isExamCancelled() {
		return examCancelled;
	}

	public void setExamCancelled(boolean examCancelled) {
		this.examCancelled = examCancelled;
	}

    // Getters & Setters
}