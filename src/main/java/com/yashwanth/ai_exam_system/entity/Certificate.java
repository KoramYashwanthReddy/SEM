package com.yashwanth.ai_exam_system.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "certificates")
public class Certificate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String certificateId; // UNIQUE CERTIFICATE NUMBER

    // Student Info (Auto-filled snapshot)
    private Long studentId;

    private String studentName;

    private String collegeName;

    private String department;

    private String rollNumber;

    private String section;

    private String profilePhoto; // URL or base64

    // Exam Info
    private String examCode;

    private String examTitle;

    private double score;

    private String grade;

    // Security & Verification
    @Column(length = 2000)
    private String qrCodeData;

    // Metadata
    private LocalDateTime issuedAt;

    private String certificateUrl;

    private boolean revoked = false; // for invalid certificates

    // ---------------- GETTERS & SETTERS ----------------

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCertificateId() { return certificateId; }
    public void setCertificateId(String certificateId) { this.certificateId = certificateId; }

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getCollegeName() { return collegeName; }
    public void setCollegeName(String collegeName) { this.collegeName = collegeName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getRollNumber() { return rollNumber; }
    public void setRollNumber(String rollNumber) { this.rollNumber = rollNumber; }

    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }

    public String getProfilePhoto() { return profilePhoto; }
    public void setProfilePhoto(String profilePhoto) { this.profilePhoto = profilePhoto; }

    public String getExamCode() { return examCode; }
    public void setExamCode(String examCode) { this.examCode = examCode; }

    public String getExamTitle() { return examTitle; }
    public void setExamTitle(String examTitle) { this.examTitle = examTitle; }

    public double getScore() { return score; }
    public void setScore(double score) { this.score = score; }

    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }

    public String getQrCodeData() { return qrCodeData; }
    public void setQrCodeData(String qrCodeData) { this.qrCodeData = qrCodeData; }

    public LocalDateTime getIssuedAt() { return issuedAt; }
    public void setIssuedAt(LocalDateTime issuedAt) { this.issuedAt = issuedAt; }

    public String getCertificateUrl() { return certificateUrl; }
    public void setCertificateUrl(String certificateUrl) { this.certificateUrl = certificateUrl; }

    public boolean isRevoked() { return revoked; }
    public void setRevoked(boolean revoked) { this.revoked = revoked; }
}