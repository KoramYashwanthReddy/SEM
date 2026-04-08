package com.yashwanth.ai_exam_system.service;

import com.yashwanth.ai_exam_system.dto.StudentProfileRequest;
import com.yashwanth.ai_exam_system.entity.Role;
import com.yashwanth.ai_exam_system.entity.StudentProfile;
import com.yashwanth.ai_exam_system.entity.User;
import com.yashwanth.ai_exam_system.exception.ForbiddenException;
import com.yashwanth.ai_exam_system.exception.ConflictException;
import com.yashwanth.ai_exam_system.exception.ResourceNotFoundException;
import com.yashwanth.ai_exam_system.exception.ValidationException;
import com.yashwanth.ai_exam_system.repository.StudentProfileRepository;
import com.yashwanth.ai_exam_system.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
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

    @Transactional
    public StudentProfile saveProfile(String email, StudentProfileRequest request){
        User user = getVerifiedStudentByIdentifier(email);
        String rollNumber = request.getRollNumber() == null ? "" : request.getRollNumber().trim();
        String fullName = request.getFullName() == null ? "" : request.getFullName().trim();
        String collegeName = request.getCollegeName() == null ? "" : request.getCollegeName().trim();
        String department = request.getDepartment() == null ? "" : request.getDepartment().trim();
        String section = request.getSection() == null ? "" : request.getSection().trim();
        String year = request.getYear() == null ? "" : request.getYear().trim();
        String phone = request.getPhone() == null ? "" : request.getPhone().trim();
        String gender = request.getGender() == null ? "" : request.getGender().trim();

        if (fullName.isBlank()) {
            fullName = user.getName() == null ? "" : user.getName().trim();
        }
        if (fullName.isBlank()) {
            throw new ValidationException("Full name is required");
        }
        if (collegeName.isBlank()) {
            throw new ValidationException("College name is required");
        }
        if (department.isBlank()) {
            throw new ValidationException("Department is required");
        }
        if (rollNumber.isBlank()) {
            throw new ValidationException("Roll number is required");
        }
        if (!phone.isBlank()) {
            repository.findByPhone(phone).ifPresent(existing -> {
                if (!existing.getUserId().equals(user.getId())) {
                    throw new ConflictException("Mobile number already exists for another student");
                }
            });
        }

        repository.findByRollNumber(rollNumber).ifPresent(existing -> {
            if (!existing.getUserId().equals(user.getId())) {
                throw new ConflictException("Roll number already exists for another student");
            }
        });

        if (request.getEmail() != null
                && !request.getEmail().isBlank()
                && !user.getEmail().equalsIgnoreCase(request.getEmail())) {
            throw new ValidationException("Profile email must match the verified signed-in account");
        }

        StudentProfile profile = repository.findByUserId(user.getId())
                .orElseGet(StudentProfile::new);
        profile.setUserId(user.getId());
        profile.setFullName(fullName);
        profile.setEmail(user.getEmail());
        profile.setPhone(phone.isBlank() ? null : phone);
        profile.setGender(gender.isBlank() ? null : gender);
        profile.setDateOfBirth(parseDateOfBirth(request.getDateOfBirth()));
        profile.setCollegeName(collegeName);
        profile.setDepartment(department);
        profile.setYear(year.isBlank() ? null : year);
        profile.setRollNumber(rollNumber);
        profile.setSection(section.isBlank() ? null : section);
        profile.setProfilePhoto(request.getProfilePhoto());

        try {
            return repository.saveAndFlush(profile);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("Unable to save student profile due to duplicate or invalid data");
        }
    }

    public StudentProfile getOrCreateBlankProfile(String email) {
        User user = getVerifiedStudentByIdentifier(email);
        return repository.findByUserId(user.getId()).orElseGet(() -> {
            StudentProfile profile = new StudentProfile();
            profile.setUserId(user.getId());
            profile.setEmail(user.getEmail());
            return profile;
        });
    }

    public Optional<StudentProfile> getProfile(String email){
        User user = getVerifiedStudentByIdentifier(email);
        return repository.findByUserId(user.getId());
    }

    public boolean isRollNumberTaken(String identifier, String rollNumber) {
        User user = getVerifiedStudentByIdentifier(identifier);
        String candidate = rollNumber == null ? "" : rollNumber.trim();
        if (candidate.isBlank()) return false;

        return repository.findByRollNumber(candidate)
                .map(existing -> !existing.getUserId().equals(user.getId()))
                .orElse(false);
    }

    public boolean isProfileCompleted(String email){
        return getProfile(email)
                .map(StudentProfile::isProfileCompleted)
                .orElse(false);
    }

    public boolean isPhoneTaken(String identifier, String phone) {
        User user = getVerifiedStudentByIdentifier(identifier);
        String candidate = phone == null ? "" : phone.trim();
        if (candidate.isBlank()) return false;

        return repository.findByPhone(candidate)
                .map(existing -> !existing.getUserId().equals(user.getId()))
                .orElse(false);
    }

    private LocalDate parseDateOfBirth(String rawValue) {
        String value = rawValue == null ? "" : rawValue.trim();
        if (value.isBlank()) {
            return null;
        }

        List<DateTimeFormatter> formatters = List.of(
                DateTimeFormatter.ISO_LOCAL_DATE,
                DateTimeFormatter.ofPattern("dd-MM-yyyy"),
                DateTimeFormatter.ofPattern("dd/MM/yyyy")
        );

        for (DateTimeFormatter formatter : formatters) {
            try {
                return LocalDate.parse(value, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }

        throw new ValidationException("Date of birth format is invalid. Use yyyy-MM-dd");
    }

    private User getVerifiedStudentByIdentifier(String identifier) {
        String value = identifier == null ? "" : identifier.trim();
        if (value.isBlank()) {
            throw new ResourceNotFoundException("Verified user not found");
        }

        User user = userRepository.findByEmailIgnoreCase(value).orElse(null);
        if (user == null && value.matches("\\d+")) {
            user = userRepository.findById(Long.parseLong(value)).orElse(null);
        }
        if (user == null) {
            throw new ResourceNotFoundException("Verified user not found");
        }

        if (user.getRole() != Role.STUDENT) {
            throw new ForbiddenException("Only verified students can access student profile");
        }

        if (!user.isEnabled() || !user.isAccountNonLocked()) {
            throw new ForbiddenException("Please verify your account before accessing student profile");
        }

        return user;
    }
}
