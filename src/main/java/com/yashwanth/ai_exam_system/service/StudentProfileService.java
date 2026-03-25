package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.StudentProfileRequest;
import com.yashwanth.ai_exam_system.entity.StudentProfile;
import com.yashwanth.ai_exam_system.repository.StudentProfileRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class StudentProfileService {

    private final StudentProfileRepository repository;

    // ✅ Manual constructor (fixes error)
    public StudentProfileService(StudentProfileRepository repository) {
        this.repository = repository;
    }

    public StudentProfile createProfile(Long userId, StudentProfileRequest request){

        if(repository.existsByUserId(userId)){
            throw new RuntimeException("Profile already exists");
        }

        StudentProfile profile = StudentProfile.builder()
                .userId(userId)
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .gender(request.getGender())
                .dateOfBirth(request.getDateOfBirth())
                .collegeName(request.getCollegeName())
                .department(request.getDepartment())
                .year(request.getYear())
                .rollNumber(request.getRollNumber())
                .section(request.getSection())
                .profilePhoto(request.getProfilePhoto())
                .build();

        return repository.save(profile);
    }

    public StudentProfile updateProfile(Long userId, StudentProfileRequest request){

        StudentProfile profile = repository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        profile.setFullName(request.getFullName());
        profile.setPhone(request.getPhone());
        profile.setGender(request.getGender());
        profile.setDateOfBirth(request.getDateOfBirth());
        profile.setCollegeName(request.getCollegeName());
        profile.setDepartment(request.getDepartment());
        profile.setYear(request.getYear());
        profile.setRollNumber(request.getRollNumber());
        profile.setSection(request.getSection());
        profile.setProfilePhoto(request.getProfilePhoto());

        return repository.save(profile);
    }

    public Optional<StudentProfile> getProfile(Long userId){
        return repository.findByUserId(userId);
    }

    public boolean isProfileCompleted(Long userId){
        return repository.existsByUserId(userId);
    }
}