package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.StudentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentProfileRepository extends JpaRepository<StudentProfile, Long> {

    // 🔹 PRIMARY (used in Certificate auto-fill)
    Optional<StudentProfile> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    // 🔹 Optional: fetch all students in a college
    List<StudentProfile> findByCollegeName(String collegeName);

    // 🔹 Optional: fetch by department
    List<StudentProfile> findByDepartment(String department);

    // 🔹 Optional: fetch by college + department
    List<StudentProfile> findByCollegeNameAndDepartment(String collegeName, String department);

    // 🔹 Optional: unique roll number validation
    Optional<StudentProfile> findByRollNumber(String rollNumber);

    Optional<StudentProfile> findByPhone(String phone);

    boolean existsByRollNumber(String rollNumber);

    // 🔹 Optional: search by name (for admin panel)
    List<StudentProfile> findByFullNameContainingIgnoreCase(String fullName);
}
