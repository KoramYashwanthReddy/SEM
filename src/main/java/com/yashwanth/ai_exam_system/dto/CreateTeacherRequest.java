package com.yashwanth.ai_exam_system.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class CreateTeacherRequest {

    @NotBlank(message = "Full name is required")
    @Size(min = 3, max = 100, message = "Full name must be between 3 and 100 characters")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 120)
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be at least 6 characters")
    private String password;

    @Pattern(regexp = "^$|^[0-9]{10}$", message = "Phone must be 10 digits")
    private String phone;

    private String profileImage;

    @Size(max = 100)
    private String department;

    @Size(max = 100)
    private String designation;

    private Integer experienceYears;

    @Size(max = 150)
    private String qualification;

    @Size(max = 50)
    private String employeeId;

    public CreateTeacherRequest() {
    }

    public String getFullName() {
        return trim(fullName);
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return trim(email);
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getPhone() {
        return trim(phone);
    }

    public void setPhone(String phone) {
        this.phone = (phone == null || phone.trim().isEmpty()) ? null : phone.trim();
    }

    public String getProfileImage() {
        return trim(profileImage);
    }

    public void setProfileImage(String profileImage) {
        this.profileImage = profileImage;
    }

    public String getDepartment() {
        return trim(department);
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getDesignation() {
        return trim(designation);
    }

    public void setDesignation(String designation) {
        this.designation = designation;
    }

    public Integer getExperienceYears() {
        return experienceYears;
    }

    public void setExperienceYears(Integer experienceYears) {
        this.experienceYears = experienceYears;
    }

    public String getQualification() {
        return trim(qualification);
    }

    public void setQualification(String qualification) {
        this.qualification = qualification;
    }

    public String getEmployeeId() {
        return trim(employeeId);
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }
}
