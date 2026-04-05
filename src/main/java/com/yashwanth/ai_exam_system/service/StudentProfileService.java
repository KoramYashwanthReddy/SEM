package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.StudentProfileRequest;
import com.yashwanth.ai_exam_system.entity.StudentProfile;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.repository.StudentProfileRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class StudentProfileService {

    private final StudentProfileRepository repository;
    private final UserRepository userRepository;

    public StudentProfileService(StudentProfileRepository repository,
                                 UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    public StudentProfile createProfile(Long userId, StudentProfileRequest request){

        if(repository.existsByUserId(userId)){
            throw new RuntimeException("Profile already exists");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        StudentProfile profile = new StudentProfile();
        profile.setUserId(userId);
        profile.setFullName(request.getFullName());
        profile.setEmail(user.getEmail());
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

    public StudentProfile updateProfile(Long userId, StudentProfileRequest request){

        StudentProfile profile = repository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        profile.setFullName(request.getFullName());
        profile.setEmail(user.getEmail());
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
        return repository.findByUserId(userId)
                .map(StudentProfile::isProfileCompleted)
                .orElse(false);
    }
}
