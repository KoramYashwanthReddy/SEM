package com.yashwanth.ai_exam_system.repository;

import com.yashwanth.ai_exam_system.entity.StudentNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StudentNotificationRepository extends JpaRepository<StudentNotification, Long> {

    List<StudentNotification> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    List<StudentNotification> findByStudentIdAndUnreadTrueOrderByCreatedAtDesc(Long studentId);

    long countByStudentIdAndUnreadTrue(Long studentId);
}
