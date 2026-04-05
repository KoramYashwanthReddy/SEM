package com.yashwanth.ai_exam_system.dto;

public class TeacherProfileUpdateRequest {

    private String name;
    private String phone;
    private String department;
    private String designation;
    private Integer experienceYears;
    private String qualification;
    private String employeeId;
    private String profileImage;
    private String email;

    public TeacherProfileUpdateRequest() {}

    public String getName() {
        return trim(name);
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhone() {
        return trim(phone);
    }

    public void setPhone(String phone) {
        this.phone = phone;
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

    public String getProfileImage() {
        return trim(profileImage);
    }

    public void setProfileImage(String profileImage) {
        this.profileImage = profileImage;
    }

    public String getEmail() {
        return trim(email);
    }

    public void setEmail(String email) {
        this.email = email;
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }
}
